import { useStore, getTotal, getTrxId } from "../store";
import { formatRp } from "../data";
import { Printer, Check, ChevronLeft } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";

function SterithWatermark() {
  return (
    <div style={{ background: "#FAFAF7", border: "1px solid #ECE7DD", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/mark-gold-512.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", color: "#0B1129", lineHeight: 1 }}>STERITH POS</div>
        <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 7, letterSpacing: "0.14em", color: "#A6843F", marginTop: 3, textTransform: "uppercase", lineHeight: 1 }}>CUSTOM BRANDING · PAKET STANDARD</div>
      </div>
    </div>
  );
}

export default function Receipt() {
  const { cart, cashReceived, cashierName, cashierInitials, selectedShift, trxCounter, restart, setScreen, signOut } = useStore();
  const total = getTotal(cart);
  const change = cashReceived - total;
  const trxId = getTrxId(trxCounter);
  const nextTrxId = getTrxId(trxCounter + 1);

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const SHIFT_LABELS: Record<1 | 2 | 3, string> = { 1: "Shift 1 (Pagi)", 2: "Shift 2 (Siang)", 3: "Shift 3 (Malam)" };

  const waText = encodeURIComponent(
    `*Struk dari Toko Sembako Maju*\nNo: ${trxId}\nTanggal: ${dateStr} ${timeStr}\n\n` +
    cart.map(i => `${i.product.name} x${i.qty}  ${formatRp(i.product.price * i.qty)}`).join("\n") +
    `\n\nTotal: ${formatRp(total)}\nTerima kasih!`
  );

  return (
    <div className="w-full h-full bg-cream-bg flex animate-screen-in">
      <AppSidebar active="sales" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* Two-column area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: receipt */}
        <div className="flex-1 flex flex-col min-w-0 px-6 lg:px-10 py-5 lg:py-7 overflow-auto">

          <button onClick={() => setScreen("payment")}
            className="flex items-center gap-1.5 text-[12px] text-text-mute bg-transparent border-0 p-0 hover:text-navy transition-colors mb-5 self-start cursor-pointer">
            <ChevronLeft size={14} strokeWidth={1.8} />
            Kembali ke pembayaran
          </button>

          {/* Success header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[46px] h-[46px] rounded-full bg-navy flex items-center justify-center shrink-0">
              <Check size={20} strokeWidth={2.5} className="text-gold" />
            </div>
            <div>
              <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold mb-0.5">BERHASIL · PAID</p>
              <h2 className="font-serif text-[22px] lg:text-[26px] font-medium text-navy leading-tight">Terima kasih, pelanggan</h2>
            </div>
          </div>

          {/* Mobile: Kembalian */}
          <div className="lg:hidden bg-navy rounded-card px-5 py-5 mb-5">
            <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-gold/70 mb-1">KEMBALIAN</p>
            <p className="font-serif text-[36px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(change)}</p>
            <p className="text-[11px] text-white/40 mt-1.5">dari {formatRp(cashReceived)} diterima</p>
          </div>

          {/* Thermal receipt card */}
          <div className="bg-white border border-warm-border rounded-card px-[26px] py-6 flex flex-col w-full max-w-[460px]">

            <div className="text-center pb-3.5 border-b border-dashed border-warm-dashed">
              <div className="font-serif text-[20px] font-semibold text-navy">Toko Sembako Maju</div>
              <div className="text-[10.5px] text-text-mute mt-1">Jl. Diponegoro No. 24, Palu Timur</div>
              <div className="text-[10.5px] text-text-mute">WhatsApp 0812-3456-7890</div>
            </div>

            <div className="flex justify-between font-sans text-[10.5px] text-text-mute py-2.5 border-b border-dashed border-warm-dashed" style={{ fontVariantNumeric: "tabular-nums" }}>
              <div><div>{trxId}</div><div className="mt-0.5">{dateStr} · {timeStr}</div></div>
              <div className="text-right"><div>Kasir: {cashierName}</div><div className="mt-0.5">{SHIFT_LABELS[selectedShift]}</div></div>
            </div>

            <div className="py-3 border-b border-dashed border-warm-dashed">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between mb-2">
                  <div>
                    <div className="text-[11.5px] font-medium text-navy">{item.product.name}</div>
                    <div className="font-sans text-[10px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{item.qty} × {item.product.price.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="font-sans text-[11.5px] font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{(item.product.price * item.qty).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-dashed border-warm-dashed">
              <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>SUBTOTAL</span><span>{total.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-sans text-[11px] text-text-mute mb-2.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>DISKON</span><span>0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-[11px] font-semibold tracking-[0.05em] text-navy">TOTAL</span>
                <span className="font-serif text-[24px] font-semibold text-navy leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
              </div>
            </div>

            <div className="py-3">
              <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>TUNAI</span><span>{cashReceived.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-sans text-[11px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>KEMBALIAN</span><span>{change.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="pt-3.5 border-t border-dashed border-warm-dashed mt-auto">
              <div className="font-serif italic text-[13px] text-navy text-center mb-3">Terima kasih, sampai jumpa lagi</div>
              <SterithWatermark />
            </div>
          </div>

          {/* Mobile actions */}
          <div className="lg:hidden grid grid-cols-2 gap-2.5 mt-5">
            <button className="bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy cursor-pointer">
              <Printer size={17} strokeWidth={1.8} />
              <span className="text-[11px]">Cetak struk</span>
            </button>
            <div className="relative">
              <button onClick={() => window.open(`https://wa.me/?text=${waText}`, "_blank")}
                className="w-full bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy hover:border-navy/30 transition-colors cursor-pointer">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                <span className="text-[11px]">WhatsApp</span>
              </button>
              <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                STANDARD
              </span>
            </div>
          </div>
        </div>

        {/* Right panel: desktop only */}
        <div className="hidden lg:flex w-[300px] bg-white border-l border-warm-border flex-col px-7 py-7 shrink-0">

          {/* Kembalian */}
          <div className="bg-navy rounded-card px-5 py-6 mb-6">
            <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-gold/70 mb-2">KEMBALIAN</p>
            <p className="font-serif text-[38px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(change)}</p>
            <p className="text-[11px] text-white/40 mt-2" style={{ fontVariantNumeric: "tabular-nums" }}>dari {formatRp(cashReceived)} diterima</p>
          </div>

          <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-3">TINDAKAN</p>
          <div className="flex flex-col gap-2 mb-auto">
            <button className="flex items-center gap-3 bg-cream-bg border border-warm-border rounded-card px-4 py-3.5 text-[13px] font-medium text-navy hover:border-navy/30 transition-colors cursor-pointer w-full">
              <Printer size={15} strokeWidth={1.8} className="shrink-0" />
              Cetak struk
            </button>

            <div className="relative">
              <button onClick={() => window.open(`https://wa.me/?text=${waText}`, "_blank")}
                className="w-full flex items-center gap-3 bg-cream-bg border border-warm-border rounded-card px-4 py-3.5 text-[13px] font-medium text-navy hover:border-navy/30 transition-colors cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                Kirim via WhatsApp
              </button>
              <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, position: "absolute", top: -7, right: 10, whiteSpace: "nowrap" }}>
                STANDARD
              </span>
            </div>
          </div>

          <p className="text-[11px] text-text-mute text-center mt-6">Struk tersimpan di Riwayat</p>
        </div>
      </div>

      {/* Bottom: full-width Transaksi Baru */}
      <div className="px-6 lg:px-8 pb-6 lg:pb-8 pt-3 shrink-0">
        <button onClick={restart}
          className="w-full bg-navy rounded-card h-[54px] flex items-center justify-center gap-3 text-[14px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          TRANSAKSI BARU — {nextTrxId}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </button>
      </div>

      </div>
    </div>
  );
}
