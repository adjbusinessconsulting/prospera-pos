import { useState } from "react";
import { useStore, isAtLeast } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const PERIOD_DATA = [
  {
    label: "TOTAL HARI INI",
    total: 629000, trx: 8, avg: 78625, items: 25,
    methods: [
      { method: "Tunai",     total: 436500, pct: 69, color: "#5C9E7E" },
      { method: "Transfer",  total: 75000,  pct: 12, color: "#C9A55F" },
      { method: "QRIS",      total: 49000,  pct: 8,  color: "#0B1129" },
      { method: "Debit",     total: 43000,  pct: 7,  color: "#7A776F" },
      { method: "E-Wallet",  total: 25500,  pct: 4,  color: "#C25E3D" },
    ],
    produk: [
      { emoji: "🌾", name: "Beras Pandan 5kg",  qty: 3,  total: 225000 },
      { emoji: "🍜", name: "Indomie Goreng",     qty: 12, total: 42000  },
      { emoji: "🥚", name: "Telur Ayam",         qty: 2,  total: 56000  },
      { emoji: "💧", name: "Aqua 600ml",         qty: 5,  total: 20000  },
      { emoji: "🫙", name: "Bimoli 2L",          qty: 1,  total: 38000  },
    ],
  },
  {
    label: "TOTAL KEMARIN",
    total: 404500, trx: 5, avg: 80900, items: 16,
    methods: [
      { method: "Tunai",  total: 283500, pct: 70, color: "#5C9E7E" },
      { method: "QRIS",   total: 92000,  pct: 23, color: "#0B1129" },
      { method: "Debit",  total: 29000,  pct: 7,  color: "#7A776F" },
    ],
    produk: [
      { emoji: "🍜", name: "Indomie Goreng",    qty: 18, total: 63000  },
      { emoji: "🌾", name: "Beras Pandan 5kg",  qty: 2,  total: 150000 },
      { emoji: "💧", name: "Aqua 600ml",        qty: 8,  total: 32000  },
      { emoji: "🥚", name: "Telur Ayam",        qty: 3,  total: 84000  },
      { emoji: "🧴", name: "Sunlight 750ml",    qty: 2,  total: 24000  },
    ],
  },
  {
    label: "TOTAL 7 HARI",
    total: 1753000, trx: 18, avg: 97389, items: 60,
    methods: [
      { method: "Tunai",    total: 1275500, pct: 73, color: "#5C9E7E" },
      { method: "QRIS",     total: 208500,  pct: 12, color: "#0B1129" },
      { method: "Debit",    total: 147000,  pct: 8,  color: "#7A776F" },
      { method: "Transfer", total: 122000,  pct: 7,  color: "#C9A55F" },
    ],
    produk: [
      { emoji: "🍜", name: "Indomie Goreng",    qty: 54, total: 189000 },
      { emoji: "🌾", name: "Beras Pandan 5kg",  qty: 8,  total: 600000 },
      { emoji: "💧", name: "Aqua 600ml",        qty: 30, total: 120000 },
      { emoji: "🥚", name: "Telur Ayam",        qty: 9,  total: 252000 },
      { emoji: "🫙", name: "Bimoli 2L",         qty: 5,  total: 190000 },
    ],
  },
  {
    label: "TOTAL 30 HARI",
    total: 2422500, trx: 23, avg: 105326, items: 80,
    methods: [
      { method: "Tunai",    total: 1795000, pct: 74, color: "#5C9E7E" },
      { method: "QRIS",     total: 267500,  pct: 11, color: "#0B1129" },
      { method: "Debit",    total: 238000,  pct: 10, color: "#7A776F" },
      { method: "Transfer", total: 122000,  pct: 5,  color: "#C9A55F" },
    ],
    produk: [
      { emoji: "🍜", name: "Indomie Goreng",    qty: 86, total: 301000 },
      { emoji: "🌾", name: "Beras Pandan 5kg",  qty: 14, total: 1050000 },
      { emoji: "💧", name: "Aqua 600ml",        qty: 55, total: 220000 },
      { emoji: "🥚", name: "Telur Ayam",        qty: 18, total: 504000 },
      { emoji: "🧴", name: "Sunlight 750ml",    qty: 11, total: 132000 },
    ],
  },
];

const FILTER_LABELS = [
  { label: "Hari ini", tier: null as string | null },
  { label: "Kemarin",  tier: null },
  { label: "7 hari",   tier: "STD" },
  { label: "30 hari",  tier: "STD" },
];

export default function Laporan() {
  const { cashierInitials, storeId, storeTier, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : 'premium';
  const canFullBreakdown = isAtLeast(effectiveTier, 'standard');
  const [activeFilter, setActiveFilter] = useState(0);

  const d = PERIOD_DATA[activeFilter];

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="laporan" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-end px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">ANALITIK · REPORTS</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Laporan Penjualan</h1>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 lg:px-10 pt-4 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTER_LABELS.map((f, i) => {
            const locked = !!f.tier && !canFullBreakdown;
            return (
              <div key={f.label} className="relative shrink-0">
                <button
                  onClick={() => { if (!locked) setActiveFilter(i); }}
                  className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"} ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                  {f.label}
                </button>
                {f.tier && (
                  <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>
                    {f.tier}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-4 lg:pb-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: d.label,       value: formatRp(d.total), accent: true },
              { label: "TRANSAKSI",   value: `${d.trx} trx`,    accent: false },
              { label: "RATA-RATA",   value: formatRp(d.avg),   accent: false },
              { label: "ITEM TERJUAL", value: `${d.items} pcs`, accent: false },
            ].map(card => (
              <div key={card.label} className={`rounded-card px-5 py-4 ${card.accent ? "bg-navy" : "bg-white border border-warm-border"}`}>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className={`font-sans uppercase mb-1 ${card.accent ? "text-gold/70" : "text-text-mute"}`}>{card.label}</p>
                <p className={`font-serif text-[20px] font-semibold leading-tight ${card.accent ? "text-cream-text" : "text-navy"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Two columns on desktop */}
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Breakdown by method */}
            <div className="flex-1 bg-white border border-warm-border rounded-card px-6 py-5">
              <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">BREAKDOWN METODE</p>
              <div className="flex flex-col gap-3">
                {d.methods.map(m => (
                  <div key={m.method}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[12.5px] font-medium text-navy">{m.method}</span>
                      <span className="text-[12px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(m.total)} · {m.pct}%</span>
                    </div>
                    <div className="h-[6px] bg-cream-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className="flex-1 bg-white border border-warm-border rounded-card px-6 py-5 relative">
              {!canFullBreakdown && (
                <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 8, letterSpacing: "0.12em", fontWeight: 600, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" as const }}>STANDARD</span>
              )}
              <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">PRODUK TERLARIS</p>
              {canFullBreakdown ? (
                <div className="flex flex-col gap-3">
                  {d.produk.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-[12px] font-semibold text-text-mute w-4 shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                      <span className="text-[18px] leading-none shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-navy">{p.name}</div>
                        <div className="text-[11px] text-text-mute">{p.qty} terjual</div>
                      </div>
                      <span className="font-serif text-[13px] font-semibold text-navy shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4C9B8" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <p className="text-[12px] text-text-mute text-center">Produk terlaris tersedia di<br /><span className="font-semibold text-navy">Standard</span> ke atas.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart — STANDARD tier */}
          <div className={`mt-4 bg-white border border-warm-border rounded-card px-6 py-5 relative ${!canFullBreakdown ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 8, letterSpacing: "0.12em", fontWeight: 600, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" as const }}>
              STANDARD
            </span>
            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">GRAFIK PENJUALAN PER JAM</p>
            <div className="h-[80px] flex items-end gap-1.5">
              {[20, 35, 55, 80, 95, 70, 60, 85, 100, 75, 50, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-navy/20 rounded-t-sm transition-all hover:bg-navy/40" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {["06", "08", "10", "12", "13", "14", "15", "16", "17", "18", "19", "20"].map(h => (
                <span key={h} style={{ fontSize: 8, color: "#B0A99A" }} className="flex-1 text-center">{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
