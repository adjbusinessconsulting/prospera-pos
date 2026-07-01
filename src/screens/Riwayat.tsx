import { useState } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const TODAY = [
  { trxId: "#TRX-0042", date: "Hari ini",   time: "14:32", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 89000,  method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0041", date: "Hari ini",   time: "13:15", cashier: "ST", cashierName: "Stevany C.",  items: 1, total: 38000,  method: "QRIS",     shift: 2 },
  { trxId: "#TRX-0040", date: "Hari ini",   time: "12:47", cashier: "AE", cashierName: "Aerith D.",   items: 5, total: 152500, method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0039", date: "Hari ini",   time: "11:30", cashier: "AN", cashierName: "Anthony D.",  items: 2, total: 43000,  method: "Debit",    shift: 1 },
  { trxId: "#TRX-0038", date: "Hari ini",   time: "10:52", cashier: "ST", cashierName: "Stevany C.",  items: 4, total: 67000,  method: "Tunai",    shift: 1 },
  { trxId: "#TRX-0037", date: "Hari ini",   time: "10:21", cashier: "AE", cashierName: "Aerith D.",   items: 2, total: 11000,  method: "QRIS",     shift: 1 },
  { trxId: "#TRX-0036", date: "Hari ini",   time: "09:44", cashier: "AN", cashierName: "Anthony D.",  items: 7, total: 228500, method: "Tunai",    shift: 1 },
  { trxId: "#TRX-0035", date: "Hari ini",   time: "09:10", cashier: "AE", cashierName: "Aerith D.",   items: 1, total: 75000,  method: "Transfer", shift: 1 },
];

const YESTERDAY = [
  { trxId: "#TRX-0034", date: "Kemarin",    time: "16:05", cashier: "ST", cashierName: "Stevany C.",  items: 3, total: 54000,  method: "QRIS",     shift: 2 },
  { trxId: "#TRX-0033", date: "Kemarin",    time: "14:20", cashier: "AE", cashierName: "Aerith D.",   items: 6, total: 187000, method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0032", date: "Kemarin",    time: "12:08", cashier: "AN", cashierName: "Anthony D.",  items: 2, total: 29000,  method: "Debit",    shift: 1 },
  { trxId: "#TRX-0031", date: "Kemarin",    time: "10:44", cashier: "AE", cashierName: "Aerith D.",   items: 4, total: 96500,  method: "Tunai",    shift: 1 },
  { trxId: "#TRX-0030", date: "Kemarin",    time: "09:30", cashier: "ST", cashierName: "Stevany C.",  items: 1, total: 38000,  method: "QRIS",     shift: 1 },
];

const WEEK_EXTRA = [
  { trxId: "#TRX-0029", date: "2 hari lalu", time: "15:11", cashier: "AN", cashierName: "Anthony D.",  items: 5, total: 143000, method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0028", date: "2 hari lalu", time: "11:33", cashier: "AE", cashierName: "Aerith D.",   items: 2, total: 47000,  method: "Transfer", shift: 1 },
  { trxId: "#TRX-0027", date: "3 hari lalu", time: "13:45", cashier: "ST", cashierName: "Stevany C.",  items: 8, total: 312000, method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0026", date: "4 hari lalu", time: "10:20", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 67500,  method: "QRIS",     shift: 1 },
  { trxId: "#TRX-0025", date: "5 hari lalu", time: "09:55", cashier: "AN", cashierName: "Anthony D.",  items: 1, total: 75000,  method: "Debit",    shift: 1 },
];

const MONTH_EXTRA = [
  { trxId: "#TRX-0024", date: "8 hari lalu",  time: "14:00", cashier: "AE", cashierName: "Aerith D.",   items: 4, total: 128000, method: "Tunai",    shift: 2 },
  { trxId: "#TRX-0023", date: "10 hari lalu", time: "11:20", cashier: "ST", cashierName: "Stevany C.",  items: 2, total: 59000,  method: "QRIS",     shift: 1 },
  { trxId: "#TRX-0022", date: "14 hari lalu", time: "10:05", cashier: "AN", cashierName: "Anthony D.",  items: 6, total: 215500, method: "Tunai",    shift: 1 },
  { trxId: "#TRX-0021", date: "20 hari lalu", time: "15:30", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 91000,  method: "Debit",    shift: 2 },
  { trxId: "#TRX-0020", date: "25 hari lalu", time: "09:15", cashier: "ST", cashierName: "Stevany C.",  items: 5, total: 176000, method: "Tunai",    shift: 1 },
];

const FILTER_DATA = [
  TODAY,
  YESTERDAY,
  [...TODAY, ...YESTERDAY, ...WEEK_EXTRA],
  [...TODAY, ...YESTERDAY, ...WEEK_EXTRA, ...MONTH_EXTRA],
];

const FILTER_LABELS = [
  { label: "Hari ini", tier: null as string | null },
  { label: "Kemarin",  tier: "STD" },
  { label: "7 hari",   tier: "STD" },
  { label: "30 hari",  tier: "STD" },
];

const SHIFT_LABELS: Record<1 | 2 | 3, string> = { 1: "Shift 1 · Pagi", 2: "Shift 2 · Siang", 3: "Shift 3 · Malam" };

const METHOD_COLOR: Record<string, string> = {
  Tunai: "#5C9E7E", QRIS: "#0B1129", Debit: "#7A776F", Transfer: "#7A776F",
};

export default function Riwayat() {
  const { cashierInitials, selectedShift, setScreen, signOut } = useStore();
  const [activeFilter, setActiveFilter] = useState(0);
  const [methodFilter, setMethodFilter] = useState("Semua");
  const [shiftFilter, setShiftFilter] = useState("Semua");
  const [kasirFilter, setKasirFilter] = useState("Semua");

  const trxAll = FILTER_DATA[activeFilter];

  const filtered = trxAll.filter(t => {
    const matchMethod = methodFilter === "Semua" || t.method === methodFilter;
    const matchShift = shiftFilter === "Semua" || t.shift === parseInt(shiftFilter);
    const matchKasir = kasirFilter === "Semua" || t.cashier === kasirFilter;
    return matchMethod && matchShift && matchKasir;
  });

  const total = filtered.reduce((s, t) => s + t.total, 0);
  const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

  const tunaiCount = trxAll.filter(t => t.method === "Tunai").length;
  const qrisCount = trxAll.filter(t => t.method === "QRIS").length;

  const now = new Date();
  const hoursLeft = 23 - now.getHours();
  const minsLeft = 59 - now.getMinutes();

  const selectStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #ECE7DD",
    borderRadius: 8,
    padding: "6px 32px 6px 10px",
    fontSize: 12,
    color: "#0B1129",
    appearance: "none" as const,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex items-end justify-between">
            <h1 className="font-serif text-display-l font-medium text-navy">Performa toko</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 mb-1">
              <button className="px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text transition-colors">
                Riwayat
              </button>
              <button onClick={() => setScreen("kas")}
                className="px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Kasir
              </button>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0">
          {FILTER_LABELS.map((f, i) => (
            <div key={f.label} className="relative">
              <button onClick={() => setActiveFilter(i)}
                className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40 cursor-pointer"}`}>
                {f.label}
              </button>
              {f.tier && (
                <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>
                  {f.tier}
                </span>
              )}
            </div>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
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
                <option value="AE">Aerith D.</option>
                <option value="ST">Stevany C.</option>
                <option value="AN">Anthony D.</option>
              </select>
              <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        {/* FREE expiry banner */}
        {activeFilter === 0 && (
          <div className="mx-5 lg:mx-10 mt-3 shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed"
            style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <p className="text-[12px] text-navy">
                <span className="font-semibold">Free tier</span> — riwayat 1 hari.
                <span className="text-text-mute"> Transaksi hari ini hilang setelah {hoursLeft}j {minsLeft}m. Upgrade Standard untuk simpan 3 hari.</span>
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
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors border-0 rounded-[8px] px-3 py-2 cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              <span className="text-[11.5px] font-medium text-white">Export</span>
            </button>
            <span style={{ position: "absolute", top: -7, right: -2, background: "rgba(201,165,95,0.20)", border: "1px solid rgba(201,165,95,0.5)", color: "#C9A55F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>
              STD
            </span>
          </div>
        </div>

        {/* Method pills */}
        <div className="flex gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {[
            { key: "Semua",  count: trxAll.length },
            { key: "Tunai",  count: tunaiCount },
            { key: "QRIS",   count: qrisCount },
            { key: "Debit",  count: trxAll.filter(t => t.method === "Debit").length },
          ].map(m => (
            <button key={m.key} onClick={() => setMethodFilter(m.key)}
              className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors cursor-pointer ${methodFilter === m.key ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
              {m.key} · {m.count}
            </button>
          ))}
        </div>

        {/* Desktop table / Mobile cards */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-3 pb-4 lg:pb-6">

          {/* Desktop: table */}
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
                {filtered.map((t, i) => (
                  <tr key={t.trxId} className={`border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors cursor-pointer ${i === 0 ? "bg-gold-soft" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-sans text-[12.5px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trxId}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <div>{t.time}</div>
                      {activeFilter > 0 && <div style={{ fontSize: 10, color: "#B0A99A" }}>{t.date}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cream-pill border border-warm-border flex items-center justify-center text-[9px] font-semibold text-navy">{t.cashier}</span>
                        <span className="text-[12.5px] text-navy">{t.cashierName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-text-mute">{t.items} item</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${METHOD_COLOR[t.method] || "#7A776F"}14`, color: METHOD_COLOR[t.method] || "#7A776F" }}>{t.method}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="lg:hidden flex flex-col gap-2.5">
            {filtered.map(t => (
              <div key={t.trxId} className="bg-white border border-warm-border rounded-card px-4 py-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-sans text-[13px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trxId}</span>
                    <p className="text-[11px] text-text-mute mt-0.5">
                      {activeFilter > 0 && <span>{t.date} · </span>}{t.time} · {t.cashierName} · {t.items} item
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-[16px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${METHOD_COLOR[t.method] || "#7A776F"}14`, color: METHOD_COLOR[t.method] || "#7A776F" }}>{t.method}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
