import { Search, User, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { useStore, getTotal, getItemCount, getTrxId } from "../store";
import { CATEGORIES, getCatLabel, formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const SHIFT_LABELS: Record<1 | 2 | 3, string> = {
  1: "Shift 1 · Pagi",
  2: "Shift 2 · Siang",
  3: "Shift 3 · Malam",
};

function FreePill() {
  return (
    <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 600, padding: "3px 9px", borderRadius: 9999, textTransform: "uppercase" as const, lineHeight: 1 }}>
      FREE
    </span>
  );
}

export default function Sales() {
  const [cartOpen, setCartOpen] = useState(false);
  const { cart, category, search, cashierName, cashierInitials, selectedShift, trxCounter, products, setCategory, setSearch, addToCart, updateQty, clearCart, setScreen, signOut } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);
  const trxId = getTrxId(trxCounter);

  const filtered = products.filter(p => {
    const matchCat = category === "Semua" || getCatLabel(p.category) === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const cartQty = (id: string) => cart.find(i => i.product.id === id)?.qty ?? 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const h = now.getHours();
  const greeting = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="w-full h-full flex animate-screen-in">
      <AppSidebar active="sales" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      {/* Main + cart */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">

        {/* Product area */}
        <main className="flex-1 flex flex-col min-w-0 bg-cream-bg overflow-hidden">
          {/* Desktop header */}
          <div className="hidden lg:flex justify-between items-start shrink-0 px-8 pt-6 pb-0">
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.22em", fontVariantNumeric: "tabular-nums" }} className="font-sans uppercase text-text-mute mb-1">PENJUALAN · {trxId}</p>
              <h1 className="font-serif text-display-m font-medium text-navy">{greeting}, {cashierName}</h1>
              <p className="text-[13px] text-text-mute mt-1">
                {dateStr} · {SHIFT_LABELS[selectedShift]} · {timeStr}
              </p>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <FreePill />
              <div className="flex items-center gap-2 bg-white border border-warm-border rounded-[10px] px-3.5 py-2.5 text-[12px] text-navy">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {SHIFT_LABELS[selectedShift]} · {timeStr}
              </div>
              <button className="w-[38px] h-[38px] bg-white border border-warm-border rounded-[10px] flex items-center justify-center text-text-mute relative">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span className="absolute top-[7px] right-[8px] w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-white" />
              </button>
            </div>
          </div>

          {/* Mobile top bar */}
          <div className="lg:hidden flex items-start justify-between px-5 pt-5 pb-0 shrink-0 gap-3">
            <div className="min-w-0">
              <p style={{ fontSize: 10, letterSpacing: "0.22em", fontVariantNumeric: "tabular-nums" }} className="font-sans uppercase text-text-mute mb-1">
                PENJUALAN · {trxId}
              </p>
              <h1 className="font-serif text-[24px] font-medium text-navy leading-tight">Jual</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              <FreePill />
              <div className="w-[30px] h-[30px] rounded-full bg-cream-pill border border-warm-border flex items-center justify-center font-semibold text-[11px] text-navy">{cashierInitials}</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 px-4 lg:px-8 pt-4 lg:pt-5 pb-0 shrink-0">
            <div className="flex-1 bg-white border border-warm-border rounded-button h-[44px] flex items-center gap-3 px-4">
              <Search size={15} className="text-text-mute shrink-0" strokeWidth={2} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 border-0 outline-none text-[13.5px] text-navy bg-transparent placeholder:text-text-mute"
                placeholder="Cari produk atau scan barcode…" />
            </div>
            <button className="bg-white border border-warm-border rounded-button px-3 h-[44px] flex items-center gap-2 text-[12px] text-navy shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M11 5v14M15 5v14M19 5v14"/></svg>
              <span className="hidden lg:inline">Scan Barcode</span>
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 px-4 lg:px-8 pt-3 pb-0 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
            <span style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute self-center mr-1 shrink-0 hidden lg:block">KATEGORI</span>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${category === c ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border"}`}>
                {c === "Semua" ? `Semua · ${products.length}` : c}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto px-4 lg:px-8 pt-4 pb-[80px] lg:pb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 content-start">
              {filtered.map(p => {
                const qty = cartQty(p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="bg-white border border-warm-border rounded-card p-2.5 text-left hover:border-navy/30 active:scale-[0.98] transition-all">
                    <div className="relative aspect-square rounded-[9px] overflow-hidden flex items-center justify-center mb-2.5"
                      style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                      {p.photo
                        ? <img src={p.photo} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                        : <span className="text-[36px] lg:text-[30px] leading-none select-none">{p.emoji}</span>
                      }
                      <span className={`absolute top-1.5 left-2 text-[8.5px] ${p.stock <= 5 ? "text-warning" : "text-text-mute"}`} style={{ fontVariantNumeric: "tabular-nums" }}>×{p.stock}</span>
                      {qty > 0 && <span className="absolute top-1.5 right-1.5 bg-navy text-gold text-[9px] px-[7px] py-[3px] rounded-[5px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>×{qty}</span>}
                    </div>
                    <div className="text-[12px] font-medium text-navy leading-tight mb-0.5">{p.name}</div>
                    <div className="text-[10.5px] text-text-mute mb-1">{p.category} · {p.unit}</div>
                    <div className="font-serif text-[16px] font-semibold text-navy">Rp {p.price.toLocaleString("id-ID")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Desktop cart right-rail */}
        <aside className="hidden lg:flex w-[360px] bg-white border-l border-warm-border flex-col shrink-0">
          <div className="px-6 pt-6 pb-4 border-b border-warm-border shrink-0">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute">KERANJANG · CART</p>
                <h2 className="font-serif text-display-s font-medium text-navy mt-0.5">{itemCount} item</h2>
              </div>
              <button onClick={clearCart} className="text-[12px] text-text-mute underline underline-offset-[3px] mt-1">Kosongkan</button>
            </div>
            <button className="w-full bg-cream-bg border border-dashed border-warm-dashed rounded-[10px] px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-[28px] h-[28px] rounded-full bg-cream-pill flex items-center justify-center text-text-mute shrink-0">
                <User size={13} strokeWidth={1.8} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[12px] font-medium text-navy">Pelanggan umum</div>
                <div className="text-[10px] text-text-mute">Tambah nama / WhatsApp untuk hutang</div>
              </div>
              <span className="text-[18px] text-gold font-light leading-none">+</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4">
            {cart.length === 0 && <p className="text-center text-warm-dashed text-[13px] pt-10">Keranjang kosong</p>}
            {cart.map(item => (
              <div key={item.product.id} className="flex gap-3 py-3 border-b border-[#F2EDE3]">
                <div className="w-10 h-10 rounded-thumb flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                  {item.product.photo
                    ? <img src={item.product.photo} alt={item.product.name} className="w-full h-full object-cover" />
                    : <span className="text-[20px] leading-none">{item.product.emoji}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-navy">{item.product.name}</div>
                  <div className="text-[11px] text-text-mute mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>{item.qty} × Rp {item.product.price.toLocaleString("id-ID")}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-serif text-[15px] font-semibold text-navy">{(item.product.price * item.qty).toLocaleString("id-ID")}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-text-mute text-[13px] leading-none">−</button>
                    <span style={{ fontVariantNumeric: "tabular-nums" }} className="text-[11px] w-3.5 text-center text-navy">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-navy text-[13px] leading-none">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-5 pt-4 border-t border-warm-border bg-cream-bg shrink-0">
            <div className="flex justify-between text-[12.5px] text-text-mute mb-2">
              <span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>Rp {total.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-[12.5px] text-text-mute mb-3.5">
              <span>Diskon</span><span style={{ fontVariantNumeric: "tabular-nums" }}>Rp 0</span>
            </div>
            <div className="flex justify-between items-end pt-3.5 border-t border-dashed border-warm-dashed mb-4">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">TOTAL</p>
                <p className="text-[11px] text-text-mute">{itemCount} item · belum termasuk pajak</p>
              </div>
              <span className="font-serif text-amount-l font-semibold text-navy leading-none">Rp {total.toLocaleString("id-ID")}</span>
            </div>
            <button onClick={() => cart.length > 0 && setScreen("payment")}
              className={`w-full rounded-button h-[50px] flex items-center justify-center gap-2.5 text-[14px] font-semibold tracking-[0.02em] transition-colors ${cart.length > 0 ? "bg-navy text-cream-text" : "bg-warm-border text-text-mute"}`}>
              <span>BAYAR — {formatRp(total)}</span>
              {cart.length > 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </aside>

        {/* Mobile bottom bar (pinned) */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-navy flex items-center gap-3 px-4 py-3 z-40" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <button onClick={() => setCartOpen(true)} className="flex-1 flex items-center gap-2.5 text-cream-text">
            <span className="text-[13.5px] font-medium">{itemCount} item</span>
            <span className="text-text-mute text-[13px]">·</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-serif text-[15px] font-semibold">Rp {total.toLocaleString("id-ID")}</span>
            {itemCount > 0 && <ChevronUp size={15} className="text-gold" />}
          </button>
          <button onClick={() => cart.length > 0 && setScreen("payment")}
            className={`rounded-button h-[42px] px-5 text-[13px] font-semibold transition-colors ${cart.length > 0 ? "bg-gold text-navy" : "bg-navy-soft text-text-mute"}`}>
            BAYAR
          </button>
        </div>

        {/* Mobile cart sheet */}
        {cartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="bg-black/40 flex-1" onClick={() => setCartOpen(false)} />
            <div className="bg-white rounded-t-[20px] max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-warm-border shrink-0">
                <div>
                  <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute">KERANJANG</p>
                  <h2 className="font-serif text-[22px] font-medium text-navy mt-0.5">{itemCount} item</h2>
                </div>
                <button onClick={() => setCartOpen(false)} className="w-[34px] h-[34px] rounded-full bg-cream-pill flex items-center justify-center text-text-mute">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-auto px-6 py-3">
                {cart.length === 0 && <p className="text-center text-text-mute text-[13px] py-8">Keranjang kosong</p>}
                {cart.map(item => (
                  <div key={item.product.id} className="flex gap-3 py-3 border-b border-[#F2EDE3]">
                    <div className="w-10 h-10 rounded-thumb flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                      {item.product.photo
                        ? <img src={item.product.photo} alt={item.product.name} className="w-full h-full object-cover" />
                        : <span className="text-[20px] leading-none">{item.product.emoji}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-navy">{item.product.name}</div>
                      <div className="text-[11px] text-text-mute mt-0.5">Rp {item.product.price.toLocaleString("id-ID")}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-text-mute text-[14px]">−</button>
                      <span style={{ fontVariantNumeric: "tabular-nums" }} className="text-[13px] w-5 text-center text-navy font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-navy text-[14px]">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-warm-border shrink-0" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
                <div className="flex justify-between text-[13px] text-text-mute mb-1">
                  <span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-[13px] text-text-mute mb-1">
                  <span>Diskon</span><span style={{ fontVariantNumeric: "tabular-nums" }}>Rp 0</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-dashed border-warm-dashed mb-3.5">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute">TOTAL</span>
                  <span className="font-serif text-[22px] font-semibold text-navy">Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <button onClick={() => { setCartOpen(false); cart.length > 0 && setScreen("payment"); }}
                  className={`w-full rounded-button h-[50px] flex items-center justify-center gap-2.5 text-[14px] font-semibold ${cart.length > 0 ? "bg-navy text-cream-text" : "bg-warm-border text-text-mute"}`}>
                  BAYAR — {formatRp(total)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
