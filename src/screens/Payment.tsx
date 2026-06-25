import { useStore, getTotal, getItemCount } from "../store";
import { formatRp } from "../data";

const METHODS = [
  { id: "tunai",    label: "Tunai",         sub: "Cash · paling umum",              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
  { id: "qris",     label: "QRIS",          sub: "Scan & bayar · semua bank/e-wallet", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3v1M17 17v4"/></svg> },
  { id: "debit",    label: "Debit / Kartu", sub: "EDC mesin · BCA, Mandiri, BRI",   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg> },
  { id: "transfer", label: "Transfer Bank", sub: "BCA · BRI · Mandiri · BNI",       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg> },
  { id: "ewallet",  label: "E-Wallet",      sub: "GoPay · OVO · DANA · ShopeePay", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg> },
  { id: "hutang",   label: "Hutang / Bon",  sub: "Bayar nanti · perlu data pelanggan", badge: "UMKM", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/></svg> },
];

const QUICK = [50000, 100000, 200000, 300000, 500000];

export default function Payment() {
  const { cart, paymentMethod, cashReceived, setPaymentMethod, setCashReceived, setScreen } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);
  const change = cashReceived - total;

  return (
    <div className="w-full h-full flex animate-screen-in">
      {/* Order summary */}
      <div className="w-[480px] bg-white border-r border-warm-border flex flex-col shrink-0 p-8 overflow-hidden">
        <button onClick={() => setScreen("sales")} className="flex items-center gap-2 text-[12px] text-text-mute mb-6 bg-transparent border-0 p-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Kembali ke keranjang
        </button>
        <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-text-mute mb-1.5">RINCIAN · ORDER SUMMARY</p>
        <h2 className="font-serif text-[30px] font-medium text-navy mb-1 leading-tight">Transaksi #PLU-0427</h2>
        <p className="text-[12px] text-text-mute mb-7">{itemCount} item · Ratna A. · 14:34, 24 Jun 2026</p>
        <div className="flex-1 overflow-auto">
          {cart.map(item => (
            <div key={item.product.id} className="flex justify-between py-2.5 border-b border-[#F2EDE3]">
              <div>
                <div className="text-[13px] font-medium text-navy">{item.product.name}</div>
                <div className="font-mono text-[10.5px] text-text-mute mt-0.5">{item.qty} × {item.product.price.toLocaleString("id-ID")}</div>
              </div>
              <div className="font-mono text-[13px] font-medium text-navy">{(item.product.price * item.qty).toLocaleString("id-ID")}</div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-warm-border mt-4">
          <div className="flex justify-between text-[12.5px] text-text-mute mb-1.5">
            <span>Subtotal</span><span className="font-mono">Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-text-mute mb-3.5">
            <span>Diskon</span><span className="font-mono">− Rp 0</span>
          </div>
          <div className="flex justify-between items-end pt-3.5 border-t border-dashed border-warm-dashed">
            <p className="font-mono text-[9.5px] tracking-eyebrow uppercase text-text-mute">TOTAL TAGIHAN</p>
            <span className="font-serif text-amount-xl font-semibold text-navy leading-none">{formatRp(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment area */}
      <div className="flex-1 flex flex-col min-w-0 px-10 py-8 overflow-auto">
        <div className="flex justify-between items-start mb-7">
          <div>
            <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-gold mb-1.5">LANGKAH 2 · METODE PEMBAYARAN</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Bagaimana pelanggan bayar?</h1>
          </div>
          <button className="bg-white border border-warm-border rounded-[10px] px-3.5 py-2.5 text-[12px] text-navy flex items-center gap-2 shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Split bayar
          </button>
        </div>

        {/* Method cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {METHODS.map(m => {
            const active = paymentMethod === m.id;
            return (
              <div key={m.id} onClick={() => setPaymentMethod(m.id)}
                className={`bg-white rounded-method p-[18px] cursor-pointer relative border transition-all ${active ? "border-navy border-[1.5px] shadow-method" : "border-warm-border"}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-[42px] h-[42px] rounded-[11px] flex items-center justify-center ${active ? "bg-navy text-gold" : "bg-cream-pill text-navy"}`}>
                    {m.icon}
                  </div>
                  <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center ${active ? "bg-navy border-navy" : "border-warm-dashed"}`}>
                    {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </div>
                <div className="text-[15px] font-semibold text-navy mb-0.5">{m.label}</div>
                <div className="text-[11.5px] text-text-mute">{m.sub}</div>
                {m.badge && <span className="absolute top-3.5 right-11 font-mono text-[8.5px] text-gold bg-gold-soft px-[7px] py-[3px] rounded-[5px] tracking-mono-default font-semibold">{m.badge}</span>}
              </div>
            );
          })}
        </div>

        {/* Cash entry */}
        {paymentMethod === "tunai" && (
          <div className="bg-white border border-warm-border rounded-method p-6 mb-5">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-text-mute mb-1">JUMLAH TUNAI DITERIMA</p>
                <p className="text-[12px] text-text-mute">Ketuk nominal cepat atau ketik manual</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-text-mute mb-0.5">Kembalian</p>
                <p className={`font-serif text-[24px] font-semibold leading-none ${change >= 0 ? "text-success" : "text-warning"}`}>{formatRp(Math.abs(change))}</p>
              </div>
            </div>
            <div className="bg-cream-bg border-[1.5px] border-navy rounded-button px-[22px] py-[18px] flex items-center gap-3.5 mb-3.5">
              <span className="font-serif text-[28px] text-text-mute font-medium leading-none">Rp</span>
              <span className="font-serif text-amount-xl font-semibold text-navy leading-none flex-1">{cashReceived.toLocaleString("id-ID")}</span>
              <button onClick={() => setCashReceived(total)} className="text-[12px] text-text-mute underline underline-offset-[3px] bg-transparent border-0 shrink-0">
                Pas ({total.toLocaleString("id-ID")})
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {QUICK.map(a => (
                <button key={a} onClick={() => setCashReceived(a)}
                  className={`rounded-chip py-2.5 text-[12px] font-medium border transition-colors ${cashReceived === a ? "bg-navy text-cream-text border-navy" : "bg-cream-bg text-navy border-warm-border"}`}>
                  {a >= 1000 ? `${a/1000}rb` : a}
                </button>
              ))}
              <button onClick={() => setCashReceived(Math.max(0, cashReceived - 1000))}
                className="bg-cream-bg border border-warm-border rounded-chip py-2.5 text-[12px] text-text-mute">⌫</button>
            </div>
          </div>
        )}

        <button onClick={() => setScreen("receipt")}
          className="w-full bg-navy rounded-card h-16 flex items-center justify-center gap-3 text-cream-text text-[15px] font-semibold tracking-[0.02em] hover:bg-navy-soft transition-colors mt-auto">
          <span>SELESAIKAN PEMBAYARAN · {formatRp(total)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}
