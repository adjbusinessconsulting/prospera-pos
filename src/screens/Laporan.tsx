import { useMemo, useState, useEffect } from "react";
import { useStore, isAtLeast, tierLevel } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";

// ── seeded ~6-month sales history (used for the DEMO only) ──
interface DayRec { d: Date; rev: number; trx: number; items: number }
function seedHistory(): { SALES6M: DayRec[]; RTODAY: Date } {
  const arr: DayRec[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 181; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 6 || dow === 0 ? 1.22 : dow === 5 ? 1.12 : 1;
    const trend = 1 + (181 - i) / 181 * 0.35;
    const noise = 0.85 + Math.random() * 0.3;
    const rev = Math.round(1_850_000 * weekend * trend * noise / 1000) * 1000;
    const trx = Math.max(1, Math.round(rev / 55_000));
    arr.push({ d, rev, trx, items: Math.round(trx * 3.1) });
  }
  return { SALES6M: arr, RTODAY: today };
}

const HOURLY = [22, 34, 48, 70, 92, 100, 84, 66, 58, 72, 90, 78, 60, 46, 36, 28];
const DOW_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MODAL_AWAL = 500_000;
const METHOD_SPLIT = [
  { method: "Tunai", pct: 0.68, color: "#5C9E7E" },
  { method: "QRIS", pct: 0.14, color: "#0B1129" },
  { method: "Transfer", pct: 0.09, color: "#C9A55F" },
  { method: "Debit", pct: 0.06, color: "#7A776F" },
  { method: "E-Wallet", pct: 0.03, color: "#C25E3D" },
];

const CHIPS = [
  { g: "hari", o: 0, label: "Hari ini", min: "free" },
  { g: "hari", o: 1, label: "Kemarin", min: "free" },
  { g: "minggu", o: 0, label: "Minggu ini", min: "standard" },
  { g: "minggu", o: 1, label: "Minggu lalu", min: "standard" },
  { g: "bulan", o: 0, label: "Bulan ini", min: "standard" },
  { g: "bulan", o: 1, label: "Bulan lalu", min: "premium" },
  { g: "rentang", o: 0, label: "Rentang", min: "standard" },
] as const;

const tierDaysCap: Record<string, number> = { free: 1, standard: 30, premium: 90, business: 1095, enterprise: 1825 };

function shiftHours(dbShifts: { start_time?: string; end_time?: string }[], n: number): [number, number] {
  const s = dbShifts[n - 1];
  let open = 8, close = 21;
  if (s?.start_time) open = parseInt(s.start_time.slice(0, 2), 10);
  if (s?.end_time) { let c = parseInt(s.end_time.slice(0, 2), 10); if (c <= open) c += 24; close = c; }
  return [open, close];
}
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfWeekMon = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); return x; };
const hourLabel = (h: number) => `${((h % 24) + 24) % 24}–${(((h + 1) % 24) + 24) % 24}`;

interface Series { vals: number[]; labs: string[]; rev: number; trx: number; items: number; title: string; slabel: string }

interface RealItem { ts: number; name: string; qty: number; subtotal: number }
interface RealData { byDay: Map<number, DayRec>; items: RealItem[]; modalAwal: number; todayCash: number }

// The [start,end] day-timestamp range covered by the current period (for filtering real items).
function periodRange(gran: string, off: number, rStart: string, rEnd: string, TODAY: Date): [number, number] {
  const dts = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  if (gran === "hari") { const d = new Date(TODAY); d.setDate(d.getDate() - off); return [dts(d), dts(d)]; }
  if (gran === "minggu") {
    const mon = startOfWeekMon(TODAY); mon.setDate(mon.getDate() - off * 7);
    const end = new Date(mon); end.setDate(end.getDate() + 6);
    return [dts(mon), off === 0 ? Math.min(dts(TODAY), dts(end)) : dts(end)];
  }
  if (gran === "bulan") {
    const base = new Date(TODAY.getFullYear(), TODAY.getMonth() - off, 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return [dts(base), off === 0 ? Math.min(dts(TODAY), dts(last)) : dts(last)];
  }
  return [dts(new Date(rStart)), dts(new Date(rEnd))];
}

export default function Laporan() {
  const { cashierInitials, products, storeId, storeTier, isDemoMode, setScreen, signOut, isOnline, pendingSyncCount, lastSyncedAt, dbShifts, selectedShift } = useStore();
  const effectiveTier = storeId ? storeTier : "free";
  const isStd = isAtLeast(effectiveTier, "standard");
  const isPremium = isAtLeast(effectiveTier, "premium");

  const { SALES6M, RTODAY } = useMemo(seedHistory, []);
  const [openHour, closeHour] = useMemo(() => shiftHours(dbShifts, selectedShift), [dbShifts, selectedShift]);
  const cap = tierDaysCap[effectiveTier] ?? 1;

  // Real store: pull actual sales (+ items) over the retention window + open-shift modal.
  const [real, setReal] = useState<RealData | null>(null);
  useEffect(() => {
    if (!storeId || isDemoMode) { setReal(null); return; }
    let cancelled = false;
    (async () => {
      const from = new Date(RTODAY); from.setDate(from.getDate() - cap);
      const { data: sales } = await supabase.from("sales")
        .select("created_at,total,payment_method,sale_items(product_name,qty,subtotal)")
        .eq("store_id", storeId).gte("created_at", from.toISOString());
      const { data: shiftRow } = await supabase.from("shifts")
        .select("modal_awal").eq("store_id", storeId).is("closed_at", null)
        .order("opened_at", { ascending: false }).limit(1).maybeSingle();
      const { data: hut } = await supabase.from("hutang")
        .select("amount,status,settled_method,created_at").eq("store_id", storeId).gte("created_at", from.toISOString());
      if (cancelled) return;
      const byDay = new Map<number, DayRec>();
      const items: RealItem[] = [];
      const todayTs = RTODAY.getTime();
      let todayCash = 0;  // drawer = tunai + transfer only (QRIS excluded)
      (sales ?? []).forEach(row => {
        const s = row as { created_at: string; total: number; payment_method?: string; sale_items?: { product_name: string; qty: number; subtotal: number }[] };
        const d = new Date(s.created_at); d.setHours(0, 0, 0, 0); const ts = d.getTime();
        const cur = byDay.get(ts) ?? { d, rev: 0, trx: 0, items: 0 };
        const m = s.payment_method ?? "";
        // Cash-basis: credit (hutang) sales don't count as revenue until settled.
        if (m !== "hutang") cur.rev += s.total ?? 0;
        cur.trx += 1;
        (s.sale_items ?? []).forEach(it => { cur.items += it.qty ?? 0; items.push({ ts, name: it.product_name, qty: it.qty ?? 0, subtotal: it.subtotal ?? 0 }); });
        byDay.set(ts, cur);
        if (ts === todayTs && (m === "tunai" || m === "transfer")) todayCash += s.total ?? 0;
      });
      // A settled hutang lifts the omzet of the day its bon was made (created_at),
      // never the day it was paid — so paying an old debt never moves "today".
      (hut ?? []).forEach(row => {
        const h = row as { amount: number; status: string; settled_method?: string | null; created_at: string };
        if (h.status !== "lunas") return;
        const d = new Date(h.created_at); d.setHours(0, 0, 0, 0); const ts = d.getTime();
        const cur = byDay.get(ts) ?? { d, rev: 0, trx: 0, items: 0 };
        cur.rev += h.amount ?? 0;
        byDay.set(ts, cur);
        const sm = h.settled_method ?? "tunai";
        if (ts === todayTs && (sm === "tunai" || sm === "transfer")) todayCash += h.amount ?? 0;
      });
      setReal({ byDay, items, todayCash, modalAwal: (shiftRow as { modal_awal?: number } | null)?.modal_awal ?? 0 });
    })();
    return () => { cancelled = true; };
  }, [storeId, isDemoMode, cap, RTODAY]);

  const modalAwal = real ? real.modalAwal : MODAL_AWAL;

  const [gran, setGran] = useState<string>("hari");
  const [off, setOff] = useState(0);
  const [rMode, setRMode] = useState<"harian" | "mingguan">("harian");
  const defStart = new Date(RTODAY); defStart.setDate(defStart.getDate() - 6);
  const [rStart, setRStart] = useState(isoOf(defStart));
  const [rEnd, setREnd] = useState(isoOf(RTODAY));
  const [lockNote, setLockNote] = useState("");

  const dayRec = useMemo(() => {
    const map = real ? real.byDay : new Map<number, DayRec>(SALES6M.map(r => [r.d.getTime(), r]));
    return (d: Date) => { const t = new Date(d); t.setHours(0, 0, 0, 0); return map.get(t.getTime()) ?? { d: t, rev: 0, trx: 0, items: 0 }; };
  }, [real, SALES6M]);

  const series: Series = useMemo(() => {
    const agg = (vals: number[], labs: string[], recs: { rev: number; trx: number; items: number }[], title: string, slabel: string): Series => ({
      vals, labs, title, slabel,
      rev: recs.reduce((a, r) => a + r.rev, 0), trx: recs.reduce((a, r) => a + r.trx, 0), items: recs.reduce((a, r) => a + r.items, 0),
    });
    if (gran === "hari") {
      const day = new Date(RTODAY); day.setDate(day.getDate() - off);
      const rec = dayRec(day);
      const hrs: number[] = []; for (let h = openHour; h < closeHour; h++) hrs.push(h);
      const shape = hrs.map((_, i) => HOURLY[i % HOURLY.length]);
      const ssum = shape.reduce((a, b) => a + b, 0) || 1;
      const perHr = hrs.map((_, i) => Math.round(shape[i] / ssum * rec.rev));
      let show = hrs.length;
      if (off === 0) { const nowH = new Date().getHours(); show = nowH < openHour ? 1 : Math.max(1, Math.min(hrs.length, nowH - openHour + 1)); }
      const vals = perHr.slice(0, show), labs = hrs.slice(0, show).map(hourLabel);
      const rev = vals.reduce((a, b) => a + b, 0), frac = rec.rev ? rev / rec.rev : 1;
      return { vals, labs, rev, trx: Math.round(rec.trx * frac), items: Math.round(rec.items * frac), title: "Penjualan per jam", slabel: off ? "Total kemarin" : "Total hari ini" };
    }
    if (gran === "minggu") {
      const mon = startOfWeekMon(RTODAY); mon.setDate(mon.getDate() - off * 7);
      const days: Date[] = []; for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(d.getDate() + i); if (off === 0 && d.getTime() > RTODAY.getTime()) break; days.push(d); }
      const recs = days.map(dayRec);
      return agg(recs.map(r => r.rev), days.map(d => DOW_ID[d.getDay()]), recs, "Penjualan per hari", off ? "Total minggu lalu" : "Total minggu ini");
    }
    if (gran === "bulan") {
      const base = new Date(RTODAY.getFullYear(), RTODAY.getMonth() - off, 1);
      const y = base.getFullYear(), m = base.getMonth(), dim = new Date(y, m + 1, 0).getDate();
      const bounds: [number, number][] = ([[1, 7], [8, 14], [15, 21], [22, 28], [29, dim]] as [number, number][]).filter(b => b[0] <= dim);
      const vals: number[] = [], labs: string[] = [], recs: { rev: number; trx: number; items: number }[] = [];
      bounds.forEach((b, idx) => {
        let rev = 0, trx = 0, items = 0, any = false;
        for (let dd = b[0]; dd <= b[1]; dd++) { const d = new Date(y, m, dd); if (off === 0 && d.getTime() > RTODAY.getTime()) continue; any = true; const r = dayRec(d); rev += r.rev; trx += r.trx; items += r.items; }
        if (off !== 0 || any) { vals.push(rev); labs.push("Mgg " + (idx + 1)); recs.push({ rev, trx, items }); }
      });
      return agg(vals, labs, recs, "Penjualan per minggu", off ? "Total bulan lalu" : "Total bulan ini");
    }
    // rentang
    const s = new Date(rStart); s.setHours(0, 0, 0, 0);
    const e = new Date(rEnd); e.setHours(0, 0, 0, 0);
    if (rMode === "mingguan") {
      const buckets = new Map<number, { rev: number; trx: number; items: number; start: Date }>(); const order: number[] = [];
      for (const d = new Date(s); d.getTime() <= e.getTime(); d.setDate(d.getDate() + 1)) {
        const wk = startOfWeekMon(d).getTime();
        if (!buckets.has(wk)) { buckets.set(wk, { rev: 0, trx: 0, items: 0, start: new Date(wk) }); order.push(wk); }
        const b = buckets.get(wk)!, r = dayRec(d); b.rev += r.rev; b.trx += r.trx; b.items += r.items;
      }
      const recs = order.map(k => buckets.get(k)!);
      return agg(recs.map(r => r.rev), recs.map(r => `${r.start.getDate()}/${r.start.getMonth() + 1}`), recs, "Penjualan per minggu", "Total rentang");
    }
    const days: Date[] = []; for (const d = new Date(s); d.getTime() <= e.getTime(); d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const recs = days.map(dayRec), step = Math.max(1, Math.ceil(days.length / 12));
    return agg(recs.map(r => r.rev), days.map((d, i) => i % step === 0 ? String(d.getDate()) : ""), recs, "Penjualan harian", "Total rentang");
  }, [gran, off, rMode, rStart, rEnd, openHour, closeHour, dayRec, RTODAY]);

  // Free today card. Omset = all methods; "Perkiraan di Laci" = modal + CASH
  // (tunai + transfer) only — QRIS is in omset but not in the drawer.
  const freeToday = useMemo(() => {
    const rec = dayRec(RTODAY);
    const nowH = new Date().getHours();
    const upto = nowH < openHour ? openHour + 1 : Math.min(closeHour, nowH + 1);
    if (real) return { omset: rec.rev, laci: real.todayCash, upto };  // real: actual so far
    const hrs = closeHour - openHour;
    const frac = hrs > 0 ? Math.max(0, Math.min(1, (upto - openHour) / hrs)) : 1;
    const omset = Math.round(rec.rev * frac);
    return { omset, laci: Math.round(omset * 0.82), upto };  // demo approx (cash ≈ 82%)
  }, [real, dayRec, RTODAY, openHour, closeHour]);

  const topProducts = useMemo(() => {
    if (real) {
      // Aggregate actual sale_items within the selected period's date range.
      const [a, b] = periodRange(gran, off, rStart, rEnd, RTODAY);
      const agg = new Map<string, { qty: number; subtotal: number }>();
      real.items.forEach(it => {
        if (it.ts < a || it.ts > b) return;
        const c = agg.get(it.name) ?? { qty: 0, subtotal: 0 };
        c.qty += it.qty; c.subtotal += it.subtotal; agg.set(it.name, c);
      });
      const emojiFor = (name: string) => products.find(p => p.name === name)?.emoji ?? "📦";
      return [...agg.entries()]
        .map(([name, v]) => ({ name, emoji: emojiFor(name), sold: v.qty, price: v.qty ? Math.round(v.subtotal / v.qty) : 0 }))
        .sort((x, y) => y.sold - x.sold).slice(0, 5);
    }
    // Demo: weight-based from store products.
    const w = products.map(p => (p.stockTerjual ?? 0) + 0.4);
    const tw = w.reduce((a, b) => a + b, 0) || 1;
    return products.map((p, i) => ({ name: p.name, emoji: p.emoji, price: p.price, weight: w[i] / tw }))
      .sort((a, b) => b.weight - a.weight).slice(0, 5)
      .map(p => ({ name: p.name, emoji: p.emoji, price: p.price, sold: Math.max(1, Math.round(series.items * p.weight)) }));
  }, [real, products, series.items, gran, off, rStart, rEnd, RTODAY]);

  function pick(chip: typeof CHIPS[number]) {
    const locked = tierLevel(chip.min) > tierLevel(effectiveTier);
    if (locked) {
      const prem = chip.min === "premium";
      setLockNote(`🔒 "${chip.label}" perlu paket ${prem ? "Premium" : "Standard"} (riwayat ${prem ? "90" : "30"} hari).`);
      window.clearTimeout((pick as unknown as { _t?: number })._t);
      (pick as unknown as { _t?: number })._t = window.setTimeout(() => setLockNote(""), 4000);
      return;
    }
    setLockNote(""); setGran(chip.g); setOff(chip.o);
  }
  const activeChip = (c: typeof CHIPS[number]) => c.g === gran && (c.g === "rentang" || c.o === off);

  const barMax = Math.max(...series.vals, 1);
  const capMinISO = isoOf(new Date(RTODAY.getTime() - cap * 86400000));

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="laporan" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-end px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0 gap-3">
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">ANALITIK · REPORTS</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Laporan Penjualan</h1>
          </div>
          {isStd && (() => {
            const color = !isOnline ? "#C25E3D" : pendingSyncCount > 0 ? "#A6843F" : "#5C9E7E";
            const label = !isOnline ? `Offline · ${pendingSyncCount} tersimpan` : pendingSyncCount > 0 ? `${pendingSyncCount} belum tersinkron` : "Tersinkron";
            const t = lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: "white", border: `1px solid ${color}55`, borderRadius: 10, padding: "6px 11px" }} className="shrink-0">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1B2A4A" }} className="hidden sm:inline">{label}</span>
                {isOnline && pendingSyncCount === 0 && t && <span style={{ fontSize: 10.5, color: "#7A7360" }} className="hidden sm:inline">· {t}</span>}
              </div>
            );
          })()}
        </div>

        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-6">

          {/* ── FREE: today-only omset + modal awal ── */}
          {effectiveTier === "free" ? (
            <div className="bg-white border border-warm-border rounded-card px-6 py-5 max-w-[460px]">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute font-bold">Ringkasan hari ini</p>
                  <p className="font-serif text-[19px] font-bold text-navy mt-0.5">Buka {openHour}.00 · sampai jam {freeToday.upto}.00</p>
                </div>
                <span style={{ fontSize: 8.5, letterSpacing: "0.1em" }} className="shrink-0 font-bold uppercase text-gold bg-gold/10 border border-gold/30 rounded-md px-2 py-1">Paket Free</span>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center py-[11px] border-b border-cream-deep text-[13.5px] text-text-mute">
                  <span>Modal Awal</span><b className="text-navy text-[15px]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(modalAwal)}</b>
                </div>
                <div className="flex justify-between items-center py-[11px] border-b border-cream-deep text-[13.5px] text-text-mute">
                  <span>Omset (buka → sekarang)</span><b className="text-navy text-[15px]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(freeToday.omset)}</b>
                </div>
                <div className="flex justify-between items-center pt-[14px] text-[13.5px]">
                  <span className="text-navy font-semibold">Perkiraan di Laci</span>
                  <b className="text-gold text-[20px] font-extrabold" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(modalAwal + freeToday.laci)}</b>
                </div>
              </div>
              <p className="text-[11.5px] text-text-mute mt-3.5 leading-relaxed bg-cream-bg rounded-[10px] px-3 py-2.5">
                Paket Free menampilkan omset berjalan hari ini. Grafik &amp; pilih periode mulai paket <b>Standard</b>; rincian lengkap tetap ada di <b>Tutup Shift</b>.
              </p>
            </div>
          ) : (
            <>
              {/* Period chips */}
              <div className="flex flex-wrap gap-2 items-center mb-3">
                {CHIPS.map((c, i) => {
                  const locked = tierLevel(c.min) > tierLevel(effectiveTier);
                  const on = activeChip(c);
                  return (
                    <div key={c.label} className="relative shrink-0 flex items-center">
                      {(i === 2 || i === 4 || i === 6) && <span className="w-px h-5 bg-warm-border mx-1 hidden sm:block" />}
                      <button
                        onClick={() => pick(c)}
                        className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${on ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"} ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                        {c.label}
                      </button>
                      {locked && (
                        <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3 }} className="uppercase">
                          {c.min === "premium" ? "PREM" : "STD"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rentang controls */}
              {gran === "rentang" && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input type="date" value={rStart} min={capMinISO} max={isoOf(RTODAY)} onChange={e => setRStart(e.target.value)}
                    className="h-9 border border-warm-border rounded-[9px] px-2.5 text-[12.5px] text-navy bg-white" />
                  <span className="text-text-mute">–</span>
                  <input type="date" value={rEnd} min={capMinISO} max={isoOf(RTODAY)} onChange={e => setREnd(e.target.value)}
                    className="h-9 border border-warm-border rounded-[9px] px-2.5 text-[12.5px] text-navy bg-white" />
                  <div className="flex bg-cream-deep rounded-full p-[3px] gap-[2px]">
                    {(["harian", "mingguan"] as const).map(m => (
                      <button key={m} onClick={() => setRMode(m)} className={`text-[11.5px] font-semibold px-3 py-[5px] rounded-full capitalize ${rMode === m ? "bg-white text-navy" : "text-text-mute"}`}>{m}</button>
                    ))}
                  </div>
                  <span className="text-[11px] text-text-mute">Maks. {cap} hari (paket {effectiveTier})</span>
                </div>
              )}

              {lockNote && <div className="text-[12px] rounded-[9px] px-3 py-2 mb-3" style={{ color: "#C25E3D", background: "rgba(194,94,61,0.08)", border: "1px solid rgba(194,94,61,0.3)" }}>{lockNote}</div>}

              {/* Summary cards — Standard+ gets all four */}
              <div className="grid gap-3 mb-5 grid-cols-2 lg:grid-cols-4">
                {[
                  { label: series.slabel, value: formatRp(series.rev), accent: true },
                  { label: "TRANSAKSI", value: `${series.trx} trx`, accent: false },
                  { label: "RATA-RATA", value: formatRp(Math.round(series.rev / Math.max(1, series.trx))), accent: false },
                  { label: "ITEM TERJUAL", value: `${series.items} pcs`, accent: false },
                ].map(card => (
                  <div key={card.label} className={`rounded-card px-5 py-4 ${card.accent ? "bg-navy" : "bg-white border border-warm-border"}`}>
                    <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className={`font-sans uppercase mb-1 ${card.accent ? "text-gold/70" : "text-text-mute"}`}>{card.label}</p>
                    <p className={`font-serif text-[20px] font-semibold leading-tight ${card.accent ? "text-cream-text" : "text-navy"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-white border border-warm-border rounded-card px-5 lg:px-6 py-5 mb-4">
                <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">{series.title}</p>
                {series.vals.length ? (
                  <>
                    <div className="h-[100px] flex items-end gap-1.5">
                      {series.vals.map((v, i) => (
                        <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${Math.max(4, Math.round(v / barMax * 100))}%`, background: "linear-gradient(to top,#0B1129,#3A4A78)" }} />
                      ))}
                    </div>
                    <div className="flex mt-2 gap-1.5">
                      {series.labs.map((l, i) => (<span key={i} style={{ fontSize: 8.5, color: "#B0A99A" }} className="flex-1 text-center">{l}</span>))}
                    </div>
                  </>
                ) : <p className="text-[12px] text-text-mute py-8 text-center">Tidak ada data pada periode ini.</p>}
              </div>

              {/* Produk Terlaris (Standard+); Breakdown Metode (Premium only) */}
              <div className="flex flex-col lg:flex-row gap-4">
                {isPremium && (
                  <div className="flex-1 bg-white border border-warm-border rounded-card px-5 lg:px-6 py-5">
                    <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">BREAKDOWN METODE</p>
                    <div className="flex flex-col gap-3">
                      {METHOD_SPLIT.map(m => {
                        const total = Math.round(series.rev * m.pct), pct = Math.round(m.pct * 100);
                        return (
                          <div key={m.method}>
                            <div className="flex justify-between items-baseline mb-1.5">
                              <span className="text-[12.5px] font-medium text-navy">{m.method}</span>
                              <span className="text-[12px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)} · {pct}%</span>
                            </div>
                            <div className="h-[6px] bg-cream-bg rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: m.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex-1 bg-white border border-warm-border rounded-card px-5 lg:px-6 py-5">
                  <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">PRODUK TERLARIS</p>
                  <div className="flex flex-col gap-3">
                    {topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-text-mute w-4 shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                        <span className="text-[18px] leading-none shrink-0">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium text-navy truncate">{p.name}</div>
                          <div className="text-[11px] text-text-mute">{p.sold} terjual</div>
                        </div>
                        <span className="font-serif text-[13px] font-semibold text-navy shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.sold * p.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Premium upsell (shown on Standard) */}
              {!isPremium && (
                <div className="mt-4 bg-white border border-dashed border-warm-border rounded-card px-5 py-4 flex items-center gap-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4C9B8" strokeWidth="1.5" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  <p className="text-[12px] text-text-mute"><b className="text-navy">Breakdown metode pembayaran</b>, per-kasir/kategori &amp; <b className="text-navy">Bulan lalu</b> (90 hari) tersedia di <b className="text-navy">Premium</b>.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
