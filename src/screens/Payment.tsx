import { useStore, getTotal, getItemCount } from '../store';
import { formatRp } from '../data';

const METHODS = [
  { id: 'tunai', label: 'Tunai', sub: 'Cash · paling umum', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
  { id: 'qris', label: 'QRIS', sub: 'Scan & bayar · semua bank/e-wallet', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3v1M17 17v4"/></svg> },
  { id: 'debit', label: 'Debit / Kartu', sub: 'EDC mesin · BCA, Mandiri, BRI', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg> },
  { id: 'transfer', label: 'Transfer Bank', sub: 'BCA · BRI · Mandiri · BNI', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg> },
  { id: 'ewallet', label: 'E-Wallet', sub: 'GoPay · OVO · DANA · ShopeePay', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg> },
  { id: 'hutang', label: 'Hutang / Bon', sub: 'Bayar nanti · perlu data pelanggan', badge: 'UMKM', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/></svg> },
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 300000, 500000];

export default function Payment() {
  const { cart, paymentMethod, cashReceived, setPaymentMethod, setCashReceived, addCash, setScreen } = useStore();
  const total = getTotal(cart);
  const itemCount = getItemCount(cart);
  const change = cashReceived - total;

  return (
    <div className="screen" style={{ width: '100%', height: '100%', background: '#FAFAF7', display: 'flex' }}>
      {/* Order summary */}
      <div style={{ flexShrink: 0, width: 480, background: '#fff', borderRight: '1px solid #ECE7DD', padding: 32, display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setScreen('sales')} style={{ background: 'transparent', border: 'none', color: '#7A776F', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Kembali ke keranjang
        </button>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 6 }}>RINCIAN · ORDER SUMMARY</div>
        <h2 className="serif" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Transaksi #PLU-0427</h2>
        <div style={{ fontSize: 12, color: '#7A776F', marginBottom: 28 }}>{itemCount} item · Ratna A. · 14:34, 24 Jun 2026</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F2EDE3' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product.name}</div>
                <div className="mono" style={{ fontSize: 10.5, color: '#7A776F', marginTop: 2 }}>{item.qty} × {item.product.price.toLocaleString('id-ID')}</div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{(item.product.price * item.qty).toLocaleString('id-ID')}</div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 18, borderTop: '1px solid #ECE7DD' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7A776F', marginBottom: 6 }}>
            <span>Subtotal</span><span className="mono">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7A776F', marginBottom: 14 }}>
            <span>Diskon</span><span className="mono">− Rp 0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px dashed #D8D2C4' }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase' }}>TOTAL TAGIHAN</div>
            <div className="serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>{formatRp(total)}</div>
          </div>
        </div>
      </div>

      {/* Payment area */}
      <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#C9A55F', textTransform: 'uppercase', marginBottom: 6 }}>LANGKAH 2 · METODE PEMBAYARAN</div>
            <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.05 }}>Bagaimana pelanggan bayar?</h1>
          </div>
          <button style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 10, padding: '9px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B1129" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Split bayar
          </button>
        </div>

        {/* Methods */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {METHODS.map(m => {
            const active = paymentMethod === m.id;
            return (
              <div key={m.id} onClick={() => setPaymentMethod(m.id)}
                style={{ background: '#fff', border: active ? '1.5px solid #0B1129' : '1px solid #ECE7DD', borderRadius: 16, padding: 18, cursor: 'pointer', position: 'relative', boxShadow: active ? '0 4px 18px rgba(11,17,41,0.06)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: active ? '#0B1129' : '#F2EDE3', color: active ? '#C9A55F' : '#0B1129', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.icon}
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: active ? '2px solid #0B1129' : '1.5px solid #D8D2C4', background: active ? '#0B1129' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 11.5, color: '#7A776F' }}>{m.sub}</div>
                {m.badge && <div className="mono" style={{ position: 'absolute', top: 14, right: 46, fontSize: 8.5, color: '#C9A55F', background: 'rgba(201,165,95,0.12)', padding: '3px 7px', borderRadius: 5, letterSpacing: '0.08em', fontWeight: 600 }}>{m.badge}</div>}
              </div>
            );
          })}
        </div>

        {/* Cash entry */}
        {paymentMethod === 'tunai' && (
          <div style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 16, padding: 24, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 4 }}>JUMLAH TUNAI DITERIMA</div>
                <div style={{ fontSize: 12, color: '#7A776F' }}>Ketuk nominal cepat atau ketik manual</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#7A776F', marginBottom: 2 }}>Kembalian</div>
                <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: change >= 0 ? '#5C9E7E' : '#C25E3D' }}>{formatRp(Math.abs(change))}</div>
              </div>
            </div>
            <div style={{ background: '#FAFAF7', border: '1.5px solid #0B1129', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <span className="serif" style={{ fontSize: 28, color: '#7A776F', fontWeight: 500 }}>Rp</span>
              <span className="serif" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>{cashReceived.toLocaleString('id-ID')}</span>
              <button onClick={() => setCashReceived(total)} style={{ background: 'transparent', border: 'none', color: '#7A776F', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Pas ({total.toLocaleString('id-ID')})</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setCashReceived(a)}
                  style={{ background: cashReceived === a ? '#0B1129' : '#FAFAF7', border: `1px solid ${cashReceived === a ? '#0B1129' : '#ECE7DD'}`, borderRadius: 9, padding: '10px 0', fontSize: 12, cursor: 'pointer', color: cashReceived === a ? '#F2EDE3' : '#0B1129', fontWeight: 500 }}>
                  {a >= 1000 ? `${a/1000}rb` : a}
                </button>
              ))}
              <button onClick={() => setCashReceived(Math.max(0, cashReceived - 1000))}
                style={{ background: '#FAFAF7', border: '1px solid #ECE7DD', borderRadius: 9, padding: '10px 0', fontSize: 12, cursor: 'pointer', color: '#7A776F' }}>⌫</button>
            </div>
          </div>
        )}

        <button onClick={() => setScreen('receipt')}
          style={{ background: '#0B1129', border: 'none', borderRadius: 14, height: 64, cursor: 'pointer', color: '#F2EDE3', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, letterSpacing: '0.02em', width: '100%' }}>
          <span>SELESAIKAN PEMBAYARAN · {formatRp(total)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}
