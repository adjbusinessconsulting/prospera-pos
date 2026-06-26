import { useStore } from "../store";
import { CASHIERS } from "../data";

export default function PinLogin() {
  const { selectedCashier, selectCashier, pin, addPin, clearPin, setScreen } = useStore();

  return (
    <div className="w-full h-full bg-cream-bg flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center px-12 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/mark-navy-512.png" className="w-8 h-8 object-contain" alt="Prospera" />
          <div>
            <div className="font-sans font-bold text-[15px] tracking-caps text-navy leading-none">PROSPERA</div>
            <div className="font-mono text-[9.5px] tracking-eyebrow text-text-mute uppercase mt-0.5">POINT OF SALE</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-text-mute">
          <div className="flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full bg-success shadow-sync-glow inline-block" />
            <span>Tersinkron · Synced</span>
          </div>
          <span className="text-warm-dashed">·</span>
          <span className="font-mono text-[12px]">14:32 · Selasa</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto flex items-start justify-center px-8 py-6">
        <div className="w-full max-w-[620px]">
          {/* Store greeting */}
          <div className="text-center mb-7">
            <p className="font-mono text-[10px] tracking-eyebrow uppercase text-gold mb-3">SELAMAT DATANG</p>
            <h1 className="font-serif text-display-xl font-medium text-navy mb-1.5">Toko Sembako Maju</h1>
            <p className="text-[13.5px] text-text-mute">Jl. Diponegoro No. 24, Palu Timur · Shift Siang</p>
          </div>

          {/* Cashier picker */}
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2.5">PILIH KASIR · SELECT CASHIER</p>
          <div className="flex gap-2.5 mb-7">
            {CASHIERS.map(c => {
              const active = selectedCashier === c.id;
              return (
                <button key={c.id} onClick={() => { selectCashier(c.id); clearPin(); }}
                  className={`flex-1 flex items-center gap-3 rounded-card px-4 py-3 relative text-left border transition-colors ${active ? "border-navy" : "border-warm-border"} bg-white`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px] shrink-0 ${active ? "bg-navy text-cream-text" : "bg-cream-pill text-text-mute"}`}>
                    {c.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-[14px] text-navy">{c.name}</div>
                    <div className="text-[11px] text-text-mute mt-0.5">{c.role}</div>
                  </div>
                  {active && <span className="absolute top-[9px] right-[11px] w-1.5 h-1.5 rounded-full bg-gold" />}
                </button>
              );
            })}
          </div>

          {/* PIN dots */}
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-mute mb-3">MASUKKAN PIN · ENTER PIN</p>
          <div className="flex gap-3 justify-center mb-7">
            {Array(6).fill(0).map((_, i) => {
              const filled = i < pin.length;
              const active = i === pin.length && pin.length < 6;
              return (
                <div key={i} className={`w-[58px] h-[58px] rounded-card bg-white flex items-center justify-center border transition-all ${active ? "border-gold border-[1.5px] shadow-pin-glow" : "border-warm-border"}`}>
                  {filled && <div className="w-3.5 h-3.5 rounded-full bg-navy" />}
                  {active && !filled && <div className="w-0.5 h-5 bg-navy cursor-blink" />}
                </div>
              );
            })}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} onClick={() => addPin(d)}
                className="bg-white border border-warm-border rounded-card py-4 text-[22px] font-medium text-navy hover:bg-cream-pill transition-colors">
                {d}
              </button>
            ))}
            <button onClick={clearPin}
              className="font-mono text-[12px] text-text-mute rounded-card py-4 bg-transparent border-0 hover:text-navy transition-colors">
              LUPA?
            </button>
            <button onClick={() => addPin("0")}
              className="bg-white border border-warm-border rounded-card py-4 text-[22px] font-medium text-navy hover:bg-cream-pill transition-colors">
              0
            </button>
            <button onClick={() => pin.length >= 1 && setScreen("sales")}
              className={`rounded-card py-4 flex items-center justify-center gap-2 text-[13px] font-medium tracking-mono-tight transition-colors ${pin.length >= 1 ? "bg-navy text-cream-text hover:bg-navy-soft" : "bg-warm-border text-text-mute cursor-not-allowed"}`}>
              <span>MASUK</span>
              {pin.length >= 1 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
