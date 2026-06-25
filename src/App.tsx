import { useStore } from './store';
import PinLogin from './screens/PinLogin';
import Sales from './screens/Sales';
import Payment from './screens/Payment';
import Receipt from './screens/Receipt';

const SCREEN_NAMES: Record<string, string> = {
  login: 'Masuk Kasir',
  sales: 'Penjualan',
  payment: 'Pembayaran',
  receipt: 'Struk',
};
const SCREENS = ['login', 'sales', 'payment', 'receipt'];

export default function App() {
  const { screen, setScreen, restart } = useStore();
  const idx = SCREENS.indexOf(screen);

  function prev() {
    if (idx > 0) setScreen(SCREENS[idx - 1] as never);
  }
  function next() {
    if (idx < SCREENS.length - 1) setScreen(SCREENS[idx + 1] as never);
    else restart();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#EDE7DA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Tablet frame */}
      <div style={{ width: 1366, height: 900, maxWidth: '96vw', maxHeight: 'calc(100vh - 110px)', background: '#FAFAF7', borderRadius: 14, boxShadow: '0 30px 80px -20px rgba(11,17,41,0.35), 0 4px 16px rgba(11,17,41,0.10)', overflow: 'hidden', position: 'relative' }}>
        {screen === 'login' && <PinLogin />}
        {screen === 'sales' && <Sales />}
        {screen === 'payment' && <Payment />}
        {screen === 'receipt' && <Receipt />}
      </div>

      {/* Nav pill */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(11,17,41,0.94)', backdropFilter: 'blur(12px)', borderRadius: 999, padding: 6, boxShadow: '0 10px 30px rgba(11,17,41,0.25)', zIndex: 50 }}>
        <button onClick={prev} style={{ background: 'transparent', border: 'none', color: '#F2EDE3', width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', color: '#F2EDE3' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {SCREENS.map((s, i) => (
              <button key={s} onClick={() => setScreen(s as never)} style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}>
                <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: i === idx ? '#C9A55F' : 'rgba(242,237,227,0.25)' }} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(242,237,227,0.6)' }}>0{idx + 1} / 04</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{SCREEN_NAMES[screen]}</span>
          </div>
        </div>
        <button onClick={next} style={{ background: '#C9A55F', border: 'none', color: '#0B1129', width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{ position: 'fixed', bottom: 28, right: 24, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(11,17,41,0.5)', letterSpacing: '0.1em', display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ background: 'rgba(11,17,41,0.08)', padding: '3px 7px', borderRadius: 5 }}>←</span>
        <span style={{ background: 'rgba(11,17,41,0.08)', padding: '3px 7px', borderRadius: 5 }}>→</span>
        <span style={{ marginLeft: 6 }}>NAVIGATE</span>
      </div>
    </div>
  );
}
