import { useStore, getTotal } from "../store";
import { formatRp } from "../data";
import { Printer, MessageCircle, Plus, Check } from "lucide-react";

export default function Receipt() {
  const { cart, cashReceived, restart } = useStore();
  const total = getTotal(cart);
  const change = cashReceived - total;

  return (
    <div className="w-full h-full bg-cream-bg flex items-center justify-center p-8 animate-screen-in">
      <div className="w-full max-w-[580px] flex flex-col h-full">

        {/* Success header */}
        <div className="text-center mb-5 pt-2">
          <div className="w-[54px] h-[54px] rounded-full bg-navy flex items-center justify-center mx-auto mb-3.5">
            <Check size={24} strokeWidth={2.5} className="text-gold" />
          </div>
          <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-gold mb-1.5">BERHASIL · PAID</p>
          <h2 className="font-serif text-[30px] font-medium text-navy mb-1 leading-tight">Terima kasih, pelanggan</h2>
          <p className="text-[12.5px] text-text-mute">
            Kembalian <span className="font-serif font-semibold text-navy">Rp {change.toLocaleString("id-ID")}</span> · jangan lupa diberikan
          </p>
        </div>

        {/* Receipt card */}
        <div className="flex-1 bg-white border border-warm-border rounded-card px-[26px] py-6 flex flex-col min-h-0 overflow-auto">
          {/* Store header */}
          <div className="text-center pb-3.5 border-b border-dashed border-warm-dashed">
            <div className="w-8 h-8 mx-auto mb-2">
              <img src="/mark-navy-512.png" className="w-8 h-8 object-contain" alt="" />
            </div>
            <div className="font-serif text-[20px] font-semibold text-navy">Toko Sembako Maju</div>
            <div className="text-[10.5px] text-text-mute mt-1">Jl. Diponegoro No. 24, Palu Timur</div>
            <div className="text-[10.5px] text-text-mute">WhatsApp 0812-3456-7890</div>
          </div>

          {/* Meta */}
          <div className="flex justify-between font-mono text-[10.5px] text-text-mute py-2.5 border-b border-dashed border-warm-dashed">
            <div><div>#PLU-0427</div><div className="mt-0.5">24 Jun 2026 · 14:34</div></div>
            <div className="text-right"><div>Kasir: Ratna A.</div><div className="mt-0.5">Shift 2 (Siang)</div></div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-warm-dashed">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between mb-2">
                <div>
                  <div className="text-[11.5px] font-medium text-navy">{item.product.name}</div>
                  <div className="font-mono text-[10px] text-text-mute">{item.qty} × {item.product.price.toLocaleString("id-ID")}</div>
                </div>
                <div className="font-mono text-[11.5px] font-medium text-navy">{(item.product.price * item.qty).toLocaleString("id-ID")}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-warm-dashed">
            <div className="flex justify-between font-mono text-[11px] text-text-mute mb-1.5">
              <span>SUBTOTAL</span><span>{total.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px] text-text-mute mb-2.5">
              <span>DISKON</span><span>0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-[11px] font-semibold tracking-mono-tight text-navy">TOTAL</span>
              <span className="font-serif text-[24px] font-semibold text-navy leading-none">{formatRp(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="py-3">
            <div className="flex justify-between font-mono text-[11px] text-text-mute mb-1.5">
              <span>TUNAI</span><span>{cashReceived.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px] font-semibold text-navy">
              <span>KEMBALIAN</span><span>{change.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3.5 border-t border-dashed border-warm-dashed mt-auto">
            <div className="font-serif italic text-[14px] text-navy">Terima kasih, sampai jumpa lagi</div>
            <div className="font-mono text-[9px] text-text-mute mt-2 tracking-mono-default">POWERED BY PROSPERA POS</div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button className="bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy">
            <Printer size={17} strokeWidth={1.8} />
            <span className="text-[11px]">Cetak</span>
          </button>
          <button className="bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy">
            <MessageCircle size={17} strokeWidth={1.8} />
            <span className="text-[11px]">WhatsApp</span>
          </button>
          <button onClick={restart} className="bg-navy border-0 rounded-button py-3.5 flex flex-col items-center gap-1.5 text-cream-text">
            <Plus size={17} strokeWidth={1.8} className="text-gold" />
            <span className="text-[11px]">Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
