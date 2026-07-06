import { useStore } from "../store";
import { formatRp } from "../data";

export default function TutupToko() {
  const { signOut, setScreen } = useStore();

  const totalOmzet = 8450000;
  const totalTrx = 54;
  const totalShift = 3;
  const rataRata = Math.round(totalOmzet / totalTrx);

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-full h-full flex flex-col bg-cream-bg animate-screen-in overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 lg:px-8 py-3.5 lg:py-4 border-b border-warm-border shrink-0">
        <button onClick={() => setScreen("kas")}
          className="flex items-center gap-1.5 text-[12px] text-text-mute hover:text-navy transition-colors bg-transparent border-0 p-0 cursor-pointer shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          Batal
        </button>
        <div className="flex-1 text-center min-w-0">
          <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-gold leading-tight">TUTUP TOKO · END OF DAY</p>
          <p className="text-[11px] text-text-mute hidden lg:block mt-0.5">{dateStr}</p>
        </div>
        <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9, letterSpacing: "0.16em", fontWeight: 600, padding: "3px 8px", borderRadius: 9999, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>FREE</span>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:gap-6 px-6 lg:px-8 py-6 lg:py-8 overflow-auto min-h-0">

        {/* Left: summary + actions */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <div>
            <h1 className="font-serif text-[28px] lg:text-[32px] font-medium text-navy mb-1">Tutup Toko</h1>
            <p className="text-[13px] text-text-mute">Ringkasan hari ini sebelum logout. Data tersimpan di Riwayat (1 hari).</p>
          </div>

          {/* Navy omzet card */}
          <div className="bg-navy rounded-card px-7 py-7">
            <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-3">TOTAL OMZET HARI INI</p>
            <p className="font-serif text-[34px] lg:text-[52px] font-semibold text-cream-text leading-none mb-6" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatRp(totalOmzet)}
            </p>
            <div className="flex gap-8 pt-5 border-t border-white/10">
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TRANSAKSI</p>
                <p className="font-serif text-[24px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{totalTrx}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">SHIFT</p>
                <p className="font-serif text-[24px] font-semibold text-cream-text">{totalShift}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">RATA-RATA</p>
                <p className="font-serif text-[24px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>Rp {Math.round(rataRata / 1000)}k</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <button
                className="w-full bg-white border border-warm-border rounded-card h-[54px] flex items-center justify-center gap-2 text-[13px] font-semibold text-navy hover:border-navy/30 transition-colors cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                CETAK / EXPORT LAPORAN
              </button>
              <span style={{ position: "absolute", top: -8, right: 10, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>
                STANDARD
              </span>
            </div>
            <button onClick={signOut}
              className="flex-1 bg-navy rounded-card h-[54px] flex items-center justify-center gap-2.5 text-[13px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              TUTUP & LOGOUT
            </button>
          </div>

          <p className="text-[11px] text-text-mute">Setelah ditutup, layar kembali ke halaman login. Data hari ini disimpan selama 1 hari.</p>
        </div>

        {/* Right: STANDARD upgrade panel */}
        <div className="lg:w-[320px] shrink-0">
          <div className="bg-white border border-warm-border rounded-card px-6 py-6 relative">
            <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>
              STANDARD
            </span>
            <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-2">LAPORAN LENGKAP</p>
            <p className="text-[12.5px] text-text-mute mb-5 leading-relaxed">
              Tier Free menampilkan total omzet saja. <span className="text-navy font-medium">Standard</span> membuka rincian lengkap:
            </p>
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                "Rincian omzet per shift (Aerith, Stevany, Anthony)",
                "Rincian per metode bayar (Tunai, QRIS, Debit)",
                "Export laporan (PDF / CSV) untuk arsip",
                "Riwayat 1 bulan (bukan 1 hari)",
                "Foto bukti kas & WhatsApp struk",
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5">
                  <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  <span className="text-[12px] text-navy leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
            <button className="w-full bg-navy rounded-card h-[46px] flex items-center justify-center gap-2 text-[12.5px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0 mb-2">
              UPGRADE · MULAI Rp 25.000/BLN
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </button>
            <p className="text-center text-[10px] text-text-mute">Launch price · normal Rp 50.000/bln</p>
          </div>
        </div>
      </div>
    </div>
  );
}
