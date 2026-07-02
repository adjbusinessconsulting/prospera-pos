import { useState, useEffect } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import type { SaleRecord } from "../types";

const FILTER_LABELS = [
  { label: "Hari ini",  days: 0,  tier: null as string | null },
  { label: "Kemarin",   days: 1,  tier: "STD" },
  { label: "7 hari",    days: 7,  tier: "STD" },
  { label: "30 hari",   days: 30, tier: "STD" },
];

const SHIFT_LABELS: Record<number, string> = { 1: "Shift 1 · Pagi", 2: "Shift 2 · Siang", 3: "Shift 3 · Malam" };

const METHOD_COLOR: Record<string, string> = {
  tunai: "#5C9E7E", Tunai: "#5C9E7E",
  qris: "#0B1129",  QRIS: "#0B1129",
  debit: "#7A776F", Debit: "#7A776F",
  transfer: "#7A776F", Transfer: "#7A776F",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const day = new Date(d); day.setHours(0,0,0,0);
  if (day.getTime() === today.getTime()) return "Hari ini";
  if (day.getTime() === yest.getTime()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function methodLabel(m: string) {
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

export default function Riwayat() {
  const { cashierInitials, selectedShift, storeId, storePhone, setScreen, signOut } = useStore();
  const [sales, setSales]           = useState<SaleRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);
  const [methodFilter, setMethodFilter] = useState("Semua");
  const [shiftFilter, setShiftFilter]   = useState("Semua");
  const [kasirFilter, setKasirFilter]   = useState("Semua");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!storeId) { setLoadingData(false); return; }
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("store_id", storeId)
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setSales((data as SaleRecord[]) ?? []);
        setLoadingData(false);
      });
  }, [storeId]);

  function filterByDays(list: SaleRecord[], days: number) {
    if (days === 0) {
      const today = new Date(); today.setHours(0,0,0,0);
      return list.filter(s => new Date(s.created_at) >= today);
    }
    if (days === 1) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1); yest.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return list.filter(s => { const d = new Date(s.created_at); return d >= yest && d < today; });
    }
    const from = new Date(); from.setDate(from.getDate() - (days - 1)); from.setHours(0,0,0,0);
    return list.filter(s => new Date(s.created_at) >= from);
  }

  const periodSales = filterByDays(sales, FILTER_LABELS[activeFilter].days);

  const filtered = periodSales.filter(s => {
    const m = methodLabel(s.payment_method);
    const matchMethod = methodFilter === "Semua" || m === methodFilter;
    const matchShift  = shiftFilter === "Semua" || s.shift === parseInt(shiftFilter);
    const matchKasir  = kasirFilter === "Semua" || s.cashier_name === kasirFilter;
    return matchMethod && matchShift && matchKasir;
  });

  const total = filtered.reduce((s, t) => s + t.total, 0);
  const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

  const uniqueCashiers = [...new Set(sales.map(s => s.cashier_name).filter(Boolean))];

  const now = new Date();
  const hoursLeft = 23 - now.getHours();
  const minsLeft = 59 - now.getMinutes();

  function exportCSV() {
    const period = FILTER_LABELS[activeFilter].label;
    const header = ["No", "TRX ID", "Tanggal", "Jam", "Kasir", "Item", "Total (Rp)", "Metode", "Shift"];
    const rows = filtered.map((t, i) => [
      i + 1, t.trx_id, fmtDate(t.created_at), fmtTime(t.created_at), t.cashier_name,
      t.sale_items?.length ?? 0, t.total, methodLabel(t.payment_method), `Shift ${t.shift}`,
    ]);
    const BOM = "﻿";
    const csv = BOM + [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sterith-riwayat-${period.toLowerCase().replace(/ /g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportWhatsApp() {
    const period = FILTER_LABELS[activeFilter].label;
    const lines = [
      `*Laporan Riwayat — ${period}*`,
      `Sterith POS`,
      ``,
      `Total Omzet: ${formatRp(total)}`,
      `Transaksi: ${filtered.length}  |  Rata-rata: ${formatRp(avg)}`,
      ``,
      `*Detail Transaksi:*`,
      ...filtered.map(t => `• ${t.trx_id}  ${fmtTime(t.created_at)}  ${t.cashier_name}  ${methodLabel(t.payment_method)}  ${formatRp(t.total)}`),
    ];
    const text = encodeURIComponent(lines.join("\n"));
    const phone = storePhone.replace(/\D/g, "").replace(/^0/, "62");
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function exportPDF() {
    const period = FILTER_LABELS[activeFilter].label;
    const rows = filtered.map((t, i) => `
      <tr>
        <td>${i + 1}</td><td>${t.trx_id}</td><td>${fmtDate(t.created_at)}</td><td>${fmtTime(t.created_at)}</td>
        <td>${t.cashier_name}</td><td style="text-align:center">${t.sale_items?.length ?? 0}</td>
        <td style="text-align:right">${formatRp(t.total)}</td><td>${methodLabel(t.payment_method)}</td><td>Shift ${t.shift}</td>
      </tr>`).join("");
    const printed = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"/>
<title>Riwayat Transaksi – ${period}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#0B1129;padding:32px}
  .brand{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A776F;margin-bottom:4px}
  h1{font-size:22px;font-weight:700;margin-bottom:3px}
  .meta{font-size:11px;color:#7A776F;margin-bottom:22px}
  .summary{display:flex;gap:28px;margin-bottom:22px;padding:14px 18px;background:#F8F5EF;border-radius:8px}
  .s-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#7A776F;margin-bottom:2px}
  .s-value{font-size:18px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0B1129;color:#F8F5EF}
  th{text-align:left;padding:9px 11px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
  td{padding:8px 11px;border-bottom:1px solid #ECE7DD}
  tr:nth-child(even) td{background:#FAF8F4}
  .footer{margin-top:18px;font-size:9px;color:#B0A99A;text-align:right}
  @media print{body{padding:20px}}
</style></head><body>
<div class="brand">Sterith POS · Laporan</div>
<h1>Riwayat Transaksi</h1>
<div class="meta">Periode: ${period} · Dicetak ${printed}</div>
<div class="summary">
  <div><div class="s-label">Total Omzet</div><div class="s-value">${formatRp(total)}</div></div>
  <div><div class="s-label">Transaksi</div><div class="s-value">${filtered.length}</div></div>
  <div><div class="s-label">Rata-rata</div><div class="s-value">${formatRp(avg)}</div></div>
</div>
<table><thead><tr>
  <th>No</th><th>TRX ID</th><th>Tanggal</th><th>Jam</th><th>Kasir</th>
  <th style="text-align:center">Item</th><th style="text-align:right">Total</th><th>Metode</th><th>Shift</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Sterith POS — digenerate otomatis · ${new Date().toLocaleString("id-ID")}</div>
<script>setTimeout(()=>{window.print();},250);</script>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  const selectStyle: React.CSSProperties = {
    background: "white", border: "1px solid #ECE7DD", borderRadius: 8,
    padding: "6px 32px 6px 10px", fontSize: 12, color: "#0B1129",
    appearance: "none" as const, outline: "none", cursor: "pointer",
  };

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Performa toko</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5">
              <button className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text transition-colors border-0">
                Riwayat
              </button>
              <button onClick={() => setScreen("kas")}
                className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Kasir
              </button>
            </div>
          </div>
        </div>

        {/* Date filter chips */}
        <div className="flex items-center gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTER_LABELS.map((f, i) => (
            <div key={f.label} className="relative shrink-0">
              <button onClick={() => setActiveFilter(i)}
                className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors cursor-pointer ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
                {f.label}
              </button>
              {f.tier && (
                <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>
                  {f.tier}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex gap-2 px-5 lg:px-10 pt-2 pb-0 shrink-0">
          <div style={{ position: "relative" }}>
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} style={selectStyle}>
              <option value="Semua">Shift: Semua</option>
              <option value="1">Shift 1 · Pagi</option>
              <option value="2">Shift 2 · Siang</option>
              <option value="3">Shift 3 · Malam</option>
            </select>
            <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div style={{ position: "relative" }}>
            <select value={kasirFilter} onChange={e => setKasirFilter(e.target.value)} style={selectStyle}>
              <option value="Semua">Kasir: Semua</option>
              {uniqueCashiers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        {/* Free expiry banner */}
        {activeFilter === 0 && (
          <div className="mx-5 lg:mx-10 mt-3 shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed"
            style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <p className="text-[12px] text-navy">
                <span className="font-semibold">Free tier</span> — riwayat 1 hari.
                <span className="text-text-mute"> Transaksi hari ini hilang setelah {hoursLeft}j {minsLeft}m. Upgrade Standard untuk simpan 30 hari.</span>
              </p>
            </div>
            <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
              STANDARD
            </span>
          </div>
        )}

        {/* Navy omzet strip */}
        <div className="mx-5 lg:mx-10 mt-3 shrink-0 bg-navy rounded-card px-5 lg:px-7 py-4 flex gap-5 lg:gap-8">
          <div>
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TOTAL OMZET</p>
            <p className="font-serif text-[18px] lg:text-[20px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</p>
          </div>
          <div>
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TRANSAKSI</p>
            <p className="font-serif text-[18px] lg:text-[20px] font-semibold text-cream-text">{filtered.length}</p>
          </div>
          <div className="hidden lg:block">
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">RATA-RATA</p>
            <p className="font-serif text-[18px] lg:text-[20px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(avg)}</p>
          </div>
          <div className="hidden lg:block">
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">SHIFT AKTIF</p>
            <p className="font-serif text-[18px] lg:text-[20px] font-semibold text-cream-text">{SHIFT_LABELS[selectedShift]}</p>
          </div>
          <div className="ml-auto relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors border-0 rounded-[8px] px-3 py-2 cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              <span className="text-[11.5px] font-medium text-white">Export</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <span style={{ position: "absolute", top: -7, right: -2, background: "rgba(201,165,95,0.20)", border: "1px solid rgba(201,165,95,0.5)", color: "#C9A55F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>STD</span>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white border border-warm-border rounded-card shadow-xl py-1.5 min-w-[168px]">
                  <button onClick={() => { exportWhatsApp(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.406A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                    WhatsApp
                  </button>
                  <button onClick={() => { exportPDF(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E5534B" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                    PDF
                  </button>
                  <div style={{ height: 1, background: "#ECE7DD", margin: "4px 0" }} />
                  <button onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Method pills */}
        <div className="flex gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {[
            { key: "Semua",    count: periodSales.length },
            { key: "Tunai",    count: periodSales.filter(t => t.payment_method.toLowerCase() === "tunai").length },
            { key: "QRIS",     count: periodSales.filter(t => t.payment_method.toLowerCase() === "qris").length },
            { key: "Debit",    count: periodSales.filter(t => t.payment_method.toLowerCase() === "debit").length },
            { key: "Transfer", count: periodSales.filter(t => t.payment_method.toLowerCase() === "transfer").length },
          ].filter(m => m.key === "Semua" || m.count > 0).map(m => (
            <button key={m.key} onClick={() => setMethodFilter(m.key)}
              className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors cursor-pointer ${methodFilter === m.key ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
              {m.key} · {m.count}
            </button>
          ))}
        </div>

        {/* Table / Cards */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-3 pb-4 lg:pb-6">

          {loadingData && (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#B8B0A8", fontSize: 13 }}>Memuat data…</div>
          )}

          {!loadingData && filtered.length === 0 && (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p className="font-serif text-[20px] font-medium text-navy mb-2">Belum ada transaksi</p>
              <p style={{ fontSize: 13, color: "#7A776F" }}>Transaksi yang diselesaikan akan muncul di sini.</p>
            </div>
          )}

          {/* Desktop table */}
          {!loadingData && filtered.length > 0 && (
            <div className="hidden lg:block bg-white border border-warm-border rounded-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-border">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">NO. TRX</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Waktu</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Kasir</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Item</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Metode</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const m = methodLabel(t.payment_method);
                    const initials = (t.cashier_name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <tr key={t.id} className={`border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors cursor-pointer ${i === 0 ? "bg-gold-soft" : ""}`}>
                        <td className="px-5 py-3.5">
                          <span className="font-sans text-[12.5px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trx_id}</span>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>
                          <div>{fmtTime(t.created_at)}</div>
                          {activeFilter > 0 && <div style={{ fontSize: 10, color: "#B0A99A" }}>{fmtDate(t.created_at)}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cream-pill border border-warm-border flex items-center justify-center text-[9px] font-semibold text-navy">{initials}</span>
                            <span className="text-[12.5px] text-navy">{t.cashier_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-text-mute">{t.sale_items?.length ?? 0} item</td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${METHOD_COLOR[m] || "#7A776F"}14`, color: METHOD_COLOR[m] || "#7A776F" }}>{m}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          {!loadingData && filtered.length > 0 && (
            <div className="lg:hidden flex flex-col gap-2.5">
              {filtered.map(t => {
                const m = methodLabel(t.payment_method);
                return (
                  <div key={t.id} className="bg-white border border-warm-border rounded-card px-4 py-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-sans text-[13px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trx_id}</span>
                        <p className="text-[11px] text-text-mute mt-0.5">
                          {activeFilter > 0 && <span>{fmtDate(t.created_at)} · </span>}{fmtTime(t.created_at)} · {t.cashier_name} · {t.sale_items?.length ?? 0} item
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-[16px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${METHOD_COLOR[m] || "#7A776F"}14`, color: METHOD_COLOR[m] || "#7A776F" }}>{m}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
