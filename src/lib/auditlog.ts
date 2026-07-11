import { useStore, tierLevel } from "../store";
import { supabase } from "./supabase";

// Append-only, tamper-EVIDENT activity log. Every entry embeds a hash of the
// previous one (a hash chain), so deleting or altering any entry breaks the chain
// and is detectable. There is intentionally NO delete/edit API — write-once.
// (Premium also mirrors entries to Backoffice's server; added separately.)

const KEY = "sterith_audit_log_v1";
const SKEY = "sterith_audit_server_queue_v1"; // Premium: pending pushes to Backoffice

export interface AuditEntry {
  seq: number;
  time: string;     // ISO timestamp
  actor: string;    // who did it (cashier)
  type: string;     // e.g. "product.add", "product.price", "stock.add"
  detail: string;   // human-readable, incl. old → new where relevant
  prevHash: string;
  hash: string;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function chainInput(e: Omit<AuditEntry, "hash">): string {
  return `${e.seq}|${e.time}|${e.actor}|${e.type}|${e.detail}|${e.prevHash}`;
}

function read(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: AuditEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ── Demo: ephemeral, seeded, in-memory (never touches the real log) ──
function isDemo(): boolean { return useStore.getState().isDemoMode; }
function seedDemo(): AuditEntry[] {
  const now = Date.now();
  const mk = (minsAgo: number, actor: string, type: string, detail: string, seq: number): AuditEntry =>
    ({ seq, time: new Date(now - minsAgo * 60000).toISOString(), actor, type, detail, prevHash: "DEMO", hash: `demo-${seq}` });
  return [
    mk(320, "Rani",  "product.add",   "Produk baru: Es Kopi Susu — Rp 22.000", 1),
    mk(260, "Rani",  "stock.add",     "Tambah stok Beras Pandan 5kg: +20 → sisa 62", 2),
    mk(140, "Dimas", "product.price", "Ubah harga Indomie Goreng: Rp 3.500 → Rp 3.800", 3),
    mk(75,  "Rani",  "product.price", "Ubah harga Gula Pasir 1kg: Rp 16.000 → Rp 15.500", 4),
    mk(18,  "Dimas", "stock.add",     "Tambah stok Telur Ayam: +30 → sisa 44", 5),
  ];
}
let demoLog: AuditEntry[] = seedDemo();

export function getLog(): AuditEntry[] { return isDemo() ? demoLog : read(); }

// Append an entry. Logging must never throw into the calling action.
export async function logEvent(type: string, detail: string) {
  try {
    const s = useStore.getState();
    // Demo: append to the in-memory log only (ephemeral, never persisted).
    if (s.isDemoMode) {
      const seq = (demoLog[demoLog.length - 1]?.seq ?? 0) + 1;
      demoLog.push({ seq, time: new Date().toISOString(), actor: s.cashierName || s.cashierInitials || "—", type, detail, prevHash: "DEMO", hash: `demo-${seq}` });
      return;
    }
    const list = read();
    const prev = list[list.length - 1];
    const base = {
      seq: (prev?.seq ?? 0) + 1,
      time: new Date().toISOString(),
      actor: s.cashierName || s.cashierInitials || "—",
      type,
      detail,
      prevHash: prev?.hash ?? "GENESIS",
    };
    const hash = await sha256(chainInput(base));
    list.push({ ...base, hash });
    write(list);

    // Premium: also mirror to Backoffice's activity_logs (offline-safe queue).
    if (!s.isDemoMode && s.storeId && tierLevel(s.storeTier) >= 2) {
      const q = readServer();
      q.push({
        id: crypto.randomUUID(),
        store_id: s.storeId,
        type,
        meta: { detail: base.detail, actor: base.actor, seq: base.seq, hash, prev_hash: base.prevHash },
        created_at: base.time,
      });
      writeServer(q);
      void flushAuditServer();
    }
  } catch { /* never break the action */ }
}

interface ServerLog { id: string; store_id: string; type: string; meta: Record<string, unknown>; created_at: string }
function readServer(): ServerLog[] { try { return JSON.parse(localStorage.getItem(SKEY) || "[]"); } catch { return []; } }
// Premium: how many audit entries are still waiting to mirror to Backoffice.
export function pendingAuditCount(): number { try { return readServer().length; } catch { return 0; } }
function writeServer(l: ServerLog[]) { localStorage.setItem(SKEY, JSON.stringify(l)); }

let sflushing = false;
export async function flushAuditServer() {
  if (sflushing || !navigator.onLine) return;
  sflushing = true;
  try {
    for (const e of [...readServer()]) {
      const { error } = await supabase.from("activity_logs").insert(e);
      if (error && (error as { code?: string }).code !== "23505") break; // real error → retry later
      writeServer(readServer().filter((x) => x.id !== e.id));
    }
  } catch { /* retry next tick */ }
  finally { sflushing = false; }
}

const RETENTION_DAYS: Record<string, number> = { free: 1, standard: 30, premium: 90, business: 1095, enterprise: 1825 };

// Prune on-device audit entries older than the tier window, then re-anchor the
// surviving chain so verifyLog() still passes. Immutable WITHIN the window; beyond
// it, entries expire by policy (same window as transaction history) — not by a
// cashier deleting them. Call once on login with the store's tier.
export async function pruneLog(tier: string) {
  try {
    if (isDemo()) return;
    const days = RETENTION_DAYS[(tier || "free").toLowerCase()] ?? 1;
    const cutoff = Date.now() - days * 86400000;
    const list = read();
    const kept = list.filter((e) => new Date(e.time).getTime() >= cutoff);
    if (kept.length === list.length) return;      // nothing expired
    let prevHash = "GENESIS";                      // re-anchor from oldest survivor
    for (const e of kept) {
      e.prevHash = prevHash;
      e.hash = await sha256(chainInput({ seq: e.seq, time: e.time, actor: e.actor, type: e.type, detail: e.detail, prevHash }));
      prevHash = e.hash;
    }
    write(kept);
  } catch { /* non-fatal */ }
}

// Verify the chain. Returns the index of the first broken entry, or -1 if intact.
export async function verifyLog(): Promise<number> {
  if (isDemo()) return -1; // demo log is a showcase — always shown intact
  const list = read();
  let prevHash = "GENESIS";
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.prevHash !== prevHash) return i;
    const h = await sha256(chainInput(e));
    if (h !== e.hash) return i;
    prevHash = e.hash;
  }
  return -1;
}
