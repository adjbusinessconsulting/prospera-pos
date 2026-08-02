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
  piutangBaru: number;              // bon opened today, still unpaid — NOT drawer cash
  expected: number;                 // drawer seharusnya (excl. modal awal)
  breakdown: Record<string, number>;
}

// Compute a day's closing figures from server data for [dayStartISO, dayEndISO).
export async function computeClosing(storeId: string, dayStartISO: string, dayEndISO: string): Promise<ClosingSnapshot> {
  const [{ data: sales }, { data: kas }, { data: hut }] = await Promise.all([
    supabase.from("sales").select("total,payment_method,shift,cashier_name,created_at,voided").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
    supabase.from("kas_entries").select("type,amount").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
    supabase.from("hutang").select("amount,status,settled_method,created_at,voided").eq("store_id", storeId).gte("created_at", dayStartISO).lt("created_at", dayEndISO),
  ]);
  const S = ((sales ?? []) as { total: number; payment_method: string; shift: number; cashier_name?: string; voided?: boolean }[]).filter(s => !s.voided);
  // A cancelled bon is not a debt. Tutup Toko already excluded these; the auto-close
  // path did not, so a voided bon inflated the figures on any day closed for you.
  const H = ((hut ?? []) as { amount: number; status: string; settled_method?: string | null; voided?: boolean }[]).filter(h => !h.voided);
  const K = (kas ?? []) as { type: string; amount: number }[];
  const bd: Record<string, number> = {};
  S.filter(s => s.payment_method !== "hutang").forEach(s => { bd[s.payment_method] = (bd[s.payment_method] ?? 0) + (s.total ?? 0); });
  // ACCRUAL: a sale is revenue on the day it happens, however it was paid — so a bon
  // counts today, in full, whether or not it has been collected. Settling it later
  // moves cash, never omzet, which is why there is no fold-by-settle-method here.
  // (Was cash-basis; that made a closed day's omzet change weeks later when an old
  // bon was paid, and disagreed with Back Office, which always counted accrual.)
  const hutangBaru = H.reduce((a, h) => a + h.amount, 0);
  if (hutangBaru > 0) bd.hutang = hutangBaru;
  // Physical drawer cash = tunai only. Transfer / QRIS / e-wallet / debit are in
  // omzet + the per-method breakdown, but that money never lands in the laci.
  const cash = S.filter(s => s.payment_method === "tunai").reduce((a, s) => a + (s.total ?? 0), 0);
  const kasMasuk = K.filter(k => k.type === "masuk").reduce((a, k) => a + k.amount, 0);
  const kasKeluar = K.filter(k => k.type === "keluar").reduce((a, k) => a + k.amount, 0);
  const hutangSettle = K.filter(k => k.type === "hutang_settle").reduce((a, k) => a + k.amount, 0);
  return {
    cashierName: S[0]?.cashier_name ?? null,
    omzet: Object.values(bd).reduce((a, v) => a + v, 0),
    trx: S.length,
    shiftCount: Math.max(1, new Set(S.map(s => s.shift)).size),
    cash, kasMasuk, kasKeluar, hutangSettle,
    piutangBaru: H.filter(h => h.status !== "lunas").reduce((a, h) => a + h.amount, 0),
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
      // The parts behind `expected`. Without these the nota states a drawer total
      // it cannot justify — you could see the answer but never check the sum.
      cash: snap.cash, kas_masuk: snap.kasMasuk, kas_keluar: snap.kasKeluar,
      hutang_settle: snap.hutangSettle, piutang_baru: snap.piutangBaru,
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
    const todayLocal = localDateISO();
    const windowStartLocal = localDay(windowStart.toISOString());
    // A past day needs a closing nota if it had sales OR a Buka Toko (modal awal) —
    // so a day that opened with a float but made no transactions still gets one.
    const [{ data: sales }, { data: opens }] = await Promise.all([
      supabase.from("sales").select("created_at").eq("store_id", storeId)
        .gte("created_at", windowStart.toISOString()).lt("created_at", todayStart.toISOString()),
      supabase.from("day_opens").select("business_date, modal_awal").eq("store_id", storeId)
        .gte("business_date", windowStartLocal).lt("business_date", todayLocal),
    ]);
    const modalByDate = new Map((opens ?? []).map((r: { business_date: string; modal_awal: number }) => [r.business_date, r.modal_awal ?? 0]));
    const dates = [...new Set([
      ...((sales ?? []) as { created_at: string }[]).map(s => localDay(s.created_at)),
      ...((opens ?? []) as { business_date: string }[]).map(o => o.business_date),
    ])];
    if (!dates.length) return;
    const { data: existing } = await supabase.from("shift_closings").select("business_date").eq("store_id", storeId).in("business_date", dates);
    const done = new Set((existing ?? []).map((r: { business_date: string }) => r.business_date));
    for (const date of dates) {
      if (done.has(date)) continue;
      const dayStart = new Date(`${date}T00:00:00`); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const c = await computeClosing(storeId, dayStart.toISOString(), dayEnd.toISOString());
      const modalAwal = modalByDate.get(date) ?? 0;
      await supabase.from("shift_closings").insert({
        store_id: storeId, business_date: date, closed_at: dayEnd.toISOString(),
        cashier_name: c.cashierName, omzet: c.omzet, trx: c.trx, shift_count: c.shiftCount,
        modal_awal: modalAwal, expected: c.expected + modalAwal, counted: null, selisih: null,
        cash: c.cash, kas_masuk: c.kasMasuk, kas_keluar: c.kasKeluar,
        hutang_settle: c.hutangSettle, piutang_baru: c.piutangBaru,
        reconciled: false, auto_closed: true, breakdown: c.breakdown,
      });
    }
  } catch { /* non-fatal */ }
}
