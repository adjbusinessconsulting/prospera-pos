import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar, MobileBottomNav } from "../components/AppSidebar";

const SUMMARY = {
  totalHariIni: 629000,
  jumlahTrx: 8,
  rataRata: 78625,
  itemTerjual: 25,
};

const BY_METHOD = [
  { method: "Tunai",    total: 436500, pct: 69, color: "#5C9E7E" },
  { method: "QRIS",    total: 49000,  pct: 8,  color: "#0B1129" },
  { method: "Debit",   total: 43000,  pct: 7,  color: "#7A776F" },
  { method: "Transfer", total: 75000,  pct: 12, color: "#C9A55F" },
  { method: "E-Wallet", total: 25500,  pct: 4,  color: "#C25E3D" },
];

const TOP_PRODUK = [
  { emoji: "🌾", name: "Beras Pandan 5kg", qty: 3, total: 225000 },
  { emoji: "🍜", name: "Indomie Goreng",   qty: 12, total: 42000  },
  { emoji: "🥚", name: "Telur Ayam",       qty: 2,  total: 56000  },
  { emoji: "💧", name: "Aqua 600ml",       qty: 5,  total: 20000  },
  { emoji: "🫙", name: "Bimoli 2L",        qty: 1,  total: 38000  },
];

const FILTERS = ["Hari ini", "Kemarin", "7 hari", "30 hari"];

export default function Laporan() {
  const { cashierInitials, setScreen, signOut } = useStore();

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="laporan" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-end px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">ANALITIK · REPORTS</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Laporan Penjualan</h1>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 lg:px-10 pt-4 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f, i) => (
            <button key={f}
              className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${i === 0 ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-[70px] lg:pb-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: "TOTAL PENJUALAN", value: formatRp(SUMMARY.totalHariIni), accent: true },
              { label: "TRANSAKSI",       value: `${SUMMARY.jumlahTrx} trx`,      accent: false },
              { label: "RATA-RATA",       value: formatRp(SUMMARY.rataRata),      accent: false },
              { label: "ITEM TERJUAL",    value: `${SUMMARY.itemTerjual} pcs`,    accent: false },
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
                {BY_METHOD.map(m => (
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
            <div className="flex-1 bg-white border border-warm-border rounded-card px-6 py-5">
              <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">PRODUK TERLARIS</p>
              <div className="flex flex-col gap-3">
                {TOP_PRODUK.map((p, i) => (
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
            </div>
          </div>

          {/* Locked chart */}
          <div className="mt-4 bg-white border rounded-card px-6 py-5 relative"
            style={{ border: "1.5px dashed rgba(201,165,95,0.55)", opacity: 0.8 }}>
            <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 8, letterSpacing: "0.12em", fontWeight: 600, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" as const }}>
              STANDARD
            </span>
            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">GRAFIK PENJUALAN PER JAM</p>
            <div className="h-[80px] flex items-end gap-1.5">
              {[20, 35, 55, 80, 95, 70, 60, 85, 100, 75, 50, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-gold/20 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-card" style={{ background: "rgba(250,250,247,0.5)" }}>
              <p className="text-[12px] text-text-mute font-medium">Upgrade ke STANDARD untuk melihat grafik lengkap</p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav active="laporan" setScreen={setScreen} />
    </div>
  );
}
