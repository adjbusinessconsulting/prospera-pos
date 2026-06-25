import { ShoppingCart, CalendarDays, Package, Wallet, BarChart2, Search, Upload, Plus, User } from "lucide-react";
import { useStore, getTotal, getItemCount } from "../store";
import { PRODUCTS, CATEGORIES, getCatLabel, formatRp } from "../data";

const NAV = [
  { id: "jual",    label: "JUAL",    Icon: ShoppingCart, dot: false },
  { id: "riwayat", label: "RIWAYAT", Icon: CalendarDays,  dot: false },
  { id: "produk",  label: "PRODUK",  Icon: Package,       dot: false },
  { id: "kas",     label: "KAS",     Icon: Wallet,        dot: true  },
  { id: "laporan", label: "LAPORAN", Icon: BarChart2,     dot: false },
];

export default function Sales() {
  const { cart, category, search, setCategory, setSearch, addToCart, updateQty, clearCart, setScreen } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);

  const filtered = PRODUCTS.filter(p => {
    const matchCat = category === "Semua" || getCatLabel(p.category) === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartQty = (id: string) => cart.find(i => i.product.id === id)?.qty ?? 0;

  return (
    <div className="w-full h-full flex animate-screen-in">
      {/* Sidebar */}
      <aside className="w-[88px] bg-white border-r border-warm-border flex flex-col items-center py-6 shrink-0">
        <div className="w-9 h-9 mb-8">
          <img src="/mark-navy-512.png" className="w-9 h-9 object-contain" alt="" />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 items-center w-full px-2">
          {NAV.map(({ id, label, Icon, dot }) => {
            const active = id === "jual";
            return (
              <button key={id} className={`w-[60px] h-[60px] rounded-card flex flex-col items-center justify-center gap-1 relative ${active ? "bg-navy text-cream-text" : "bg-transparent text-text-mute"}`}>
                <Icon size={20} strokeWidth={active ? 2 : 1.6} />
                <span className="text-[8.5px] font-medium tracking-mono-default uppercase leading-none">{label}</span>
                {dot && <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-3.5">
          <div className="flex flex-col items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success block" />
            <span className="font-mono text-[8px] text-text-mute tracking-mono-default">SYNC</span>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-cream-pill border border-warm-border flex items-center justify-center font-semibold text-[13px] text-navy">RA</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 pl-8 pr-7 pt-6 pb-6 bg-cream-bg">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-text-mute mb-1">PENJUALAN · NEW SALE</p>
            <h1 className="font-serif text-display-m font-medium text-navy">Selamat siang, Ratna</h1>
            <p className="text-[13px] text-text-mute mt-1">
              Selasa, 24 Juni 2026 · Transaksi ke <span className="font-mono font-medium text-navy">#PLU-0427</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white border border-warm-border rounded-[10px] px-3.5 py-2.5 text-[12px] text-navy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Shift Siang · 14:32
            </div>
            <button className="w-[38px] h-[38px] bg-white border border-warm-border rounded-[10px] flex items-center justify-center text-text-mute">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            </button>
            <button className="w-[38px] h-[38px] bg-white border border-warm-border rounded-[10px] flex items-center justify-center text-text-mute relative">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span className="absolute top-[7px] right-[8px] w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-white" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2.5 mb-[18px]">
          <div className="flex-1 bg-white border border-warm-border rounded-button h-[46px] flex items-center gap-3 px-4">
            <Search size={16} className="text-text-mute shrink-0" strokeWidth={2} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 border-0 outline-none text-[14px] text-navy bg-transparent placeholder:text-text-mute"
              placeholder="Cari produk, scan barcode, atau ketik kode SKU…" />
            <span className="font-mono text-[10px] text-text-mute bg-cream-pill px-2 py-1 rounded-[6px] tracking-mono-default shrink-0">⌘ K</span>
          </div>
          <button className="bg-white border border-warm-border rounded-button px-4 h-[46px] flex items-center gap-2.5 text-[13px] text-navy shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M11 5v14M15 5v14M19 5v14"/></svg>
            Scan Barcode
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-[22px] items-center flex-wrap">
          <span className="font-mono text-eyebrow tracking-eyebrow uppercase text-text-mute mr-1.5">KATEGORI</span>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-[12.5px] font-medium transition-colors border ${category === c ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border"}`}>
              {c === "Semua" ? `Semua · ${PRODUCTS.length}` : c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-auto grid grid-cols-5 gap-3 content-start">
          {filtered.map(p => {
            const qty = cartQty(p.id);
            return (
              <button key={p.id} onClick={() => addToCart(p)}
                className="bg-white border border-warm-border rounded-card p-2.5 text-left hover:border-navy/30 transition-colors">
                <div className="relative aspect-square rounded-[9px] flex items-center justify-center mb-2.5"
                  style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                  <span className="font-serif text-[30px] font-medium" style={{ color: "rgba(11,17,41,0.55)" }}>{p.monogram}</span>
                  <span className={`absolute top-1.5 left-2 font-mono text-[8.5px] ${p.stock <= 5 ? "text-warning" : "text-text-mute"}`}>×{p.stock}</span>
                  {qty > 0 && <span className="absolute top-1.5 right-1.5 bg-navy text-gold font-mono text-[9px] px-[7px] py-[3px] rounded-[5px] font-semibold">×{qty}</span>}
                </div>
                <div className="text-[12px] font-medium text-navy leading-tight mb-0.5">{p.name}</div>
                <div className="text-[10.5px] text-text-mute mb-1.5">{p.category} · {p.unit}</div>
                <div className="font-serif text-[17px] font-semibold text-navy">Rp {p.price.toLocaleString("id-ID")}</div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Cart */}
      <aside className="w-[400px] bg-white border-l border-warm-border flex flex-col shrink-0">
        <div className="px-6 pt-6 pb-4 border-b border-warm-border">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-mono text-eyebrow tracking-eyebrow uppercase text-text-mute">KERANJANG · CART</p>
              <h2 className="font-serif text-display-s font-medium text-navy mt-0.5">{itemCount} item</h2>
            </div>
            <button onClick={clearCart} className="text-[12px] text-text-mute underline underline-offset-[3px] mt-1">Kosongkan</button>
          </div>
          <button className="w-full bg-cream-bg border border-dashed border-warm-dashed rounded-[10px] px-3.5 py-2.5 flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-cream-pill flex items-center justify-center text-text-mute shrink-0">
              <User size={14} strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[12.5px] font-medium text-navy">Pelanggan umum</div>
              <div className="text-[10.5px] text-text-mute">Tambah nama / WhatsApp untuk hutang</div>
            </div>
            <span className="text-[18px] text-gold font-light leading-none">+</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {cart.length === 0 && <p className="text-center text-warm-dashed text-[13px] pt-10">Keranjang kosong</p>}
          {cart.map(item => (
            <div key={item.product.id} className="flex gap-3 py-3 border-b border-[#F2EDE3]">
              <div className="w-11 h-11 rounded-thumb flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                <span className="font-serif text-[16px] font-medium" style={{ color: "rgba(11,17,41,0.55)" }}>{item.product.monogram}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-navy">{item.product.name}</div>
                <div className="text-[11px] text-text-mute mt-0.5">{item.qty} × Rp {item.product.price.toLocaleString("id-ID")}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="font-serif text-[15px] font-semibold text-navy">{(item.product.price * item.qty).toLocaleString("id-ID")}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-text-mute text-[13px] leading-none">−</button>
                  <span className="font-mono text-[11px] w-3.5 text-center text-navy">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 border border-warm-border bg-white rounded-stepper flex items-center justify-center text-navy text-[13px] leading-none">+</button>
                </div>
              </div>
            </div>
          ))}
          {cart.length > 0 && (
            <button className="mt-3.5 flex items-center gap-1.5 text-[12px] text-gold font-medium">
              <Plus size={13} strokeWidth={2} />
              Tambah diskon / catatan
            </button>
          )}
        </div>

        <div className="px-6 pb-[22px] pt-[18px] border-t border-warm-border bg-cream-bg">
          <div className="flex justify-between text-[12.5px] text-text-mute mb-1.5">
            <span>Subtotal</span><span className="font-mono">Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-text-mute mb-3.5">
            <span>Diskon</span><span className="font-mono">− Rp 0</span>
          </div>
          <div className="flex justify-between items-end pt-3.5 border-t border-dashed border-warm-dashed">
            <div>
              <p className="font-mono text-[9.5px] tracking-eyebrow uppercase text-text-mute mb-0.5">TOTAL</p>
              <p className="text-[11px] text-text-mute">{itemCount} item · belum termasuk pajak</p>
            </div>
            <span className="font-serif text-amount-l font-semibold text-navy leading-none">Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="shrink-0 bg-white border border-warm-border rounded-button h-[50px] px-3.5 flex items-center gap-1.5 text-[12px] text-navy">
              <Upload size={14} strokeWidth={1.8} />
              Tahan
            </button>
            <button onClick={() => cart.length > 0 && setScreen("payment")}
              className={`flex-1 rounded-button h-[50px] flex items-center justify-center gap-2.5 text-[14px] font-semibold tracking-[0.02em] transition-colors ${cart.length > 0 ? "bg-navy text-cream-text" : "bg-warm-border text-text-mute"}`}>
              <span>BAYAR — {formatRp(total)}</span>
              {cart.length > 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
