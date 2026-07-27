import { supabase } from "./supabase";
import { useStore, localDateISO } from "../store";
import { saveSnapshot } from "./snapshot";
import { withRetry } from "./retry";
import type { Product, ShiftDef, CashierDB } from "../types";

// Re-pull catalog / cashiers / shifts / settings from the server WITHOUT a re-login,
// so Back Office edits (new products, price changes, new cashiers, shifts, settings)
// show up in the POS. Leaves the screen, cart, cashier, and session untouched.
export async function refreshStoreData(): Promise<boolean> {
  const st = useStore.getState();
  const storeId = st.storeId;
  if (!storeId || st.isDemoMode) return false;
  try {
    // Retry the whole pull a few times: a freshly-woken phone often fails the
    // first attempt while its connection / auth token comes back. Success = the
    // store row actually came through (the others are guarded individually below).
    const [sRes, cRes, pRes, shRes] = await withRetry(
      () => Promise.all([
        supabase.from("stores").select("*").eq("id", storeId).maybeSingle(),
        supabase.from("cashiers").select("*").eq("store_id", storeId).eq("active", true),
        supabase.from("products").select("*").eq("store_id", storeId).eq("active", true).order("name"),
        supabase.from("shifts").select("id, name, start_time, end_time").eq("store_id", storeId).order("start_time"),
      ]),
      ([s]) => !s.error && !!s.data,
    );
    // If we can't even read the store (offline / transient / RLS), don't wipe any
    // local data — just skip this refresh.
    if (sRes.error || !sRes.data) return false;
    const store = sRes.data;
    const today = localDateISO();
    // Only replace a slice when its fetch actually succeeded — a failed query must
    // not clear products/cashiers/shifts out from under the cashier.
    if (!pRes.error && pRes.data) {
      const mapped = pRes.data.map((r: Record<string, unknown>) => {
        const stock = (r.stock as number) ?? 0;
        const rolls = r.stock_date !== today;
        return {
          ...r, stock,
          stockAwal:     rolls ? stock : ((r.stock_awal as number) ?? stock),
          stockTambahan: rolls ? 0     : ((r.stock_tambahan as number) ?? 0),
          stockTerjual:  rolls ? 0     : ((r.stock_terjual as number) ?? 0),
          stockDate:     today,
        };
      });
      st.setProductsFromDB(mapped as unknown as Product[]);
    }
    if (!cRes.error && cRes.data) st.setDbCashiers(cRes.data as CashierDB[]);
    if (!shRes.error && shRes.data) st.setDbShifts(shRes.data as ShiftDef[]);
    st.loadSettings(store.settings);
    st.setInventorySettings(store.inventory_enabled ?? true, store.low_stock_threshold ?? 5);
    st.setReceiptLogo(store.receipt_logo ?? "");
    st.setStoreInfo(store.name ?? st.storeName, store.address ?? "", store.phone ?? "");
    saveSnapshot();   // keep the on-device cache in sync with the latest server data
    return true;
  } catch { return false; }
}
