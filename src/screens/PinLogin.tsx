import { useStore } from "../store";
import { CASHIERS } from "../data";
import { useState } from "react";

function currentShiftLabel(): 1 | 2 | 3 {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

const SHIFT_LABELS: Record<1 | 2 | 3, string> = {
  1: "Shift 1 · Pagi",
  2: "Shift 2 · Siang",
  3: "Shift 3 · Malam",
};

export default function PinLogin() {
  const { selectedCashier, selectedShift, selectCashier, setShift, pin, addPin, removePin, clearPin, setScreen, storeName, storeAddress, dbCashiers } = useStore();
  const [pinError, setPinError] = useState("");

  const cashierList = dbCashiers.length > 0
    ? dbCashiers
    : CASHIERS.map(c => ({ ...c, store_id: "", pin: "0000", active: true }));
  const displayName = storeName || "Toko Sembako Maju";
  const displayAddress = storeAddress || "Jl. Diponegoro No. 24, Palu Timur";
  const nowShift = currentShiftLabel();

  function handleLogin() {
    setPinError("");
    if (dbCashiers.length === 0) {
      setScreen("sales");
      return;
    }
    const cashier = dbCashiers.find(c => c.id === selectedCashier);
    if (!cashier) return;
    if (cashier.pin === pin) {
      setScreen("sales");
    } else {
      setPinError("PIN salah. Coba lagi.");
      clearPin();
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("id-ID", { weekday: "long" });

  return (
    <div className="w-full h-full bg-cream-bg flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center px-5 lg:px-12 py-4 lg:py-5 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/horizontal-light.png" alt="Sterith Business Consulting" style={{ height: 52, width: "auto", display: "block" }} />
        </div>
        <div className="flex items-center gap-4 text-[13px] text-text-mute">
          <div className="flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full bg-success shadow-sync-glow inline-block" />
            <span>Tersinkron · Synced</span>
          </div>
          <span className="text-warm-dashed">·</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[12px]">{timeStr} · {dayStr}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto flex items-start justify-center px-8 py-6">
        <div className="w-full max-w-[620px]">
          {/* Store greeting */}
          <div className="text-center mb-6">
            <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-eyebrow uppercase text-gold mb-3">SELAMAT DATANG</p>
            <h1 className="font-serif text-display-xl font-medium text-navy mb-1.5">{displayName}</h1>
            <p className="text-[13.5px] text-text-mute">{displayAddress}</p>
          </div>

          {/* Shift picker */}
          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2.5">PILIH SHIFT</p>
          <div className="flex gap-2 mb-6">
            {([1, 2, 3] as const).map(n => {
              const isNow = nowShift === n;
              const isActive = selectedShift === n;
              return (
                <button key={n} onClick={() => setShift(n)}
                  className={`flex-1 py-2.5 rounded-button text-[12.5px] font-medium border transition-all relative ${isActive ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border"}`}>
                  {SHIFT_LABELS[n]}
                  {isNow && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-semibold px-[7px] py-[2px] rounded-full tracking-[0.1em] uppercase ${isActive ? "bg-gold text-navy" : "bg-gold-soft text-gold border border-gold/30"}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}>
                      SEKARANG
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cashier picker */}
          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2.5">PILIH KASIR · SELECT CASHIER</p>
          <div className="flex gap-2.5 mb-6">
            {cashierList.map(c => {
              const active = selectedCashier === c.id;
              return (
                <button key={c.id} onClick={() => { selectCashier(c.id); clearPin(); setPinError(""); }}
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
          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-3">MASUKKAN PIN · ENTER PIN</p>
          <div className="flex gap-3 justify-center mb-3">
            {Array(4).fill(0).map((_, i) => {
              const filled = i < pin.length;
              const active = i === pin.length && pin.length < 4;
              return (
                <div key={i} className={`w-[72px] h-[72px] rounded-card bg-white flex items-center justify-center border transition-all ${pinError ? "border-warning border-[1.5px]" : active ? "border-gold border-[1.5px] shadow-pin-glow" : "border-warm-border"}`}>
                  {filled && <div className={`w-4 h-4 rounded-full ${pinError ? "bg-warning" : "bg-navy"}`} />}
                  {active && !filled && <div className="w-0.5 h-6 bg-navy cursor-blink" />}
                </div>
              );
            })}
          </div>

          {/* PIN error */}
          {pinError && (
            <p className="text-center text-[12px] mb-4" style={{ color: "#C25E3D" }}>{pinError}</p>
          )}
          {!pinError && <div className="mb-4" />}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} onClick={() => { addPin(d); setPinError(""); }}
                className="bg-white border border-warm-border rounded-card py-4 text-[22px] font-medium text-navy hover:bg-cream-pill transition-colors">
                {d}
              </button>
            ))}
            <button onClick={() => { removePin(); setPinError(""); }}
              className="rounded-card py-4 flex items-center justify-center bg-transparent border-0 text-text-mute hover:text-navy transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="13" y2="14"/><line x1="13" y1="9" x2="18" y2="14"/></svg>
            </button>
            <button onClick={() => { addPin("0"); setPinError(""); }}
              className="bg-white border border-warm-border rounded-card py-4 text-[22px] font-medium text-navy hover:bg-cream-pill transition-colors">
              0
            </button>
            <button
              onClick={() => pin.length >= 1 && handleLogin()}
              className={`rounded-card py-4 flex items-center justify-center gap-2 text-[13px] font-medium tracking-[0.1em] transition-colors ${pin.length >= 1 ? "bg-navy text-cream-text hover:bg-navy-soft" : "bg-warm-border text-text-mute cursor-not-allowed"}`}>
              <span>MASUK</span>
              {pin.length >= 1 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
