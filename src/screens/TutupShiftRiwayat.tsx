import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useStore, isAtLeast, localDateISO } from "../store";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { autoCloseStaleShifts } from "../lib/shift";
import { isConnected as printerReady, printShiftClosing, loadPrinterConfig } from "../lib/printer";
import { formatRp } from "../data";
import type { Screen } from "../types";

const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", debit: "Debit", ewallet: "E-Wallet", hutang: "Hutang / Bon" };
const METHOD_ORDER = ["tunai", "qris", "transfer", "debit", "ewallet", "hutang"];

interface Closing {
  business_date: string; closed_at: string; cashier_name: string | null;
  omzet: number; trx: number; shift_count: number; modal_awal: number;
  expected: number; counted: number | null; selisih: number | null;
  reconciled: boolean; auto_closed: boolean; breakdown: Record<string, number>;
  // Added later. Notas closed before the migration were backfilled to 0 (not
  // null — Postgres fills in the DEFAULT), so the UI gates each line on > 0.
  cash: number | null; kas_masuk: number | null; kas_keluar: number | null;
  hutang_settle: number | null; piutang_baru: number | null;
}

// The demo has no Supabase rows, so the saved nota — the screen the whole product
// argues for — came up empty for anyone trying the demo. Seeded here with the same
// figures Tutup Toko shows, so the two screens tell one story, and always with a
// realistic 5.000 shortage rather than a tidy zero.
//
// Built per tier: Free has no Hutang/Bon, so no hutang line, no piutang and no
// pelunasan in the drawer — otherwise the demo advertises a feature that tier
// cannot use. Figures stay consistent with Tutup Toko either way.
function demoClosing(credit: boolean): Closing {
  const breakdown: Record<string, number> = { tunai: 5_120_000, qris: 1_830_000, transfer: 1_000_000 };
  if (credit) breakdown.hutang = 402_000;
  const omzet = Object.values(breakdown).reduce((a, v) => a + v, 0);
  const settle = credit ? 185_000 : 0;
  //   laci = modal 500 + tunai 5.120 + pelunasan - keluar 115, counted 5.000 short
  const expected = 500_000 + 5_120_000 + settle - 115_000;
  return {
    business_date: "", closed_at: new Date().toISOString(), cashier_name: "Mr Bah",
    omzet, trx: 54, shift_count: 3, modal_awal: 500_000,
    expected, counted: expected - 5_000, selisih: -5_000,
    reconciled: true, auto_closed: false, breakdown,
    cash: 5_120_000, kas_masuk: 0, kas_keluar: 115_000,
    hutang_settle: settle, piutang_baru: credit ? 217_000 : 0,
  };
}

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function TutupShiftRiwayat() {
  const { setScreen, cashierInitials, signOut, storeId, storeTier, isDemoMode } = useStore();
  const storeName = useStore((st) => st.storeName);
  const [printMsg, setPrintMsg] = useState("");
  const effectiveTier = storeId ? storeTier : "premium";
  const retentionDays = isAtLeast(effectiveTier, "premium") ? 90 : isAtLeast(effectiveTier, "standard") ? 30 : 1;

  const today = localDateISO();
  const yest = ymd(new Date(Date.now() - 86400000));
  const minDate = ymd(new Date(Date.now() - retentionDays * 86400000)); // earliest still-retained day
  const [date, setDate] = useState(today);
  const [row, setRow] = useState<Closing | null>(null);
  const [loading, setLoading] = useState(true);
  const [caughtUp, setCaughtUp] = useState(false);

  // On open, catch up any past day that was never closed — the auto-close otherwise
  // only runs on login, so a nota can be missing if the cashier stayed logged in.
  useEffect(() => {
    if (!storeId || isDemoMode) { setCaughtUp(true); return; }
    let alive = true;
    autoCloseStaleShifts(storeId).finally(() => { if (alive) setCaughtUp(true); });
    return () => { alive = false; };
  }, [storeId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      // Today and yesterday have a nota; older dates stay empty, which is honest —
      // the demo store did not exist then.
      setRow(date === today || date === yest
        ? { ...demoClosing(isAtLeast(storeTier, "standard")), business_date: date }
        : null);
      setLoading(false);
      return;
    }
    if (!storeId) { setLoading(false); return; }
    if (!caughtUp) return;   // wait for the catch-up so a freshly-closed day shows
    let alive = true;
    setLoading(true);
    supabase.from("shift_closings").select("*").eq("store_id", storeId).eq("business_date", date).maybeSingle()
      .then(({ data }) => { if (alive) { setRow((data as Closing) ?? null); setLoading(false); } });
    return () => { alive = false; };
  }, [storeId, date, caughtUp, isDemoMode, today, yest, storeTier]);

  const canExtended = isAtLeast(effectiveTier, "standard");
  const bdRows = useMemo(() => METHOD_ORDER.filter(m => (row?.breakdown?.[m] ?? 0) > 0), [row]);

  // The nota is what an owner files and signs, so paper matters more here than on
  // a sale receipt. Failure is non-fatal: the screen copy is always the fallback.
  async function printNota() {
    if (!row) return;
    setPrintMsg("");
    if (!printerReady()) { setPrintMsg("Printer belum terhubung. Atur di Pengaturan."); return; }
    try {
      await printShiftClosing({
        storeName: storeName || "STERITH POS",
        dateStr: prettyDate(row.business_date),
        closedTime: new Date(row.closed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        cashierName: row.cashier_name || "-",
        shiftCount: row.shift_count,
        omzet: row.omzet, trx: row.trx, breakdown: row.breakdown ?? {},
        piutangBaru: row.piutang_baru ?? 0,
        modalAwal: row.modal_awal, cash: row.cash ?? 0,
        hutangSettle: row.hutang_settle ?? 0, kasMasuk: row.kas_masuk ?? 0, kasKeluar: row.kas_keluar ?? 0,
        expected: row.expected, counted: row.counted, selisih: row.selisih,
        reconciled: row.reconciled, autoClosed: row.auto_closed,
      }, loadPrinterConfig()?.paper ?? 58);
      setPrintMsg("Nota terkirim ke printer.");
    } catch {
      setPrintMsg("Gagal mencetak. Periksa printer & sambungannya.");
    }
  }

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
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Performa toko</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 mt-0.5 self-start max-w-full overflow-x-auto flex-nowrap lg:max-w-none">
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
        <div className="flex-1 lg:overflow-y-auto px-5 lg:px-10 py-5">
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
                  <button onClick={() => void printNota()}
                    className="text-[11.5px] font-semibold text-navy hover:underline bg-transparent border-0 cursor-pointer px-0 mr-3">
                    Cetak
                  </button>
                  {row.auto_closed
                    ? <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "#A6843F", background: "rgba(201,165,95,0.14)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 5, padding: "3px 7px", textTransform: "uppercase" }}>Otomatis</span>
                    : <ShieldCheck size={16} color="#4E8C6E" />}
                </div>
                {line("Omzet", formatRp(row.omzet))}
                {line("Transaksi", `${row.trx}`)}
                {bdRows.length > 0 && <div className="mt-2 mb-1"><p style={{ fontSize: 9, letterSpacing: "0.16em" }} className="font-sans uppercase text-text-mute">Per metode</p></div>}
                {bdRows.map(m => line(METHOD_LABEL[m] ?? m, formatRp(row.breakdown[m]), m === "hutang" ? { color: "#C25E3D" } : undefined))}
                {/* A SUBSET of the Hutang / Bon line above, not another method — so it
                    is set apart from the method run and says so. Sitting flush in the
                    list, it read as a fourth method and made the column appear not to
                    add up (30 + 35 + 75 + 30 ≠ omzet). */}
                {(row.piutang_baru ?? 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-warm-dashed">
                    {line("Belum diterima · sudah termasuk di atas", formatRp(row.piutang_baru ?? 0), { color: "#C25E3D" })}
                  </div>
                )}

                <div className="mt-2 mb-1"><p style={{ fontSize: 9, letterSpacing: "0.16em" }} className="font-sans uppercase text-text-mute">Kas / Laci</p></div>
                {line("Modal awal", formatRp(row.modal_awal))}
                {/* The working behind "seharusnya di laci". Every part is gated on > 0,
                    which also handles notas closed before these columns existed: the
                    migration backfilled them to 0, so a null check would have printed
                    "Tunai + Rp 0" against a real drawer total on every old day. */}
                {(row.cash ?? 0) > 0 && line("Tunai", `+ ${formatRp(row.cash ?? 0)}`)}
                {(row.hutang_settle ?? 0) > 0 && line("Pelunasan hutang (tunai)", `+ ${formatRp(row.hutang_settle ?? 0)}`)}
                {(row.kas_masuk ?? 0) > 0 && line("Kas masuk", `+ ${formatRp(row.kas_masuk ?? 0)}`)}
                {(row.kas_keluar ?? 0) > 0 && line("Kas keluar", `− ${formatRp(row.kas_keluar ?? 0)}`, { color: "#C25E3D" })}
                {line("Seharusnya di laci", formatRp(row.expected), { strong: true })}
                {row.reconciled ? (
                  <>
                    {line("Dihitung", formatRp(row.counted ?? 0))}
                    {line("Selisih", `${(row.selisih ?? 0) >= 0 ? "+" : "−"}${formatRp(Math.abs(row.selisih ?? 0))}`, { color: (row.selisih ?? 0) === 0 ? "#3D7A5E" : (row.selisih ?? 0) > 0 ? "#A6843F" : "#C25E3D", strong: true })}
                  </>
                ) : (
                  <p className="text-[11.5px] text-text-mute mt-2">{row.auto_closed ? "Ditutup otomatis — kas tidak dihitung." : "Ditutup tanpa hitung kas."}</p>
                )}
                {printMsg && (
                  <p className="text-[11.5px] mt-2" style={{ color: printMsg.startsWith("Nota terkirim") ? "#3D7A5E" : "#C25E3D" }}>{printMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
