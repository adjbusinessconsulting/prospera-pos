import { useStore, getTotal } from '../store';
import { formatRp } from '../data';

export default function Receipt() {
  const { cart, cashReceived, restart } = useStore();
  const total = getTotal(cart);
  const change = cashReceived - total;

  return (
    <div className="screen" style={{ width: '100%', height: '100%', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 8 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#0B1129', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#C9A55F', textTransform: 'uppercase', marginBottom: 6 }}>BERHASIL · PAID</div>
          <h2 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Terima kasih, pelanggan</h2>
          <div style={{ fontSize: 12.5, color: '#7A776F' }}>
            Kembalian <span className="serif" style={{ color: '#0B1129', fontWeight: 600 }}>{formatRp(change)}</span> · jangan lupa diberikan
          </div>
        </div>

        {/* Receipt card */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #ECE7DD', borderRadius: 14, padding: '24px 26px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {/* Store header */}
          <div style={{ textAlign: 'center', paddingBottom: 14, borderBottom: '1px dashed #D8D2C4' }}>
            <div style={{ width: 32, height: 32, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/mark-navy.png" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="serif" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.005em' }}>Toko Sembako Maju</div>
            <div style={{ fontSize: 10.5, color: '#7A776F', marginTop: 3 }}>Jl. Diponegoro No. 24, Palu Timur</div>
            <div style={{ fontSize: 10.5, color: '#7A776F' }}>WhatsApp 0812-3456-7890</div>
          </div>

          {/* Meta */}
          <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#7A776F', padding: '10px 0', borderBottom: '1px dashed #D8D2C4' }}>
            <div><div>#PLU-0427</div><div style={{ marginTop: 3 }}>24 Jun 2026 · 14:34</div></div>
            <div style={{ textAlign: 'right' }}><div>Kasir: Ratna A.</div><div style={{ marginTop: 3 }}>Shift 2 (Siang)</div></div>
          </div>

          {/* Items */}
          <div style={{ padding: '12px 0', borderBottom: '1px dashed #D8D2C4' }}>
            {cart.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: '#7A776F' }}>{item.qty} × {item.product.price.toLocaleString('id-ID')}</div>
                </div>
                <div className="mono" style={{ fontWeight: 500 }}>{(item.product.price * item.qty).toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: '12px 0', borderBottom: '1px dashed #D8D2C4' }}>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A776F', marginBottom: 5 }}>
              <span>SUBTOTAL</span><span>{total.toLocaleString('id-ID')}</span>
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A776F', marginBottom: 5 }}>
              <span>DISKON</span><span>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL</span>
              <span className="serif" style={{ fontSize: 24, fontWeight: 600 }}>{formatRp(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div style={{ padding: '12px 0' }}>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A776F', marginBottom: 5 }}>
              <span>TUNAI</span><span>{cashReceived.toLocaleString('id-ID')}</span>
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0B1129', fontWeight: 600 }}>
              <span>KEMBALIAN</span><span>{change.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: 14, borderTop: '1px dashed #D8D2C4' }}>
            <div className="serif" style={{ fontSize: 14, fontStyle: 'italic', color: '#0B1129' }}>Terima kasih, sampai jumpa lagi</div>
            <div className="mono" style={{ fontSize: 9, color: '#7A776F', marginTop: 8, letterSpacing: '0.1em' }}>POWERED BY PROSPERA POS</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 18 }}>
          <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 12, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#0B1129' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <span style={{ fontSize: 11 }}>Cetak</span>
          </button>
          <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 12, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#0B1129' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            <span style={{ fontSize: 11 }}>WhatsApp</span>
          </button>
          <button onClick={restart} style={{ background: '#0B1129', border: 'none', borderRadius: 12, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#F2EDE3' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>
            <span style={{ fontSize: 11 }}>Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
