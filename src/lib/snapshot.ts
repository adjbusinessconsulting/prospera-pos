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

export function clearSnapshot() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
