import { useStore, getTotal, getTrxId } from "../store";
import { formatRp } from "../data";
import { Printer, Plus, Check, ChevronLeft } from "lucide-react";

function SterithWatermark() {
  return (
    <div style={{ background: "#FAFAF7", border: "1px solid #ECE7DD", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/mark-gold-512.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", color: "#0B1129", lineHeight: 1 }}>STERITH POS</div>
        <div style={{ fontVariantNumeric: "tabular-nums", fontFamily: "Inter, system-ui, sans-serif", fontSize: 7, letterSpacing: "0.14em", color: "#7A776F", marginTop: 3, textTransform: "uppercase", lineHeight: 1 }}>UPGRADE STANDARD UNTUK CUSTOM BRANDING</div>
      </div>
    </div>
  );
}

export default function Receipt() {
  const { cart, cashReceived, cashierName, selectedShift, trxCounter, restart, setScreen } = useStore();
  const total = getTotal(cart);
  const change = cashReceived - total;
  const trxId = getTrxId(trxCounter);

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const SHIFT_LABELS: Record<1 | 2 | 3, string> = { 1: "Shift 1 (Pagi)", 2: "Shift 2 (Siang)", 3: "Shift 3 (Malam)" };

  return (
    <div className="w-full h-full bg-cream-bg flex items-center justify-center p-8 animate-screen-in">
      <div className="w-full max-w-[580px] flex flex-col h-full">

        {/* Demo back button */}
        <div className="mb-3">
          <button onClick={() => setScreen("payment")} className="flex items-center gap-1.5 text-[12px] text-text-mute bg-transparent border-0 p-0 hover:text-navy transition-colors">
            <ChevronLeft size={14} strokeWidth={1.8} />
            Kembali ke pembayaran
          </button>
        </div>

        {/* Success header */}
        <div className="text-center mb-5 pt-2">
          <div className="w-[54px] h-[54px] rounded-full bg-navy flex items-center justify-center mx-auto mb-3.5">
            <Check size={24} strokeWidth={2.5} className="text-gold" />
          </div>
          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.22em] uppercase text-gold mb-1.5">BERHASIL · PAID</p>
          <h2 className="font-serif text-[30px] font-medium text-navy mb-1 leading-tight">Terima kasih, pelanggan</h2>
          <p className="text-[12.5px] text-text-mute">
            Kembalian <span className="font-serif font-semibold text-navy">{formatRp(change)}</span> · jangan lupa diberikan
          </p>
        </div>

        {/* Receipt card */}
        <div className="flex-1 bg-white border border-warm-border rounded-card px-[26px] py-6 flex flex-col min-h-0 overflow-auto">
          {/* Store header */}
          <div className="text-center pb-3.5 border-b border-dashed border-warm-dashed">
            <div className="font-serif text-[20px] font-semibold text-navy">Toko Sembako Maju</div>
            <div className="text-[10.5px] text-text-mute mt-1">Jl. Diponegoro No. 24, Palu Timur</div>
            <div className="text-[10.5px] text-text-mute">WhatsApp 0812-3456-7890</div>
          </div>

          {/* Meta */}
          <div className="flex justify-between font-sans text-[10.5px] text-text-mute py-2.5 border-b border-dashed border-warm-dashed" style={{ fontVariantNumeric: "tabular-nums" }}>
            <div><div>{trxId}</div><div className="mt-0.5">{dateStr} · {timeStr}</div></div>
            <div className="text-right"><div>Kasir: {cashierName}</div><div className="mt-0.5">{SHIFT_LABELS[selectedShift]}</div></div>
          </div>

          {/* Items */}
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

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-warm-dashed">
            <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span>SUBTOTAL</span><span>{total.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-sans text-[11px] text-text-mute mb-2.5" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span>DISKON</span><span>0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-[11px] font-semibold tracking-[0.05em] text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>TOTAL</span>
              <span className="font-serif text-[24px] font-semibold text-navy leading-none">{formatRp(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="py-3">
            <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span>TUNAI</span><span>{cashReceived.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-sans text-[11px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span>KEMBALIAN</span><span>{change.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Sterith watermark */}
          <div className="pt-3.5 border-t border-dashed border-warm-dashed mt-auto">
            <div className="font-serif italic text-[13px] text-navy text-center mb-3">Terima kasih, sampai jumpa lagi</div>
            <SterithWatermark />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button className="bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy">
            <Printer size={17} strokeWidth={1.8} />
            <span className="text-[11px]">Cetak</span>
          </button>

          {/* WhatsApp — locked with STANDARD tag */}
          <div className="relative">
            <button className="w-full bg-white rounded-button py-3.5 flex flex-col items-center gap-1.5 text-text-mute cursor-not-allowed"
              style={{ border: "1.5px dashed #C9A55F", opacity: 0.7 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
              <span className="text-[11px]">WhatsApp</span>
            </button>
            <span style={{ fontVariantNumeric: "tabular-nums", background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, lineHeight: 1, position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
              STANDARD
            </span>
          </div>

          <button onClick={restart} className="bg-navy border-0 rounded-button py-3.5 flex flex-col items-center gap-1.5 text-cream-text">
            <Plus size={17} strokeWidth={1.8} className="text-gold" />
            <span className="text-[11px]">Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
