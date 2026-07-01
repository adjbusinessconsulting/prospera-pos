import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const SHIFT_LABEL: Record<1 | 2 | 3, string> = {
  1: "Shift 1 · Pagi",
  2: "Shift 2 · Siang",
  3: "Shift 3 · Malam",
};

const PERGERAKAN = [
  { time: "16:42", label: "18 trx tunai",       desc: "14:00–16:42 · otomatis dari penjualan",   amount: +2680000, icon: "auto"   },
  { time: "15:30", label: "Bayar parkir & retribusi", desc: "Aerith D. · operasional",            amount: -15000,   icon: "keluar" },
  { time: "14:48", label: "Beli es batu",        desc: "Aerith D. · supplier",                   amount: -100000,  icon: "keluar" },
  { time: "14:00", label: "Modal awal shift",    desc: "Dibuka oleh Anthony D. (owner)",         amount: +500000,  icon: "masuk"  },
];

const kasKeluar = PERGERAKAN.filter(p => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);
const kasMasuk = PERGERAKAN.filter(p => p.amount > 0 && p.icon !== "auto").reduce((s, p) => s + p.amount, 0);
const saldo = PERGERAKAN.reduce((s, p) => s + p.amount, 0);

export default function Kas() {
  const { cashierInitials, cashierName, selectedShift, setScreen, signOut } = useStore();

  const bukaTime = "14:00";

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN · UANG KAS</p>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight truncate">Uang Kas · {cashierName}</h1>
              <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#C9A55F" }} className="font-sans uppercase font-semibold mt-0.5">
                {SHIFT_LABEL[selectedShift]} · DIBUKA {bukaTime}
              </p>
            </div>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5">
              <button onClick={() => setScreen("riwayat")}
                className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Riwayat
              </button>
              <button className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text border-0">
                Kasir
              </button>
            </div>
          </div>
        </div>

        {/* Main content: two columns on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden">

          {/* Left column: saldo + actions (full on mobile, fixed-width on desktop) */}
          <div className="flex-1 lg:flex-none lg:w-[340px] flex flex-col gap-4 px-5 lg:px-10 pt-4 pb-4 lg:pb-0 overflow-auto">

            {/* Saldo card */}
            <div className="bg-navy rounded-card px-6 py-6">
              <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-2">SALDO LACI KAS</p>
              <p className="font-serif text-[38px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatRp(saldo)}
              </p>
              <p className="text-[11px] text-white/40 mt-1.5">Modal awal {formatRp(500000)} + omzet tunai</p>
              <div className="flex gap-5 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">MASUK</p>
                  <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>+ {formatRp(kasMasuk + 2680000)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">KELUAR</p>
                  <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>− {formatRp(kasKeluar)}</p>
                </div>
              </div>
            </div>

            {/* Kas Masuk / Kas Keluar */}
            <div className="flex gap-2.5">
              <button className="flex-1 bg-[#5C9E7E14] border border-[#5C9E7E40] rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#3D7A5E] hover:bg-[#5C9E7E20] transition-colors cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Kas Masuk
              </button>
              <button className="flex-1 bg-[#C25E3D14] border border-[#C25E3D40] rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#C25E3D] hover:bg-[#C25E3D20] transition-colors cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                Kas Keluar
              </button>
            </div>

            {/* Mobile: STANDARD foto banner + pergerakan */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed mb-3"
                style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
                <p className="text-[12px] text-navy">
                  <span className="font-semibold">Foto bukti kas</span>
                  <span className="text-text-mute"> tidak tersedia di Free · Upgrade Standard</span>
                </p>
                <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                  STANDARD
                </span>
              </div>

              <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-2.5">PERGERAKAN HARI INI</p>
              <div className="bg-white border border-warm-border rounded-card overflow-hidden">
                {PERGERAKAN.map((p, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3.5 ${i < PERGERAKAN.length - 1 ? "border-b border-[#F2EDE3]" : ""}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.amount > 0 ? "bg-[#5C9E7E20]" : "bg-[#C25E3D14]"}`}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={p.amount > 0 ? "#5C9E7E" : "#C25E3D"} strokeWidth="2.5">
                        {p.amount > 0 ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-navy">{p.label}</div>
                      <div className="text-[10.5px] text-text-mute mt-0.5">{p.time} · {p.desc}</div>
                    </div>
                    <span className={`font-serif text-[13px] font-semibold shrink-0 ${p.amount > 0 ? "text-[#5C9E7E]" : "text-[#C25E3D]"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {p.amount > 0 ? "+" : "−"}{formatRp(Math.abs(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: pergerakan (desktop only) */}
          <div className="hidden lg:flex flex-1 flex-col min-w-0 overflow-hidden pt-4 pb-0 pr-10">

            {/* STANDARD foto banner */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed mb-4 shrink-0"
              style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
              <div className="flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <p className="text-[12.5px] text-navy">
                  <span className="font-semibold">Foto bukti kas</span>
                  <span className="text-text-mute"> tidak tersedia di Free · Upgrade Standard untuk lampirkan bukti foto di setiap kas masuk/keluar.</span>
                </p>
              </div>
              <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                STANDARD
              </span>
            </div>

            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3 shrink-0">PERGERAKAN HARI INI</p>

            <div className="flex-1 overflow-auto">
              <div className="bg-white border border-warm-border rounded-card overflow-hidden">
                {PERGERAKAN.map((p, i) => (
                  <div key={i} className={`flex items-start gap-3 px-5 py-4 ${i < PERGERAKAN.length - 1 ? "border-b border-[#F2EDE3]" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.amount > 0 ? "bg-[#5C9E7E14]" : "bg-[#C25E3D14]"}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.amount > 0 ? "#5C9E7E" : "#C25E3D"} strokeWidth="2.5">
                        {p.amount > 0 ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-navy">{p.label}</div>
                      <div className="text-[11px] text-text-mute mt-0.5">{p.time} · {p.desc}</div>
                    </div>
                    <span className={`font-serif text-[15px] font-semibold shrink-0 ${p.amount > 0 ? "text-[#5C9E7E]" : "text-[#C25E3D]"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {p.amount > 0 ? "+" : "−"}{formatRp(Math.abs(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Pindah Shift + Tutup Toko */}
        <div className="flex gap-2.5 px-5 lg:px-10 py-4 shrink-0 border-t border-warm-border bg-cream-bg">
          <button onClick={() => setScreen("pindah-shift")}
            className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-navy hover:border-navy/40 transition-colors cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6" /></svg>
            Pindah Shift
          </button>
          <button onClick={() => setScreen("tutup-toko")}
            className="flex-1 bg-navy border-0 rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M18.36 6.64A9 9 0 115.64 19.36M2 12h2M20 12h2M12 2v2M12 20v2" /></svg>
            Tutup Toko
          </button>
        </div>
      </div>
    </div>
  );
}
