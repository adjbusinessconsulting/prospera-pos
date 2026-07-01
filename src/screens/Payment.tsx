import { ChevronLeft } from "lucide-react";
import { useStore, getTotal, getItemCount, getTrxId } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const METHODS = [
  {
    id: "tunai", label: "Tunai", sub: "Cash di laci", locked: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>,
  },
  {
    id: "qris", label: "QRIS", sub: "Scan & bayar", locked: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3v1M17 17v4"/></svg>,
  },
  {
    id: "debit", label: "Debit / Kartu", sub: "EDC mesin", locked: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>,
  },
  {
    id: "ewallet", label: "E-Wallet", sub: "GoPay · OVO · DANA", locked: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg>,
  },
  {
    id: "hutang", label: "Hutang / Bon", sub: "Bayar nanti", locked: true,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/></svg>,
  },
  {
    id: "transfer", label: "Transfer Bank", sub: "BCA · BRI · Mandiri", locked: false,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>,
  },
];

const QUICK = [50000, 100000, 200000, 500000];

export default function Payment() {
  const { cart, paymentMethod, cashReceived, cashierName, cashierInitials, selectedShift, trxCounter, setPaymentMethod, setCashReceived, setScreen, signOut } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);
  const change = cashReceived - total;
  const trxId = getTrxId(trxCounter);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      {/* Sidebar desktop */}
      <AppSidebar active="sales" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} />

      {/* Desktop: order summary left panel */}
      <div className="hidden lg:flex w-[400px] bg-white border-r border-warm-border flex-col shrink-0">
        <div className="px-7 pt-7 pb-5 border-b border-warm-border shrink-0">
          <button onClick={() => setScreen("sales")}
            className="flex items-center gap-1.5 text-[12px] text-text-mute mb-5 bg-transparent border-0 p-0 hover:text-navy transition-colors">
            <ChevronLeft size={14} strokeWidth={2} />
            Kembali ke keranjang
          </button>
          <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">RINGKASAN PESANAN</p>
          <h2 className="font-serif text-[24px] font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{trxId}</h2>
          <p className="text-[12px] text-text-mute mt-0.5">Kasir: {cashierName} · {timeStr}</p>
        </div>

        <div className="flex-1 overflow-auto px-7 py-5">
          {cart.length === 0 && <p className="text-center text-text-mute text-[13px] py-8">Keranjang kosong</p>}
          {cart.map(item => (
            <div key={item.product.id} className="flex gap-3 py-3 border-b border-[#F2EDE3]">
              <div className="w-10 h-10 rounded-thumb flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                <span className="text-[20px] leading-none">{item.product.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-navy">{item.product.name}</div>
                <div className="text-[11px] text-text-mute mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.qty} × Rp {item.product.price.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="font-serif text-[15px] font-semibold text-navy shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                {(item.product.price * item.qty).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>

        <div className="px-7 py-5 border-t border-warm-border bg-cream-bg shrink-0">
          <div className="flex justify-between text-[12.5px] text-text-mute mb-1.5">
            <span>{itemCount} item</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-text-mute mb-3">
            <span>Diskon</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>− Rp 0</span>
          </div>
          <div className="flex justify-between items-end pt-3 border-t border-dashed border-warm-dashed">
            <span style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute">TOTAL TAGIHAN</span>
            <span className="font-serif text-[26px] font-semibold text-navy leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
          </div>
        </div>
      </div>

      {/* Right: payment method + math */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile: back button + header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0 lg:px-10 lg:pt-8">
          <div>
            <button onClick={() => setScreen("sales")}
              className="lg:hidden flex items-center gap-1.5 text-[12px] text-text-mute mb-3 bg-transparent border-0 p-0 hover:text-navy transition-colors">
              <ChevronLeft size={14} strokeWidth={2} />
              Kembali ke keranjang
            </button>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold mb-1">LANGKAH 2 · BAYAR</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Bagaimana pelanggan bayar?</h1>
          </div>
        </div>

        {/* Method tiles — 3-col desktop, 2-col mobile */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-5 pb-[120px] lg:pb-5">
          <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-3">METODE PEMBAYARAN</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {METHODS.map(m => {
              if (m.locked) {
                return (
                  <div key={m.id} className="bg-white rounded-method p-4 relative"
                    style={{ border: "1.5px dashed rgba(201,165,95,0.55)", opacity: 0.75, cursor: "not-allowed" }}>
                    <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.12em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>
                      STANDARD
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="1.6" style={{ position: "absolute", top: 10, right: 60 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center bg-gold-soft text-gold mb-4">
                      {m.icon}
                    </div>
                    <div className="text-[13.5px] font-semibold text-navy mb-0.5 opacity-60">{m.label}</div>
                    <div className="text-[11px] text-text-mute opacity-70">{m.sub}</div>
                  </div>
                );
              }
              const active = paymentMethod === m.id;
              return (
                <div key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`bg-white rounded-method p-4 cursor-pointer relative border transition-all ${active ? "border-navy border-[1.5px] shadow-method" : "border-warm-border hover:border-navy/30"}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center ${active ? "bg-navy text-gold" : "bg-cream-pill text-navy"}`}>
                      {m.icon}
                    </div>
                    <div className={`w-[17px] h-[17px] rounded-full border flex items-center justify-center shrink-0 ${active ? "bg-navy border-navy" : "border-warm-dashed"}`}>
                      {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                  </div>
                  <div className="text-[13.5px] font-semibold text-navy mb-0.5">{m.label}</div>
                  <div className="text-[11px] text-text-mute">{m.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Math card — pinned at bottom */}
        <div className="fixed lg:relative bottom-0 inset-x-0 lg:inset-x-auto bg-white border-t border-warm-border px-5 lg:px-10 pt-4 pb-5 shrink-0"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>

          {paymentMethod === "tunai" && (
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-2">
                <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">TUNAI DITERIMA</p>
                <button onClick={() => setCashReceived(total)} className="text-[11px] text-text-mute underline underline-offset-[3px] bg-transparent border-0 p-0">PAS</button>
              </div>
              <div className="bg-cream-bg border-[1.5px] border-navy rounded-button px-4 py-3 flex items-center gap-2 mb-2.5">
                <span className="font-serif text-[18px] text-text-mute font-medium leading-none shrink-0">Rp</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-serif text-[22px] font-semibold text-navy leading-none flex-1">{cashReceived.toLocaleString("id-ID")}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {QUICK.map(a => (
                  <button key={a} onClick={() => setCashReceived(a)}
                    className={`rounded-chip py-1.5 text-[11px] font-medium border transition-colors ${cashReceived === a ? "bg-navy text-cream-text border-navy" : "bg-cream-bg text-navy border-warm-border"}`}>
                    {cashReceived === a ? `${a >= 1000 ? a/1000 + "rb" : a}` : `+${a >= 1000 ? a/1000 + "rb" : a}`}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">KEMBALIAN</p>
                <span className={`font-serif text-[20px] font-semibold leading-none ${change >= 0 ? "text-success" : "text-warning"}`}>
                  {change >= 0 ? formatRp(change) : `−${formatRp(-change)}`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">TOTAL</p>
              <span className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
            </div>
            <button onClick={() => setScreen("receipt")}
              className="flex-1 bg-navy rounded-card h-[50px] flex items-center justify-center gap-3 text-cream-text text-[14px] font-semibold tracking-[0.02em] hover:opacity-90 transition-opacity">
              <span>SELESAIKAN · {formatRp(total)}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
