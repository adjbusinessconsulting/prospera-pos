import { supabase } from "./supabase";
import { useStore } from "../store";
import { flushAuditServer } from "./auditlog";

// Offline-first sale sync: sales are queued locally and replayed to Supabase when
// online. Writes are idempotent (client-generated ids) so retries never duplicate.

const KEY = "sterith_pending_sales_v1";

export interface PendingItem {
  id: string;            // client uuid → sale_items.id (idempotent upsert)
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
  subtotal: number;
}
export interface PendingSale {
  id: string;            // client uuid → sales.id
  store_id: string;
  trx_id: string;
  cashier_id: string;
  cashier_name: string;
  shift: number | null;
  total: number;
  payment_method: string;
  cash_received: number | null;
  change_amount: number | null;
  customer_name?: string | null;   // name tagged to the order (receipt + Riwayat)
  created_at: string;    // real sale time (ISO) — preserved even if synced later
  items: PendingItem[];
  stock: { id: string; qty: number }[]; // stock deltas to apply on first sync
  stockApplied?: string[];   // product ids whose stock delta is already applied (idempotent retry)
  attempts?: number;         // failed sync attempts (poison-message guard)
  failed?: boolean;          // gave up after MAX_ATTEMPTS — skipped so it can't block the queue
}

const MAX_ATTEMPTS = 5;

function read(): PendingSale[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: PendingSale[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
// Merge a patch into one queued sale (progress tracking: stockApplied / attempts).
function updateSale(id: string, patch: Partial<PendingSale>) {
  const list = read();
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) { list[i] = { ...list[i], ...patch }; write(list); }
}
export function pendingCount(): number { return read().length; }
// Sales that gave up after MAX_ATTEMPTS (kept, skipped). Surfaced so the UI can warn.
export function failedCount(): number { return read().filter((s) => s.failed).length; }
// Clear the failed flag so the next flush re-attempts them (e.g. after fixing the cause).
export function retryFailed(): void {
  write(read().map((s) => s.failed ? { ...s, failed: false, attempts: 0 } : s));
  pushStatus();
}
// Distinct store ids sitting in the queue — used to detect sales orphaned from a
// different store/account (they can never satisfy the current owner's RLS).
export function pendingStoreIds(): string[] { return [...new Set(read().map((s) => s.store_id))]; }
// Discard the queued sales (e.g. orphaned ones that can never sync). Local-only data.
export function clearQueue(): void { write([]); pushStatus(); }
// Drop only sales that belong to a different store (orphaned), keep this store's. Returns how many were dropped.
export function clearOrphaned(currentStoreId: string): number {
  const list = read();
  const kept = list.filter((s) => s.store_id === currentStoreId);
  write(kept); pushStatus();
  return list.length - kept.length;
}

function pushStatus(extra?: { synced?: boolean }) {
  const patch: { pendingSyncCount: number; lastSyncedAt?: string } = { pendingSyncCount: read().length };
  if (extra?.synced) patch.lastSyncedAt = new Date().toISOString();
  useStore.getState().setSyncStatus(patch);
}

export function enqueueSale(sale: PendingSale) {
  const list = read(); list.push(sale); write(list);
  pushStatus();
}

let flushing = false;
let lastSyncError = "";
export function getLastSyncError(): string { return lastSyncError; }

export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (flushing || !navigator.onLine) return { synced: 0, remaining: read().length };
  flushing = true;
  let synced = 0;
  try {
    for (const sale of [...read()]) {
      if (sale.failed) continue;   // gave up earlier — skip so it never blocks newer sales
      const ok = await syncOne(sale);
      if (ok) { write(read().filter((s) => s.id !== sale.id)); synced++; continue; }
      // Failed this attempt. After MAX_ATTEMPTS treat it as poison: flag it and move
      // on (don't block the rest). Otherwise stop this cycle and retry all next tick
      // (transient network errors — preserves order without hammering).
      const attempts = (sale.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) { updateSale(sale.id, { attempts, failed: true }); console.error("Sale permanently failed:", sale.id, lastSyncError); continue; }
      updateSale(sale.id, { attempts });
      break;
    }
  } catch { /* ignore — retry next tick */ }
  finally { flushing = false; }
  if (synced > 0) pushStatus({ synced: true }); else pushStatus();
  return { synced, remaining: read().length };
}

async function syncOne(sale: PendingSale): Promise<boolean> {
  const { error: saleErr } = await supabase.from("sales").insert({
    id: sale.id, store_id: sale.store_id, trx_id: sale.trx_id,
    cashier_id: sale.cashier_id, cashier_name: sale.cashier_name, shift: sale.shift,
    total: sale.total, payment_method: sale.payment_method,
    cash_received: sale.cash_received, change_amount: sale.change_amount,
    customer_name: sale.customer_name ?? null,
    created_at: sale.created_at,
  });
  // 23505 = already inserted (a prior partial sync) → fine, carry on to items/stock.
  if (saleErr && (saleErr as { code?: string }).code !== "23505") { lastSyncError = `sales — ${saleErr.message}`; return false; }

  if (sale.items.length) {
    const { error: itErr } = await supabase.from("sale_items")
      .upsert(sale.items.map((i) => ({ ...i, sale_id: sale.id })), { onConflict: "id" });
    if (itErr) { lastSyncError = `sale_items — ${itErr.message}`; return false; }
  }

  // Apply stock deltas idempotently: track which product ids are done and persist
  // after EACH one, so a mid-way failure (or an app kill) retries only the
  // unfinished deltas — never double-decrements, and never silently skips.
  if (sale.stock.length) {
    const applied = new Set(sale.stockApplied ?? []);
    for (const d of sale.stock) {
      if (applied.has(d.id)) continue;
      const { data, error: readErr } = await supabase.from("products").select("stock, stock_terjual").eq("id", d.id).maybeSingle();
      if (readErr) { lastSyncError = `stok — ${readErr.message}`; updateSale(sale.id, { stockApplied: [...applied] }); return false; }
      if (data) {
        const { error: updErr } = await supabase.from("products").update({
          stock: ((data as { stock: number }).stock ?? 0) - d.qty,
          stock_terjual: ((data as { stock_terjual: number }).stock_terjual ?? 0) + d.qty,
        }).eq("id", d.id);
        if (updErr) { lastSyncError = `stok — ${updErr.message}`; updateSale(sale.id, { stockApplied: [...applied] }); return false; }
      }
      applied.add(d.id);
      updateSale(sale.id, { stockApplied: [...applied] });   // persist progress
    }
  }
  lastSyncError = "";   // this sale synced cleanly
  return true;
}

// Record a completed sale: queue locally, then try to sync right away.
export function recordSale(sale: PendingSale) {
  enqueueSale(sale);
  void flushQueue();
}

let started = false;
export function initSync() {
  if (started) return;
  started = true;
  const flushAll = () => { void flushQueue(); void flushAuditServer(); };
  const setOnline = (v: boolean) => { useStore.getState().setSyncStatus({ isOnline: v }); if (v) flushAll(); };
  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
  useStore.getState().setSyncStatus({ isOnline: navigator.onLine, pendingSyncCount: read().length });
  flushAll();
  setInterval(flushAll, 30000);
}
