import { supabase } from "./supabase";
import { useStore, localDateISO } from "../store";
import type { Product, ShiftDef, CashierDB } from "../types";

// Re-pull catalog / cashiers / shifts / settings from the server WITHOUT a re-login,
// so Back Office edits (new products, price changes, new cashiers, shifts, settings)
// show up in the POS. Leaves the screen, cart, cashier, and session untouched.
export async function refreshStoreData(): Promise<boolean> {
  const st = useStore.getState();
  const storeId = st.storeId;
  if (!storeId || st.isDemoMode) return false;
  try {
    const [{ data: store }, { data: cashierRows }, { data: productRows }, { data: shiftRows }] = await Promise.all([
      supabase.from("stores").select("*").eq("id", storeId).maybeSingle(),
      supabase.from("cashiers").select("*").eq("store_id", storeId).eq("active", true),
      supabase.from("products").select("*").eq("store_id", storeId).eq("active", true).order("name"),
      supabase.from("shifts").select("id, name, start_time, end_time").eq("store_id", storeId).order("start_time"),
    ]);
    const today = localDateISO();
    const mapped = (productRows ?? []).map((r: Record<string, unknown>) => {
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
    st.setDbCashiers((cashierRows ?? []) as CashierDB[]);
    st.setDbShifts((shiftRows ?? []) as ShiftDef[]);
    if (store) {
      st.loadSettings(store.settings);
      st.setInventorySettings(store.inventory_enabled ?? true, store.low_stock_threshold ?? 5);
      st.setReceiptLogo(store.receipt_logo ?? "");
      st.setStoreInfo(store.name ?? st.storeName, store.address ?? "", store.phone ?? "");
    }
    return true;
  } catch { return false; }
}
