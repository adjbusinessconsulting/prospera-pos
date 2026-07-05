import { useStore, isAtLeast } from "../store";
import { CASHIERS } from "../data";
import { useState, useEffect } from "react";

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
  const { selectedCashier, selectedShift, selectCashier, setShift, pin, addPin, removePin, clearPin, setScreen, storeName, storeAddress, storeTier, storeId, dbCashiers } = useStore();
  // Demo shows all features; Free locks non-current shifts
  const effectiveTier = storeId ? storeTier : 'premium';
  const canChangeShift = isAtLeast(effectiveTier, 'standard');
  const [pinError, setPinError] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cashierList = dbCashiers.length > 0
    ? dbCashiers
    : CASHIERS.map(c => ({ ...c, store_id: "", pin: "0000", active: true }));
  const displayName = storeName || "Toko Sembako Maju";
  const displayAddress = storeAddress || "Jl. Diponegoro No. 24, Palu Timur";
  const nowShift = currentShiftLabel();

  function handleLogin() {
    setPinError("");
    if (dbCashiers.length === 0) { setScreen("checkin"); return; }
    const cashier = dbCashiers.find(c => c.id === selectedCashier);
    if (!cashier) return;
    if (cashier.pin === pin) { setScreen("checkin"); }
    else { setPinError("PIN salah. Coba lagi."); clearPin(); }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("id-ID", { weekday: "long" });

  /* ── MOBILE: single-page no-scroll layout ── */
  if (isMobile) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F5F0E8", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid #ECE7DD", flexShrink: 0 }}>
          <img src="/horizontal-light.png" alt="Sterith" style={{ height: 34, width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.18)", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#7A776F" }}>{timeStr} · {dayStr}</span>
          </div>
        </div>

        {/* Store name */}
        <div style={{ padding: "10px 18px 6px", textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#0B1129", margin: 0, fontFamily: "Georgia, serif" }}>{displayName}</p>
          <p style={{ fontSize: 11, color: "#7A776F", margin: "2px 0 0" }}>{displayAddress}</p>
        </div>

        {/* Shift picker */}
        <div style={{ padding: "8px 18px", flexShrink: 0 }}>
          <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", marginBottom: 7, fontWeight: 600 }}>PILIH SHIFT</p>
          <div style={{ display: "flex", gap: 8 }}>
            {([1, 2, 3] as const).map(n => {
              const isNow = nowShift === n;
              const isActive = selectedShift === n;
              const shiftLocked = !canChangeShift && !isNow;
              return (
                <button key={n} onClick={() => { if (!shiftLocked) setShift(n); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 11.5, fontWeight: 500, border: isActive ? "2px solid #0B1129" : "1px solid #ECE7DD", background: isActive ? "#0B1129" : shiftLocked ? "#F7F4EE" : "white", color: isActive ? "#F5F0E8" : shiftLocked ? "#C4C0B8" : "#0B1129", position: "relative" as const, cursor: shiftLocked ? "not-allowed" : "pointer", opacity: shiftLocked ? 0.6 : 1 }}>
                  {SHIFT_LABELS[n]}
                  {isNow && <span style={{ position: "absolute" as const, top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "#C9A55F", color: "white", whiteSpace: "nowrap" as const, letterSpacing: "0.08em" }}>SKRNG</span>}
                  {shiftLocked && <span style={{ position: "absolute" as const, top: -8, right: 4, fontSize: 6.5, fontWeight: 700, padding: "1px 4px", borderRadius: 99, background: "#ECE7DD", color: "#A8A39B", whiteSpace: "nowrap" as const, letterSpacing: "0.08em" }}>STD</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cashier picker */}
        <div style={{ padding: "8px 18px", flexShrink: 0 }}>
          <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", marginBottom: 7, fontWeight: 600 }}>PILIH KASIR</p>
          <div style={{ display: "flex", gap: 8 }}>
            {cashierList.map(c => {
              const active = selectedCashier === c.id;
              return (
                <button key={c.id} onClick={() => { selectCashier(c.id); clearPin(); setPinError(""); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: active ? "2px solid #0B1129" : "1px solid #ECE7DD", background: "white", cursor: "pointer", position: "relative" as const }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: active ? "#0B1129" : "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: active ? "#C9A55F" : "#7A776F", flexShrink: 0 }}>
                    {c.initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0B1129" }}>{c.name}</span>
                  {active && <span style={{ position: "absolute" as const, top: 8, right: 10, width: 6, height: 6, borderRadius: "50%", background: "#C9A55F" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN dots */}
        <div style={{ padding: "8px 18px 4px", flexShrink: 0 }}>
          <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", marginBottom: 8, fontWeight: 600, textAlign: "center" as const }}>MASUKKAN PIN</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {Array(4).fill(0).map((_, i) => {
              const filled = i < pin.length;
              const active = i === pin.length && pin.length < 4;
              return (
                <div key={i} style={{ width: 54, height: 54, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center", border: pinError ? "1.5px solid #C25E3D" : active ? "1.5px solid #C9A55F" : "1px solid #ECE7DD", transition: "border-color 0.15s" }}>
                  {filled && <div style={{ width: 14, height: 14, borderRadius: "50%", background: pinError ? "#C25E3D" : "#0B1129" }} />}
                </div>
              );
            })}
          </div>
          <div style={{ minHeight: 20, textAlign: "center" as const, marginTop: 6 }}>
            {pinError && <p style={{ fontSize: 11, color: "#C25E3D", margin: 0 }}>{pinError}</p>}
          </div>
        </div>

        {/* Numpad — flex-1 so it fills all remaining height */}
        <div style={{ flex: 1, padding: "4px 18px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => { addPin(d); setPinError(""); }}
              style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, fontSize: 22, fontWeight: 500, color: "#0B1129", cursor: "pointer", transition: "background 0.1s" }}>
              {d}
            </button>
          ))}
          <button onClick={() => { removePin(); setPinError(""); }}
            style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#7A776F" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="13" y2="14"/><line x1="13" y1="9" x2="18" y2="14"/></svg>
          </button>
          <button onClick={() => { addPin("0"); setPinError(""); }}
            style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, fontSize: 22, fontWeight: 500, color: "#0B1129", cursor: "pointer" }}>
            0
          </button>
          <button onClick={() => pin.length >= 1 && handleLogin()}
            style={{ background: pin.length >= 1 ? "#0B1129" : "#ECE7DD", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: pin.length >= 1 ? "#F5F0E8" : "#7A776F", cursor: pin.length >= 1 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.1em", transition: "background 0.15s" }}>
            MASUK
            {pin.length >= 1 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
          </button>
        </div>

      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <div className="w-full h-full bg-cream-bg flex flex-col">
      <div className="flex justify-between items-center px-5 lg:px-12 py-4 lg:py-5 shrink-0">
        <img src="/horizontal-light.png" alt="Sterith Business Consulting" style={{ height: 52, width: "auto", display: "block" }} />
        <div className="flex items-center gap-4 text-[13px] text-text-mute">
          <div className="flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full bg-success shadow-sync-glow inline-block" />
            <span>Tersinkron · Synced</span>
          </div>
          <span className="text-warm-dashed">·</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[12px]">{timeStr} · {dayStr}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center px-8 py-6">
        <div className="w-full max-w-[620px]">
          <div className="text-center mb-6">
            <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-eyebrow uppercase text-gold mb-3">SELAMAT DATANG</p>
            <h1 className="font-serif text-display-xl font-medium text-navy mb-1.5">{displayName}</h1>
            <p className="text-[13.5px] text-text-mute">{displayAddress}</p>
          </div>

          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2.5">PILIH SHIFT</p>
          <div className="flex gap-2 mb-6">
            {([1, 2, 3] as const).map(n => {
              const isNow = nowShift === n;
              const isActive = selectedShift === n;
              const shiftLocked = !canChangeShift && !isNow;
              return (
                <button key={n} onClick={() => { if (!shiftLocked) setShift(n); }}
                  className={`flex-1 py-2.5 rounded-button text-[12.5px] font-medium border transition-all relative ${isActive ? "bg-navy text-cream-text border-navy" : shiftLocked ? "bg-cream-bg text-text-mute border-warm-border cursor-not-allowed opacity-60" : "bg-white text-navy border-warm-border"}`}>
                  {SHIFT_LABELS[n]}
                  {isNow && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-semibold px-[7px] py-[2px] rounded-full tracking-[0.1em] uppercase ${isActive ? "bg-gold text-navy" : "bg-gold-soft text-gold border border-gold/30"}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}>
                      SEKARANG
                    </span>
                  )}
                  {shiftLocked && (
                    <span className="absolute -top-2 right-1 text-[7px] font-bold px-[5px] py-[1px] rounded-full tracking-[0.1em] uppercase bg-warm-border text-text-mute">
                      STD
                    </span>
                  )}
                </button>
              );
            })}
          </div>

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

          {pinError && <p className="text-center text-[12px] mb-4" style={{ color: "#C25E3D" }}>{pinError}</p>}
          {!pinError && <div className="mb-4" />}

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
            <button onClick={() => pin.length >= 1 && handleLogin()}
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
