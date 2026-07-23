import { useStore, isAtLeast } from "../store";
import { CASHIERS } from "../data";
import { useState, useEffect } from "react";
import ManageStaff from "../components/ManageStaff";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";
import type { CashierDB } from "../types";

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

function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }
function shiftContainsNow(start: string, end: string, nowMin: number) {
  const a = toMin(start), b = toMin(end);
  if (a === b) return true;                 // 24h
  if (a < b) return nowMin >= a && nowMin < b;
  return nowMin >= a || nowMin < b;         // overnight
}

interface ShiftOption { pos: number; name: string; time: string; isNow: boolean; }

export default function PinLogin() {
  const { selectedCashier, selectedShift, selectCashier, setShift, pin, addPin, removePin, clearPin, setScreen, storeName, storeAddress, storeTier, storeId, dbCashiers, setDbCashiers, dbShifts, settings, isDemoMode, signOut } = useStore();
  // Demo shows all features; Free locks non-current shifts (only when shifts aren't configured)
  const effectiveTier = storeId ? storeTier : 'free';
  const canChangeShift = isAtLeast(effectiveTier, 'standard');
  // Free skips the PIN entirely. Standard & Premium require a PIN for everyone
  // (safety) — the owner can still turn it off in Pengaturan.
  const requiresPin = isAtLeast(effectiveTier, 'standard') && settings.pinWajib;
  const afterLogin = isAtLeast(effectiveTier, "standard") ? "checkin" : "sales";

  // First-run on a real store with no cashiers yet.
  //  Free     → owner names themselves (single Pemilik login, no PIN)
  //  Standard → create a cashier (with a PIN) here in POS
  //  Premium  → cashiers & shifts are built in Back Office; POS just receives them
  const isFreeTier = !isAtLeast(effectiveTier, "standard");
  const isPremium = isAtLeast(effectiveTier, "premium");
  const noCashiers = !isDemoMode && !!storeId && dbCashiers.length === 0;
  const needsCashierSetup = noCashiers && isFreeTier;
  const needsFirstCashierStd = noCashiers && !isFreeTier && !isPremium;
  const needsBackofficeSetup = noCashiers && isPremium;
  const [ownerName, setOwnerName] = useState("");
  const [savingName, setSavingName] = useState(false);

  async function startAsCashier() {
    const name = ownerName.trim();
    if (!name) return;
    setSavingName(true);
    const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const { data, error } = await supabase.from("cashiers")
      .insert({ store_id: storeId, name, initials, role: "Pemilik", pin: "", active: true })
      .select("*").single();
    setSavingName(false);
    if (error || !data) {
      // Don't silently proceed — a failed insert means the cashier vanishes on
      // next login (RLS or a missing column). Tell the owner why.
      alert(`Kasir belum tersimpan ke server: ${error?.message ?? "coba lagi"}`);
      return;
    }
    setDbCashiers([data as CashierDB]);
    selectCashier((data as CashierDB).id);
    setScreen(afterLogin);
  }

  const hasConfiguredShifts = dbShifts.length > 0;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const shiftOptions: ShiftOption[] = hasConfiguredShifts
    ? dbShifts.map((s, i) => ({ pos: i + 1, name: s.name, time: `${s.start_time}–${s.end_time}`, isNow: shiftContainsNow(s.start_time, s.end_time, nowMinutes) }))
    : ([1, 2, 3] as const).map(n => ({ pos: n, name: SHIFT_LABELS[n], time: "", isNow: currentShiftLabel() === n }));

  // Keep the selected cashier valid — if it points at a stale/demo id, snap it to
  // a real one so a card is highlighted and Masuk works.
  useEffect(() => {
    if (dbCashiers.length > 0 && !dbCashiers.some(c => c.id === selectedCashier)) {
      selectCashier(dbCashiers[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCashiers]);

  // When the store has configured shifts, default-select the one active right now
  useEffect(() => {
    if (dbShifts.length === 0) return;
    const cur = dbShifts.findIndex(s => shiftContainsNow(s.start_time, s.end_time, new Date().getHours() * 60 + new Date().getMinutes()));
    setShift(cur >= 0 ? cur + 1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pinError, setPinError] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Owner-only "Kelola" (manage kasir) button — real stores only, hidden in demo.
  // Premium manages cashiers & shifts in Back Office, so no in-POS Kelola.
  const manageBtn = storeId && !isPremium ? (
    <button onClick={() => setShowManage(true)}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#A6843F", fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
      Kelola
    </button>
  ) : null;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Real store with no cashiers yet → just the owner (add staff later in Kelola).
  // The 3 sample cashiers are demo-only.
  const cashierList = dbCashiers.length > 0
    ? dbCashiers
    : isDemoMode
      ? CASHIERS.map(c => ({ ...c, store_id: "", pin: "0000", active: true }))
      : [{ id: "owner", initials: "PM", name: "Pemilik", role: "Owner", store_id: "", pin: "", active: true }];
  // Demo placeholders only apply in demo mode — a real store shows its own name/
  // address (or nothing, never the demo "Jl. Diponegoro" address).
  const displayName = storeName || (isDemoMode ? "Toko Sembako Maju" : "Toko");
  const displayAddress = storeAddress || (isDemoMode ? "Jl. Diponegoro No. 24, Palu Timur" : "");

  // On successful auth: record who logged in + when (the log entry's timestamp
  // captures "jam berapa"), then route on. Skipped in demo.
  function completeLogin() {
    if (!isDemoMode && storeId) void logEvent("login", "Masuk / mulai shift");
    setScreen(afterLogin);
  }

  function handleLogin() {
    setPinError("");
    if (isDemoMode) { setScreen("sales"); return; }       // Demo: any PIN → straight to jualan
    // Shift check-in selfie is a staff-accountability feature — Standard+ only. A solo
    // Free owner (no PIN either) goes straight to jualan.
    if (dbCashiers.length === 0) { completeLogin(); return; }
    // Resolve the picked cashier — fall back to the first if the selection is stale
    // (a leftover demo/owner id), so Masuk never silently does nothing.
    const cashier = dbCashiers.find(c => c.id === selectedCashier) ?? dbCashiers[0];
    if (!requiresPin) { completeLogin(); return; }  // PIN off (Free, or Standard+ trusted team)
    // Compare as trimmed strings — the DB may return the PIN as a number or with
    // stray whitespace, which would make a strict === fail on a correct PIN.
    const storedPin = String(cashier.pin ?? "").trim();
    // No PIN configured for this cashier (e.g. owner created before PIN was
    // required, or a tier change). Can't gate on a PIN that doesn't exist — let
    // them in rather than locking the owner out; they can set one in Kelola.
    if (storedPin === "") { completeLogin(); return; }
    if (storedPin === pin.trim()) { completeLogin(); }
    else { setPinError("PIN salah. Coba lagi."); clearPin(); }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("id-ID", { weekday: "long" });

  /* ── First-run: capture who's on the till (no PIN, real store, no cashiers) ── */
  if (needsCashierSetup) {
    return (
      <div style={{ height: "100%", minHeight: 0, background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px", overflowY: "auto", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <img src="/horizontal-light.png" alt="Sterith" style={{ height: 40, width: "auto", margin: "0 auto 14px", display: "block", mixBlendMode: "multiply" }} />
            <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b8934a", fontWeight: 600, margin: "0 0 6px" }}>Selamat Datang di {displayName}</p>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 600, color: "#0D1117", margin: "0 0 4px" }}>Siapa yang bertugas?</h1>
            <p style={{ fontSize: 12.5, color: "#7A776F", margin: 0, lineHeight: 1.5 }}>Tulis nama kasir/pemilik. Nama ini muncul di struk & laporan. Tanpa PIN.</p>
          </div>
          <label style={{ display: "block", fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>Nama Kasir</label>
          <input autoFocus value={ownerName} onChange={e => setOwnerName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") startAsCashier(); }}
            placeholder="mis. Budi Santoso"
            style={{ width: "100%", height: 50, boxSizing: "border-box", border: "1.5px solid #ddd9cc", borderRadius: 12, padding: "0 16px", fontSize: 15, color: "#0D1117", background: "#fff", outline: "none", fontFamily: "'Hanken Grotesk', sans-serif" }} />
          <button onClick={startAsCashier} disabled={!ownerName.trim() || savingName}
            style={{ width: "100%", height: 52, marginTop: 14, borderRadius: 12, border: "none", background: ownerName.trim() ? "#0D1117" : "#D8D2C4", color: ownerName.trim() ? "#F5F0E8" : "#8A857C", fontSize: 14, fontWeight: 700, cursor: ownerName.trim() && !savingName ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            {savingName ? "Menyimpan…" : "Mulai Berjualan"}
            {!savingName && ownerName.trim() && <span style={{ color: "#e7c987", fontWeight: 700 }}>→</span>}
          </button>
          <p style={{ fontSize: 11, color: "#B8B0A8", textAlign: "center", margin: "14px 0 0" }}>Bisa ditambah/diubah nanti di menu Kelola.</p>
        </div>
      </div>
    );
  }

  /* ── First-run for Standard+: create the first cashier (PIN + owner approval) ── */
  if (needsBackofficeSetup) {
    return (
      <div style={{ height: "100%", minHeight: 0, background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px", overflowY: "auto", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <img src="/horizontal-light.png" alt="Sterith" style={{ height: 40, width: "auto", margin: "0 auto 14px", display: "block", mixBlendMode: "multiply" }} />
          <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b8934a", fontWeight: 600, margin: "0 0 6px" }}>Selamat Datang di {displayName}</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 600, color: "#0D1117", margin: "0 0 8px" }}>Atur kasir & shift di Back Office</h1>
          <p style={{ fontSize: 12.5, color: "#7A776F", margin: "0 0 18px", lineHeight: 1.6 }}>Untuk paket <b style={{ color: "#0D1117" }}>Premium</b>, kasir, shift, dan pengaturan toko dikelola dari <b style={{ color: "#0D1117" }}>Back Office</b> (backoffice.sterith.com) dengan akun pemilik Anda. Setelah kasir dibuat di sana, langsung muncul di sini — front office tinggal pakai.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center", background: "rgba(201,165,95,0.08)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 11, padding: "12px 14px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            <span style={{ fontSize: 11.5, color: "#0D1117", lineHeight: 1.5, textAlign: "left" }}>Buka <b>Back Office</b> → menu <b>Manajemen · Staf</b> untuk menambah kasir &amp; PIN.</span>
          </div>
          {/* Escape hatches so a Premium owner isn't stranded here before staff exist. */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => window.location.reload()}
              style={{ flex: 1, height: 44, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Muat ulang
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); signOut(); }}
              style={{ flex: 1, height: 44, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#7A776F", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsFirstCashierStd) {
    return (
      <div style={{ height: "100%", minHeight: 0, background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px", overflowY: "auto", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <img src="/horizontal-light.png" alt="Sterith" style={{ height: 40, width: "auto", margin: "0 auto 14px", display: "block", mixBlendMode: "multiply" }} />
          <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#b8934a", fontWeight: 600, margin: "0 0 6px" }}>Selamat Datang di {displayName}</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 600, color: "#0D1117", margin: "0 0 6px" }}>Buat kasir pertama</h1>
          <p style={{ fontSize: 12.5, color: "#7A776F", margin: "0 0 20px", lineHeight: 1.5 }}>Tambahkan minimal satu kasir beserta PIN untuk mulai. Menyimpan kasir perlu persetujuan kata sandi pemilik.</p>
          <button onClick={() => setShowManage(true)}
            style={{ width: "100%", height: 52, borderRadius: 12, border: "none", background: "#0D1117", color: "#F5F0E8", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            Buat Kasir <span style={{ color: "#e7c987", fontWeight: 700 }}>→</span>
          </button>
        </div>
        {showManage && <ManageStaff onClose={() => setShowManage(false)} />}
      </div>
    );
  }

  /* ── MOBILE: single-page no-scroll layout ── */
  if (isMobile) {
    return (
      <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: "#FAFAF7", overflowY: "auto", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>

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
          <p style={{ fontSize: 16, fontWeight: 700, color: "#0D1117", margin: 0, fontFamily: "Georgia, serif" }}>{displayName}</p>
          <p style={{ fontSize: 11, color: "#7A776F", margin: "2px 0 0" }}>{displayAddress}</p>
        </div>

        {/* Shift picker */}
        <div style={{ padding: "8px 18px", flexShrink: 0 }}>
          <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", marginBottom: 7, fontWeight: 600 }}>PILIH SHIFT</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shiftOptions.map(o => {
              const isActive = selectedShift === o.pos;
              const shiftLocked = !hasConfiguredShifts && !canChangeShift && !o.isNow;
              return (
                <button key={o.pos} onClick={() => { if (!shiftLocked) setShift(o.pos); }} style={{ flex: "1 1 28%", minWidth: 90, padding: "8px 6px", borderRadius: 9, fontSize: 11.5, fontWeight: 500, border: isActive ? "2px solid #0D1117" : "1px solid #ECE7DD", background: isActive ? "#0D1117" : shiftLocked ? "#F7F4EE" : "white", color: isActive ? "#FAFAF7" : shiftLocked ? "#C4C0B8" : "#0D1117", position: "relative" as const, cursor: shiftLocked ? "not-allowed" : "pointer", opacity: shiftLocked ? 0.6 : 1 }}>
                  <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</span>
                  {o.time && <span style={{ display: "block", fontSize: 8.5, opacity: 0.7, marginTop: 1, fontVariantNumeric: "tabular-nums" as const }}>{o.time}</span>}
                  {o.isNow && <span style={{ position: "absolute" as const, top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "#C9A55F", color: "white", whiteSpace: "nowrap" as const, letterSpacing: "0.08em" }}>SKRNG</span>}
                  {shiftLocked && <span style={{ position: "absolute" as const, top: -8, right: 4, fontSize: 6.5, fontWeight: 700, padding: "1px 4px", borderRadius: 99, background: "#ECE7DD", color: "#A8A39B", whiteSpace: "nowrap" as const, letterSpacing: "0.08em" }}>STD</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cashier picker */}
        <div style={{ padding: "8px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 600, margin: 0 }}>PILIH KASIR</p>
            {manageBtn}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {cashierList.map(c => {
              const active = selectedCashier === c.id;
              return (
                <button key={c.id} onClick={() => { selectCashier(c.id); clearPin(); setPinError(""); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: active ? "2px solid #0D1117" : "1px solid #ECE7DD", background: "white", cursor: "pointer", position: "relative" as const }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: active ? "#0D1117" : "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: active ? "#C9A55F" : "#7A776F", flexShrink: 0 }}>
                    {c.initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{c.name}</span>
                  {active && <span style={{ position: "absolute" as const, top: 8, right: 10, width: 6, height: 6, borderRadius: "50%", background: "#C9A55F" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {requiresPin ? (
          <>
            {/* PIN dots */}
            <div style={{ padding: "8px 18px 4px", flexShrink: 0 }}>
              <p style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", marginBottom: 8, fontWeight: 600, textAlign: "center" as const }}>{isDemoMode ? "MASUKKAN PIN · DEMO: ANGKA APA SAJA" : "MASUKKAN PIN"}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {Array(6).fill(0).map((_, i) => {
                  const filled = i < pin.length;
                  const active = i === pin.length && pin.length < 6;
                  return (
                    <div key={i} style={{ width: 42, height: 48, borderRadius: 11, background: "white", display: "flex", alignItems: "center", justifyContent: "center", border: pinError ? "1.5px solid #C25E3D" : active ? "1.5px solid #C9A55F" : "1px solid #ECE7DD", transition: "border-color 0.15s" }}>
                      {filled && <div style={{ width: 12, height: 12, borderRadius: "50%", background: pinError ? "#C25E3D" : "#0D1117" }} />}
                    </div>
                  );
                })}
              </div>
              <div style={{ minHeight: 20, textAlign: "center" as const, marginTop: 6 }}>
                {pinError && <p style={{ fontSize: 11, color: "#C25E3D", margin: 0 }}>{pinError}</p>}
              </div>
            </div>

            {/* Numpad — flex-1 fills remaining height; minHeight keeps keys tappable
                when space is tight (e.g. under the demo control bar). */}
            <div style={{ flex: 1, minHeight: 300, padding: "4px 18px calc(16px + env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {["1","2","3","4","5","6","7","8","9"].map(d => (
                <button key={d} onClick={() => { addPin(d); setPinError(""); }}
                  style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, fontSize: 22, fontWeight: 500, color: "#0D1117", cursor: "pointer", transition: "background 0.1s" }}>
                  {d}
                </button>
              ))}
              <button onClick={() => { removePin(); setPinError(""); }}
                style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#7A776F" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="13" y2="14"/><line x1="13" y1="9" x2="18" y2="14"/></svg>
              </button>
              <button onClick={() => { addPin("0"); setPinError(""); }}
                style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, fontSize: 22, fontWeight: 500, color: "#0D1117", cursor: "pointer" }}>
                0
              </button>
              <button onClick={() => pin.length >= 1 && handleLogin()}
                style={{ background: pin.length >= 1 ? "#0D1117" : "#ECE7DD", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, color: pin.length >= 1 ? "#FAFAF7" : "#7A776F", cursor: pin.length >= 1 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.1em", transition: "background 0.15s" }}>
                MASUK
                {pin.length >= 1 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </>
        ) : (
          /* Free: no PIN — tap MASUK to start */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "8px 18px 18px" }}>
            <p style={{ fontSize: 11.5, color: "#A8A39B", textAlign: "center", margin: "0 0 12px" }}>Pilih kasir &amp; shift, lalu ketuk Masuk</p>
            <button onClick={handleLogin}
              style={{ height: 56, background: "#0D1117", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#FAFAF7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, letterSpacing: "0.08em" }}>
              MASUK
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}

        {showManage && <ManageStaff onClose={() => setShowManage(false)} />}
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

      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center px-8 py-3">
        <div className="w-full" style={{ maxWidth: 480 }}>
          <div className="text-center mb-2.5">
            <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-eyebrow uppercase text-gold mb-1">SELAMAT DATANG</p>
            <h1 className="font-serif text-[22px] font-medium text-navy leading-tight">{displayName}</h1>
            {displayAddress && <p className="text-[12.5px] text-text-mute mt-0.5">{displayAddress}</p>}
          </div>

          <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2">PILIH SHIFT</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {shiftOptions.map(o => {
              const isActive = selectedShift === o.pos;
              const shiftLocked = !hasConfiguredShifts && !canChangeShift && !o.isNow;
              return (
                <button key={o.pos} onClick={() => { if (!shiftLocked) setShift(o.pos); }}
                  className={`flex-1 min-w-[110px] py-2.5 px-2 rounded-button text-[12.5px] font-medium border transition-all relative ${isActive ? "bg-navy text-cream-text border-navy" : shiftLocked ? "bg-cream-bg text-text-mute border-warm-border cursor-not-allowed opacity-60" : "bg-white text-navy border-warm-border"}`}>
                  <span className="block truncate">{o.name}</span>
                  {o.time && <span className="block text-[9px] opacity-70 mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>{o.time}</span>}
                  {o.isNow && (
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

          <div className="flex items-center justify-between mb-2">
            <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute">PILIH KASIR · SELECT CASHIER</p>
            {manageBtn}
          </div>
          <div className="flex gap-2.5 mb-4">
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

          {requiresPin ? (
            <>
              <p style={{ fontVariantNumeric: "tabular-nums" }} className="font-sans text-[10px] tracking-[0.18em] uppercase text-text-mute mb-2">MASUKKAN PIN · ENTER PIN</p>
              <div className="flex gap-2.5 justify-center mb-2">
                {Array(6).fill(0).map((_, i) => {
                  const filled = i < pin.length;
                  const active = i === pin.length && pin.length < 6;
                  return (
                    <div key={i} style={{ width: 44, height: 46 }} className={`rounded-card bg-white flex items-center justify-center border transition-all ${pinError ? "border-warning border-[1.5px]" : active ? "border-gold border-[1.5px] shadow-pin-glow" : "border-warm-border"}`}>
                      {filled && <div className={`w-4 h-4 rounded-full ${pinError ? "bg-warning" : "bg-navy"}`} />}
                      {active && !filled && <div className="w-0.5 h-6 bg-navy cursor-blink" />}
                    </div>
                  );
                })}
              </div>

              <div className="h-5 mb-1 text-center">
                {pinError && <p className="text-[12px]" style={{ color: "#C25E3D" }}>{pinError}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map(d => (
                  <button key={d} onClick={() => { addPin(d); setPinError(""); }} style={{ height: 44 }}
                    className="bg-white border border-warm-border rounded-card text-[18px] font-medium text-navy hover:bg-cream-pill transition-colors">
                    {d}
                  </button>
                ))}
                <button onClick={() => { removePin(); setPinError(""); }} style={{ height: 44 }}
                  className="rounded-card flex items-center justify-center bg-transparent border-0 text-text-mute hover:text-navy transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="13" y2="14"/><line x1="13" y1="9" x2="18" y2="14"/></svg>
                </button>
                <button onClick={() => { addPin("0"); setPinError(""); }} style={{ height: 44 }}
                  className="bg-white border border-warm-border rounded-card text-[18px] font-medium text-navy hover:bg-cream-pill transition-colors">
                  0
                </button>
                <button onClick={() => pin.length >= 1 && handleLogin()} style={{ height: 44 }}
                  className={`rounded-card flex items-center justify-center gap-2 text-[13px] font-medium tracking-[0.1em] transition-colors ${pin.length >= 1 ? "bg-navy text-cream-text hover:bg-navy-soft" : "bg-warm-border text-text-mute cursor-not-allowed"}`}>
                  <span>MASUK</span>
                  {pin.length >= 1 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
                </button>
              </div>
            </>
          ) : (
            /* Free: no PIN — one tap to start */
            <>
              <p className="text-center text-[12.5px] text-text-mute mb-4">Pilih kasir &amp; shift, lalu ketuk Masuk untuk mulai.</p>
              <button onClick={handleLogin}
                className="w-full rounded-card py-4 flex items-center justify-center gap-2.5 text-[14px] font-semibold tracking-[0.08em] bg-navy text-cream-text hover:bg-navy-soft transition-colors">
                <span>MASUK</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {showManage && <ManageStaff onClose={() => setShowManage(false)} />}
    </div>
  );
}
