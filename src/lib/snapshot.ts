import { useStore } from "../store";
import type { Product, ShiftDef, CashierDB } from "../types";

// A tiny, silent on-device cache of the render-critical store slices. Its only
// job is to kill the "everything disappears" blank right after a version update:
// on boot we paint the last-known catalog/cashiers/shifts instantly, then the
// normal network fetch overwrites it a moment later. This is NOT a source of
// truth — the server always wins the instant its data returns.

const KEY = "sterith_snapshot_v1";

interface Snapshot {
  storeId: string;
  storeName: string;
  products: Product[];
  dbCashiers: CashierDB[];
  dbShifts: ShiftDef[];
  trxCounter: number;
  savedAt: number;
}

// Persist the current store slices. Safe to call often — cheap and guarded so a
// quota/serialize error never bubbles up into the UI.
export function saveSnapshot() {
  try {
    const s = useStore.getState();
    if (!s.storeId || s.isDemoMode) return;   // never cache the demo seed
    const snap: Snapshot = {
      storeId: s.storeId,
      storeName: s.storeName,
      products: s.products,
      dbCashiers: s.dbCashiers,
      dbShifts: s.dbShifts,
      trxCounter: s.trxCounter,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch { /* quota / serialization — ignore, it's only a cache */ }
}

// Paint the cached slices for `storeId` into the store immediately (before the
// network fetch). Returns true if a matching snapshot was applied.
export function hydrateSnapshot(storeId: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw) as Snapshot;
    if (snap.storeId !== storeId || !Array.isArray(snap.products)) return false;
    const st = useStore.getState();
    if (snap.products.length) st.setProductsFromDB(snap.products);
    if (snap.dbCashiers?.length) st.setDbCashiers(snap.dbCashiers);
    if (snap.dbShifts?.length) st.setDbShifts(snap.dbShifts);
    if (typeof snap.trxCounter === "number") st.setTrxCounter(snap.trxCounter);
    return true;
  } catch { return false; }
}

// ── Riwayat (sales history) cache ───────────────────────────────────
// Riwayat is fetched fresh from the server every time the screen opens, with
// nothing kept locally — so on a slow/cold connection it shows empty until the
// network responds. Cache the last-loaded rows per store and paint them
// instantly, then let the screen's own fetch refresh them.
const RIWAYAT_KEY = "sterith_riwayat_v1";

export function saveRiwayatCache(storeId: string, sales: unknown[]) {
  try {
    if (!storeId || !Array.isArray(sales)) return;
    // Cap tightly so a busy store's cache can't fill the localStorage quota and
    // starve small-but-critical writes (e.g. the day-open modal-awal record).
    localStorage.setItem(RIWAYAT_KEY, JSON.stringify({ storeId, sales: sales.slice(0, 150) }));
  } catch { /* quota — ignore, it's only a cache */ }
}

export function readRiwayatCache(storeId: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(RIWAYAT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { storeId: string; sales: unknown[] };
    return c.storeId === storeId && Array.isArray(c.sales) ? c.sales : null;
  } catch { return null; }
}

export function clearSnapshot() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(RIWAYAT_KEY); } catch { /* ignore */ }
}
