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
  created_at: string;    // real sale time (ISO) — preserved even if synced later
  items: PendingItem[];
  stock: { id: string; qty: number }[]; // stock deltas to apply on first sync
}

function read(): PendingSale[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: PendingSale[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
export function pendingCount(): number { return read().length; }

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
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (flushing || !navigator.onLine) return { synced: 0, remaining: read().length };
  flushing = true;
  let synced = 0;
  try {
    for (const sale of [...read()]) {
      const ok = await syncOne(sale);
      if (!ok) break;                       // offline / server error → retry later
      write(read().filter((s) => s.id !== sale.id));
      synced++;
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
    created_at: sale.created_at,
  });
  const fresh = !saleErr;
  // 23505 = already inserted (a prior partial sync) → treat as done, don't re-apply stock.
  if (saleErr && (saleErr as { code?: string }).code !== "23505") return false;

  if (sale.items.length) {
    const { error: itErr } = await supabase.from("sale_items")
      .upsert(sale.items.map((i) => ({ ...i, sale_id: sale.id })), { onConflict: "id" });
    if (itErr) return false;
  }

  if (fresh && sale.stock.length) {
    for (const d of sale.stock) {
      const { data } = await supabase.from("products").select("stock, stock_terjual").eq("id", d.id).maybeSingle();
      if (data) {
        await supabase.from("products").update({
          stock: ((data as { stock: number }).stock ?? 0) - d.qty,
          stock_terjual: ((data as { stock_terjual: number }).stock_terjual ?? 0) + d.qty,
        }).eq("id", d.id);
      }
    }
  }
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
