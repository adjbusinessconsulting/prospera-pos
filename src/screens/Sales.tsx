import { useStore, getTotal, getItemCount } from '../store';
import { PRODUCTS, CATEGORIES, getCatLabel, formatRp } from '../data';

export default function Sales() {
  const { cart, category, search, setCategory, setSearch, addToCart, updateQty, clearCart, setScreen } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);

  const filtered = PRODUCTS.filter(p => {
    const matchCat = category === 'Semua' || getCatLabel(p.category) === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartQty = (id: string) => cart.find(i => i.product.id === id)?.qty ?? 0;

  return (
    <div className="screen" style={{ width: '100%', height: '100%', background: '#FAFAF7', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: 88, background: '#fff', borderRight: '1px solid #ECE7DD', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/mark-navy.png" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, alignItems: 'center' }}>
          {[
            { label: 'JUAL', active: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3a1 1 0 00.7 1.7H17"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg> },
            { label: 'RIWAYAT', active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v4M16 4v4"/></svg> },
            { label: 'PRODUK', active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg> },
            { label: 'KAS', active: false, dot: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4h4v-4z"/></svg> },
            { label: 'LAPORAN', active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 11H5a2 2 0 00-2 2v7h6m4-9V5a2 2 0 012-2h2a2 2 0 012 2v15m-6 0v-9m0 0h6m0 9v-2"/></svg> },
          ].map(({ label, active, icon, dot }) => (
            <button key={label} style={{ width: 60, height: 60, borderRadius: 14, background: active ? '#0B1129' : 'transparent', border: 'none', color: active ? '#F2EDE3' : '#7A776F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}>
              {icon}
              <span style={{ fontSize: 8.5, letterSpacing: '0.1em', fontWeight: 500 }}>{label}</span>
              {dot && <span style={{ position: 'absolute', top: 8, right: 10, width: 6, height: 6, borderRadius: '50%', background: '#C9A55F' }} />}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5C9E7E', display: 'block' }} />
            <span className="mono" style={{ fontSize: 8, color: '#7A776F', letterSpacing: '0.1em' }}>SYNC</span>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F2EDE3', border: '1px solid #ECE7DD', color: '#0B1129', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>RA</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '24px 28px 24px 32px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 4 }}>PENJUALAN · NEW SALE</div>
            <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Selamat siang, Ratna</h1>
            <div style={{ fontSize: 13, color: '#7A776F', marginTop: 4 }}>Selasa, 24 Juni 2026 · Transaksi ke <span style={{ color: '#0B1129', fontWeight: 500 }}>#PLU-0427</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 10, padding: '9px 14px', fontSize: 12, color: '#0B1129', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Shift Siang · 14:32
            </button>
            <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1129' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            </button>
            <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1129', position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: 6, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#C9A55F', border: '1.5px solid #fff' }} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #ECE7DD', borderRadius: 12, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 46 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0B1129', background: 'transparent' }} placeholder="Cari produk, scan barcode, atau ketik kode SKU…" />
            <span className="mono" style={{ fontSize: 10, color: '#7A776F', background: '#F2EDE3', padding: '4px 8px', borderRadius: 6, letterSpacing: '0.08em' }}>⌘ K</span>
          </div>
          <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 12, padding: '0 18px', height: 46, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0B1129' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M11 5v14M15 5v14M19 5v14"/></svg>
            Scan Barcode
          </button>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase', marginRight: 6 }}>KATEGORI</span>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ background: category === c ? '#0B1129' : '#fff', border: `1px solid ${category === c ? '#0B1129' : '#ECE7DD'}`, borderRadius: 999, padding: '8px 16px', fontSize: 12.5, color: category === c ? '#F2EDE3' : '#0B1129', fontWeight: category === c ? 500 : 400 }}>
              {c === 'Semua' ? `Semua · ${PRODUCTS.length}` : c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignContent: 'flex-start' }}>
          {filtered.map(p => {
            const qty = cartQty(p.id);
            return (
              <div key={p.id} onClick={() => addToCart(p)}
                style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 14, padding: 10, cursor: 'pointer', position: 'relative' }}>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#F2EDE3 0%,#E8DFC9 100%)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' }}>
                  <span className="serif" style={{ fontSize: 30, color: 'rgba(11,17,41,0.55)', fontWeight: 500 }}>{p.monogram}</span>
                  <span className="mono" style={{ position: 'absolute', top: 6, left: 8, fontSize: 8.5, color: p.stock <= 5 ? '#C25E3D' : '#7A776F', letterSpacing: '0.05em' }}>×{p.stock}</span>
                  {qty > 0 && <div className="mono" style={{ position: 'absolute', top: 6, right: 6, background: '#0B1129', color: '#C9A55F', fontSize: 9, padding: '3px 7px', borderRadius: 5, letterSpacing: '0.08em', fontWeight: 600 }}>×{qty}</div>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.25, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: '#7A776F', marginBottom: 6 }}>{p.category} · {p.unit}</div>
                <div className="serif" style={{ fontSize: 17, fontWeight: 600 }}>Rp {p.price.toLocaleString('id-ID')}</div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Cart */}
      <aside style={{ width: 400, background: '#fff', borderLeft: '1px solid #ECE7DD', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Cart header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #ECE7DD' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase' }}>KERANJANG · CART</div>
              <div className="serif" style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}>{itemCount} item</div>
            </div>
            <button onClick={clearCart} style={{ background: 'transparent', border: 'none', color: '#7A776F', fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3 }}>Kosongkan</button>
          </div>
          <button style={{ width: '100%', background: '#FAFAF7', border: '1px dashed #D8D2C4', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#0B1129' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F2EDE3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A776F' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"/></svg>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>Pelanggan umum</div>
              <div style={{ fontSize: 10.5, color: '#7A776F' }}>Tambah nama / WhatsApp untuk hutang</div>
            </div>
            <span style={{ fontSize: 18, color: '#C9A55F', fontWeight: 300 }}>+</span>
          </button>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', color: '#D8D2C4', fontSize: 13, paddingTop: 40 }}>Keranjang kosong</div>
          )}
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F2EDE3' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#F2EDE3,#E8DFC9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="serif" style={{ fontSize: 16, color: 'rgba(11,17,41,0.55)', fontWeight: 500 }}>{item.product.monogram}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.product.name}</div>
                <div style={{ fontSize: 11, color: '#7A776F', marginTop: 2 }}>{item.qty} × Rp {item.product.price.toLocaleString('id-ID')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div className="serif" style={{ fontSize: 15, fontWeight: 600 }}>{(item.product.price * item.qty).toLocaleString('id-ID')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 24, height: 24, border: '1px solid #ECE7DD', background: '#fff', borderRadius: 6, color: '#7A776F', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span className="mono" style={{ fontSize: 11, width: 14, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 24, height: 24, border: '1px solid #ECE7DD', background: '#fff', borderRadius: 6, color: '#0B1129', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            </div>
          ))}
          {cart.length > 0 && (
            <button style={{ marginTop: 14, background: 'transparent', border: 'none', color: '#C9A55F', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Tambah diskon / catatan
            </button>
          )}
        </div>

        {/* Cart footer */}
        <div style={{ padding: '18px 24px 22px', borderTop: '1px solid #ECE7DD', background: '#FAFAF7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7A776F', marginBottom: 6 }}>
            <span>Subtotal</span><span className="mono">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7A776F', marginBottom: 6 }}>
            <span>Diskon</span><span className="mono">− Rp 0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: '1px dashed #D8D2C4' }}>
            <div>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 2 }}>TOTAL</div>
              <div style={{ fontSize: 11, color: '#7A776F' }}>{itemCount} item · belum termasuk pajak</div>
            </div>
            <div className="serif" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>Rp {total.toLocaleString('id-ID')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{ flexShrink: 0, background: '#fff', border: '1px solid #ECE7DD', borderRadius: 12, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0B1129' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Tahan
            </button>
            <button onClick={() => cart.length > 0 && setScreen('payment')} style={{ flex: 1, background: cart.length > 0 ? '#0B1129' : '#ECE7DD', border: 'none', borderRadius: 12, height: 50, color: cart.length > 0 ? '#F2EDE3' : '#7A776F', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, letterSpacing: '0.02em' }}>
              <span>BAYAR · {formatRp(total)}</span>
              {cart.length > 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
