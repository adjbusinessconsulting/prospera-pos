import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useStore, isAtLeast, localDateISO } from "../store";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { formatRp } from "../data";
import type { Screen } from "../types";

const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", debit: "Debit", ewallet: "E-Wallet" };
const METHOD_ORDER = ["tunai", "qris", "transfer", "debit", "ewallet"];

interface Closing {
  business_date: string; closed_at: string; cashier_name: string | null;
  omzet: number; trx: number; shift_count: number; modal_awal: number;
  expected: number; counted: number | null; selisih: number | null;
  reconciled: boolean; auto_closed: boolean; breakdown: Record<string, number>;
}

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function TutupShiftRiwayat() {
  const { setScreen, cashierInitials, signOut, storeId, storeTier } = useStore();
  const effectiveTier = storeId ? storeTier : "premium";
  const retentionDays = isAtLeast(effectiveTier, "premium") ? 90 : isAtLeast(effectiveTier, "standard") ? 30 : 1;

  const today = localDateISO();
  const yest = ymd(new Date(Date.now() - 86400000));
  const minDate = ymd(new Date(Date.now() - retentionDays * 86400000)); // earliest still-retained day
  const [date, setDate] = useState(today);
  const [row, setRow] = useState<Closing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    supabase.from("shift_closings").select("*").eq("store_id", storeId).eq("business_date", date).maybeSingle()
      .then(({ data }) => { if (alive) { setRow((data as Closing) ?? null); setLoading(false); } });
    return () => { alive = false; };
  }, [storeId, date]);

  const canExtended = isAtLeast(effectiveTier, "standard");
  const bdRows = useMemo(() => METHOD_ORDER.filter(m => (row?.breakdown?.[m] ?? 0) > 0), [row]);

  const tab = (label: string, screen: Screen, active = false) => (
    <button onClick={active ? undefined : () => setScreen(screen)}
      className={`px-3 lg:px-4 py-2 rounded-[8px] text-[12px] transition-colors border-0 ${active ? "font-semibold bg-navy text-cream-text" : "font-medium text-text-mute hover:text-navy bg-transparent cursor-pointer"}`}>
      {label}
    </button>
  );
  const datePill = (label: string, d: string) => (
    <button onClick={() => setDate(d)}
      className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${date === d ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"} cursor-pointer`}>
      {label}
    </button>
  );
  const line = (label: string, value: string, opts?: { strong?: boolean; color?: string }) => (
    <div className="flex justify-between items-center py-[9px] border-b border-[#F2EDE3] last:border-0">
      <span className={`text-[12.5px] ${opts?.strong ? "font-semibold text-navy" : "text-text-mute"}`}>{label}</span>
      <span className={`num text-[14.5px] ${opts?.strong ? "font-bold" : "font-semibold"}`} style={{ fontVariantNumeric: "tabular-nums", color: opts?.color ?? "#0D1117" }}>{value}</span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Performa toko</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5 flex-wrap">
              {tab("Riwayat", "riwayat")}
              {tab("Kas", "kas")}
              {tab("Hutang", "hutang")}
              {tab("Log", "log")}
              {tab("Tutup Shift", "shift-riwayat", true)}
            </div>
          </div>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {datePill("Hari ini", today)}
          {datePill("Kemarin", yest)}
          {canExtended && (
            <input type="date" value={date} min={minDate} max={today} onChange={e => e.target.value && setDate(e.target.value)}
              className="h-[32px] px-2.5 rounded-full text-[12px] text-navy border border-warm-border bg-white cursor-pointer" />
          )}
          {!canExtended && <span className="text-[11px] text-text-mute ml-1">Free: hanya hari ini &amp; kemarin</span>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-10 py-5">
          <div style={{ maxWidth: 460 }}>
            <p style={{ fontSize: 11.5, color: "#7A776F", margin: "0 0 12px" }}>{prettyDate(date)}</p>

            {loading ? (
              <p style={{ color: "#B8B0A8", fontSize: 13, paddingTop: 20 }}>Memuat…</p>
            ) : !row ? (
              <div className="bg-white border border-warm-border rounded-card px-6 py-10 text-center">
                <p className="text-[14px] font-medium text-navy mb-1">Belum ada tutup shift</p>
                <p className="text-[12px] text-text-mute">Tidak ada nota tutup shift untuk tanggal ini.</p>
              </div>
            ) : (
              <div className="bg-white border border-warm-border rounded-card px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">Nota Tutup Shift</p>
                    <p className="text-[12px] text-text-mute mt-0.5">Kasir {row.cashier_name || "—"} · {row.shift_count} shift · ditutup {new Date(row.closed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {row.auto_closed
                    ? <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "#A6843F", background: "rgba(201,165,95,0.14)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 5, padding: "3px 7px", textTransform: "uppercase" }}>Otomatis</span>
                    : <ShieldCheck size={16} color="#4E8C6E" />}
                </div>
                {line("Omzet", formatRp(row.omzet))}
                {line("Transaksi", `${row.trx}`)}
                {bdRows.length > 0 && <div className="mt-2 mb-1"><p style={{ fontSize: 9, letterSpacing: "0.16em" }} className="font-sans uppercase text-text-mute">Per metode</p></div>}
                {bdRows.map(m => line(METHOD_LABEL[m] ?? m, formatRp(row.breakdown[m])))}
                <div className="mt-2 mb-1"><p style={{ fontSize: 9, letterSpacing: "0.16em" }} className="font-sans uppercase text-text-mute">Kas / Laci</p></div>
                {line("Modal awal", formatRp(row.modal_awal))}
                {line("Seharusnya di laci", formatRp(row.expected), { strong: true })}
                {row.reconciled ? (
                  <>
                    {line("Dihitung", formatRp(row.counted ?? 0))}
                    {line("Selisih", `${(row.selisih ?? 0) >= 0 ? "+" : "−"}${formatRp(Math.abs(row.selisih ?? 0))}`, { color: (row.selisih ?? 0) === 0 ? "#3D7A5E" : (row.selisih ?? 0) > 0 ? "#A6843F" : "#C25E3D", strong: true })}
                  </>
                ) : (
                  <p className="text-[11.5px] text-text-mute mt-2">{row.auto_closed ? "Ditutup otomatis — kas tidak dihitung." : "Ditutup tanpa hitung kas."}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
