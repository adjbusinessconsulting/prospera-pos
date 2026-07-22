import { supabase } from "./supabase";
import { localDateISO } from "../store";

// Local (device-tz) YYYY-MM-DD for a timestamp — business day boundaries follow
// the cashier's clock, same as the rest of the app.
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ClosingSnapshot {
  cashierName: string | null;
  omzet: number; trx: number; shiftCount: number;
  cash: number; kasMasuk: number; kasKeluar: number; hutangSettle: number;
  expected: number;                 // drawer seharusnya (excl. modal awal)
  breakdown: Record<string, number>;
}

// Compute a day's closing figures from server data for [dayStartISO, dayEndISO).
export async function computeClosing(storeId: string, dayStartISO: string, dayEndISO: string): Promise<ClosingSnapshot> {
  const [{ data: sales }, { data: kas }, { data: hut }] = await Promise.all([
    supabase.from("sales").select("total,payment_method,shift,cashier_name,created_at").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
    supabase.from("kas_entries").select("type,amount").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
    supabase.from("hutang").select("amount,status,settled_method,created_at").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
  ]);
  const S = (sales ?? []) as { total: number; payment_method: string; shift: number; cashier_name?: string }[];
  const H = (hut ?? []) as { amount: number; status: string; settled_method?: string | null }[];
  const K = (kas ?? []) as { type: string; amount: number }[];
  const bd: Record<string, number> = {};
  S.filter(s => s.payment_method !== "hutang").forEach(s => { bd[s.payment_method] = (bd[s.payment_method] ?? 0) + (s.total ?? 0); });
  H.filter(h => h.status === "lunas").forEach(h => { const m = h.settled_method ?? "tunai"; bd[m] = (bd[m] ?? 0) + h.amount; });
  const cash = S.filter(s => s.payment_method === "tunai" || s.payment_method === "transfer").reduce((a, s) => a + (s.total ?? 0), 0);
  const kasMasuk = K.filter(k => k.type === "masuk").reduce((a, k) => a + k.amount, 0);
  const kasKeluar = K.filter(k => k.type === "keluar").reduce((a, k) => a + k.amount, 0);
  const hutangSettle = K.filter(k => k.type === "hutang_settle").reduce((a, k) => a + k.amount, 0);
  return {
    cashierName: S[0]?.cashier_name ?? null,
    omzet: Object.values(bd).reduce((a, v) => a + v, 0),
    trx: S.length,
    shiftCount: Math.max(1, new Set(S.map(s => s.shift)).size),
    cash, kasMasuk, kasKeluar, hutangSettle,
    expected: cash + kasMasuk + hutangSettle - kasKeluar,
    breakdown: bd,
  };
}

// Save TODAY's closing (from Tutup Toko). Upsert so re-closing overwrites.
export async function saveShiftClosing(storeId: string, snap: ClosingSnapshot & { modalAwal: number; counted: number | null; selisih: number | null; reconciled: boolean }): Promise<void> {
  try {
    await supabase.from("shift_closings").upsert({
      store_id: storeId, business_date: localDateISO(), closed_at: new Date().toISOString(),
      cashier_name: snap.cashierName, omzet: snap.omzet, trx: snap.trx, shift_count: snap.shiftCount,
      modal_awal: snap.modalAwal, expected: snap.expected + snap.modalAwal,
      counted: snap.counted, selisih: snap.selisih, reconciled: snap.reconciled, auto_closed: false, breakdown: snap.breakdown,
    }, { onConflict: "store_id,business_date" });
  } catch { /* non-fatal */ }
}

// Precaution: any PAST day with sales but no closing → auto-close it (no cash count).
// Runs on login. Bounded to the widest retention window (90 days) so it's cheap.
export async function autoCloseStaleShifts(storeId: string): Promise<void> {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const windowStart = new Date(todayStart); windowStart.setDate(windowStart.getDate() - 95);
    const { data: sales } = await supabase.from("sales").select("created_at").eq("store_id", storeId)
      .gte("created_at", windowStart.toISOString()).lt("created_at", todayStart.toISOString());
    if (!sales?.length) return;
    const dates = [...new Set((sales as { created_at: string }[]).map(s => localDay(s.created_at)))];
    const { data: existing } = await supabase.from("shift_closings").select("business_date").eq("store_id", storeId).in("business_date", dates);
    const done = new Set((existing ?? []).map((r: { business_date: string }) => r.business_date));
    for (const date of dates) {
      if (done.has(date)) continue;
      const dayStart = new Date(`${date}T00:00:00`); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const c = await computeClosing(storeId, dayStart.toISOString(), dayEnd.toISOString());
      await supabase.from("shift_closings").insert({
        store_id: storeId, business_date: date, closed_at: dayEnd.toISOString(),
        cashier_name: c.cashierName, omzet: c.omzet, trx: c.trx, shift_count: c.shiftCount,
        modal_awal: 0, expected: c.expected, counted: null, selisih: null,
        reconciled: false, auto_closed: true, breakdown: c.breakdown,
      });
    }
  } catch { /* non-fatal */ }
}
