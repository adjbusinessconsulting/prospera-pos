import { useStore } from '../store';
import { CASHIERS } from '../data';

export default function PinLogin() {
  const { selectedCashier, selectCashier, pin, addPin, clearPin, setScreen } = useStore();

  function handleLogin() {
    if (pin.length >= 1) setScreen('sales');
  }

  return (
    <div className="screen" style={{ width: '100%', height: '100%', background: '#FAFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/mark-navy.png" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.18em', color: '#0B1129' }}>PROSPERA</div>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.22em', color: '#7A776F', marginTop: 1 }}>POINT OF SALE</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13, color: '#7A776F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5C9E7E', boxShadow: '0 0 0 4px rgba(92,158,126,0.18)', display: 'inline-block' }} />
            <span>Tersinkron · Synced</span>
          </div>
          <span style={{ color: '#D8D2C4' }}>·</span>
          <span className="mono" style={{ fontSize: 12 }}>14:32 · Selasa</span>
        </div>
      </div>

      {/* Centered card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px 60px' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>
          {/* Store info */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: '#C9A55F', textTransform: 'uppercase', marginBottom: 14 }}>SELAMAT DATANG</div>
            <h1 className="serif" style={{ fontSize: 48, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.05 }}>Toko Sembako Maju</h1>
            <div style={{ fontSize: 13.5, color: '#7A776F' }}>Jl. Diponegoro No. 24, Palu Timur · Shift Siang</div>
          </div>

          {/* Cashier picker */}
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 12 }}>PILIH KASIR · SELECT CASHIER</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
            {CASHIERS.map(c => (
              <div key={c.id} onClick={() => selectCashier(c.id)}
                style={{ flex: 1, background: '#fff', border: `1px solid ${selectedCashier === c.id ? '#0B1129' : '#ECE7DD'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: selectedCashier === c.id ? '#0B1129' : '#F2EDE3', color: selectedCashier === c.id ? '#F2EDE3' : '#7A776F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>{c.initials}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#7A776F' }}>{c.role}</div>
                </div>
                {selectedCashier === c.id && <div style={{ position: 'absolute', top: 9, right: 11, width: 6, height: 6, borderRadius: '50%', background: '#C9A55F' }} />}
              </div>
            ))}
          </div>

          {/* PIN dots */}
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#7A776F', textTransform: 'uppercase', marginBottom: 14 }}>MASUKKAN PIN · ENTER PIN</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 36 }}>
            {Array(6).fill(0).map((_, i) => {
              const filled = i < pin.length;
              const active = i === pin.length && pin.length < 6;
              return (
                <div key={i} style={{ width: 62, height: 62, borderRadius: 14, background: '#fff', border: active ? '1.5px solid #C9A55F' : '1px solid #ECE7DD', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? '0 0 0 4px rgba(201,165,95,0.12)' : 'none' }}>
                  {filled && <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0B1129' }} />}
                  {active && !filled && <div className="cursor" style={{ width: 2, height: 24, background: '#0B1129' }} />}
                </div>
              );
            })}
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} onClick={() => addPin(d)}
                style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 14, padding: '18px 0', fontSize: 22, fontWeight: 500, color: '#0B1129' }}>{d}</button>
            ))}
            <button onClick={clearPin} className="mono" style={{ background: 'transparent', border: 'none', borderRadius: 14, padding: '18px 0', fontSize: 12, color: '#7A776F', letterSpacing: '0.1em' }}>LUPA?</button>
            <button onClick={() => addPin('0')} style={{ background: '#fff', border: '1px solid #ECE7DD', borderRadius: 14, padding: '18px 0', fontSize: 22, fontWeight: 500, color: '#0B1129' }}>0</button>
            <button onClick={handleLogin} style={{ background: '#0B1129', border: 'none', borderRadius: 14, padding: '18px 0', fontSize: 13, color: '#F2EDE3', fontWeight: 500, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>MASUK</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
