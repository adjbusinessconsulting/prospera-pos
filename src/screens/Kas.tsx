import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const SHIFT_LABEL: Record<1 | 2 | 3, string> = {
  1: "Shift 1 · Pagi (06:00–14:00)",
  2: "Shift 2 · Siang (14:00–22:00)",
  3: "Shift 3 · Malam (22:00–06:00)",
};

const PERGERAKAN = [
  { time: "14:28", type: "Penjualan",   desc: "TRX #0042 · Aerith D.",   amount: +89000,  },
  { time: "13:15", type: "Penjualan",   desc: "TRX #0041 · Stevany C.",  amount: +38000,  },
  { time: "12:47", type: "Penjualan",   desc: "TRX #0040 · Aerith D.",   amount: +152500, },
  { time: "11:30", type: "Penjualan",   desc: "TRX #0039 · Anthony D.",  amount: +43000,  },
  { time: "10:52", type: "Penjualan",   desc: "TRX #0038 · Stevany C.",  amount: +67000,  },
  { time: "09:00", type: "Modal Awal",  desc: "Dibuka oleh Anthony D.",   amount: +500000, },
];

const QUICK_ACTIONS = [
  { label: "Tarik Tunai",  icon: "↑", tier: "std" },
  { label: "Setoran",      icon: "↓", tier: "std" },
  { label: "Penyesuaian",  icon: "≈", tier: "std" },
  { label: "Pindah Shift", icon: "→", tier: null  },
];

export default function Kas() {
  const { cashierInitials, cashierName, selectedShift, setScreen, signOut } = useStore();

  const saldo = PERGERAKAN.reduce((s, p) => s + p.amount, 0);
  const penjualan = PERGERAKAN.filter(p => p.type === "Penjualan").reduce((s, p) => s + p.amount, 0);
  const modal = PERGERAKAN.filter(p => p.type === "Modal Awal").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="kas" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">

        {/* Left / main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <div className="px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">KEUANGAN · CASH DRAWER</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Kas & Saldo</h1>
            <p className="text-[12px] text-text-mute mt-1">{SHIFT_LABEL[selectedShift]} · {cashierName}</p>
          </div>

          {/* Saldo card */}
          <div className="mx-5 lg:mx-10 mt-5 bg-navy rounded-card px-7 py-6 shrink-0">
            <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-2">SALDO LACI KAS</p>
            <p className="font-serif text-[38px] lg:text-[44px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatRp(saldo)}
            </p>
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">MODAL AWAL</p>
                <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(modal)}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">PENJUALAN</p>
                <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(penjualan)}</p>
              </div>
            </div>
          </div>

          {/* Pergerakan */}
          <div className="px-5 lg:px-10 pt-5 pb-0 shrink-0">
            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">PERGERAKAN KAS</p>
          </div>
          <div className="flex-1 overflow-auto px-5 lg:px-10 pb-4 lg:pb-6">
            <div className="bg-white border border-warm-border rounded-card overflow-hidden">
              {PERGERAKAN.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < PERGERAKAN.length - 1 ? "border-b border-[#F2EDE3]" : ""}`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.amount > 0 ? "bg-success" : "bg-warning"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-navy">{p.type}</div>
                    <div className="text-[11px] text-text-mute">{p.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-serif text-[14px] font-semibold ${p.amount > 0 ? "text-success" : "text-warning"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {p.amount > 0 ? "+" : "−"}{formatRp(Math.abs(p.amount))}
                    </div>
                    <div className="text-[10.5px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{p.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: actions (desktop only) */}
        <div className="hidden lg:flex w-[320px] bg-white border-l border-warm-border flex-col px-7 py-7 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">AKSI CEPAT</p>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label}
                className="relative bg-cream-bg border border-warm-border rounded-card h-[68px] flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-navy/30 cursor-pointer">
                {a.tier && (
                  <span style={{ position: "absolute", top: 6, right: 8, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase" as const }}>
                    STD
                  </span>
                )}
                <span className="text-[20px] leading-none text-navy">{a.icon}</span>
                <span className="text-[11px] font-medium text-navy">{a.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-cream-bg border border-warm-border rounded-card px-4 py-4 mb-6">
            <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-1">FITUR PAKET STANDARD</p>
            <p className="text-[12px] text-text-mute leading-relaxed">Tarik Tunai, Setoran, dan Penyesuaian tersedia di paket Standard ke atas.</p>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-2.5">
            <button onClick={() => setScreen("login")} className="w-full bg-cream-bg border border-warm-border rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-navy hover:border-navy/30 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              Pindah Shift
            </button>
            <button className="w-full bg-navy rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-cream-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M18.36 6.64A9 9 0 015.64 19.36M6.16 17.84A9 9 0 0119.84 6.16M2 12h2M20 12h2M12 2v2M12 20v2"/></svg>
              Tutup Toko
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
