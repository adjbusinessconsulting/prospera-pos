import { useState } from "react";
import { useStore, kasirLimit, shiftSlotLimit, nextTierLabel } from "../store";
import { supabase } from "../lib/supabase";
import type { CashierDB } from "../types";

const GK = "Inter, system-ui, sans-serif";

interface ShiftRow {
  id: string;
  store_id: string;
  name: string;
  start_time: string;
  end_time: string;
  assigned_cashier_id: string | null;
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Shift time overlap detection (handles overnight shifts that cross midnight)
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }
function segments(start: string, end: string): [number, number][] {
  const a = toMin(start), b = toMin(end);
  if (a === b) return [[0, 1440]];
  if (a < b) return [[a, b]];
  return [[a, 1440], [0, b]];
}
function shiftsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const A = segments(aStart, aEnd), B = segments(bStart, bEnd);
  return A.some(([a1, a2]) => B.some(([b1, b2]) => a1 < b2 && b1 < a2));
}

export default function ManageStaff({ onClose }: { onClose: () => void }) {
  const { storeId, storeTier, dbCashiers, setDbCashiers } = useStore();

  // ── Owner identity gate ──
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [gateErr, setGateErr] = useState("");

  const [tab, setTab] = useState<"kasir" | "shift">("kasir");

  // ── Kasir form ──
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [role, setRole] = useState("Kasir");
  const [pin, setPin] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // ── Shift form ──
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [addingShift, setAddingShift] = useState(false);
  const [shiftErr, setShiftErr] = useState("");
  const [pendingShiftDelete, setPendingShiftDelete] = useState<string | null>(null);

  const kLimit = kasirLimit(storeTier);
  const sLimit = shiftSlotLimit(storeTier);
  const kCount = dbCashiers.length;
  const sCount = shifts.length;
  const kAtLimit = kCount >= kLimit;
  const sAtLimit = sCount >= sLimit;

  async function refreshCashiers() {
    const { data } = await supabase.from("cashiers").select("*").eq("store_id", storeId).order("created_at");
    if (data) setDbCashiers(data as CashierDB[]);
  }
  async function refreshShifts() {
    const { data } = await supabase.from("shifts").select("*").eq("store_id", storeId).order("start_time");
    if (data) setShifts(data as ShiftRow[]);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true); setGateErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
      setVerifying(false);
      setGateErr("Email tidak cocok dengan pemilik toko yang login.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setVerifying(false);
    if (error) { setGateErr("Password salah. Coba lagi."); return; }
    setAuthed(true);
    refreshCashiers();
    refreshShifts();
  }

  async function handleAddKasir(e: React.FormEvent) {
    e.preventDefault();
    setAddErr("");
    if (kAtLimit) { setAddErr(`Batas ${kLimit} kasir tercapai. Upgrade ke ${nextTierLabel(storeTier)}.`); return; }
    const finalInitials = (initials || deriveInitials(name)).toUpperCase().slice(0, 3);
    if (!name.trim())         { setAddErr("Nama kasir wajib diisi."); return; }
    if (!/^\d{4}$/.test(pin)) { setAddErr("PIN harus 4 digit angka."); return; }
    if (!finalInitials)       { setAddErr("Inisial wajib diisi."); return; }
    setAdding(true);
    const { error } = await supabase.from("cashiers").insert({
      store_id: storeId, name: name.trim(), initials: finalInitials, role, pin, active: true,
    });
    setAdding(false);
    if (error) { setAddErr(error.message); return; }
    setName(""); setInitials(""); setInitialsTouched(false); setRole("Kasir"); setPin("");
    refreshCashiers();
  }
  async function handleDeleteKasir(id: string) {
    await supabase.from("cashiers").delete().eq("id", id);
    setPendingDelete(null);
    refreshCashiers();
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    setShiftErr("");
    if (sAtLimit) { setShiftErr(`Batas ${sLimit} shift tercapai. Upgrade ke ${nextTierLabel(storeTier)}.`); return; }
    if (!shiftName.trim())        { setShiftErr("Nama shift wajib diisi."); return; }
    if (!startTime || !endTime)   { setShiftErr("Jam mulai & selesai wajib diisi."); return; }
    if (startTime === endTime)    { setShiftErr("Jam mulai dan selesai tidak boleh sama."); return; }
    const clash = shifts.find(s => shiftsOverlap(startTime, endTime, s.start_time, s.end_time));
    if (clash) { setShiftErr(`Jam bertabrakan dengan "${clash.name}" (${clash.start_time}–${clash.end_time}). Shift tidak boleh tumpang tindih.`); return; }
    setAddingShift(true);
    const { error } = await supabase.from("shifts").insert({
      id: genId(), store_id: storeId, name: shiftName.trim(), start_time: startTime, end_time: endTime, assigned_cashier_id: null,
    });
    setAddingShift(false);
    if (error) { setShiftErr(error.message); return; }
    setShiftName(""); setStartTime(""); setEndTime("");
    refreshShifts();
  }
  async function handleDeleteShift(id: string) {
    await supabase.from("shifts").delete().eq("id", id);
    setPendingShiftDelete(null);
    refreshShifts();
  }

  const input: React.CSSProperties = {
    width: "100%", height: 44, border: "1px solid #ECE7DD", background: "#FAFAF7", borderRadius: 10,
    padding: "0 13px", fontSize: 14, color: "#0B1129", outline: "none", boxSizing: "border-box", fontFamily: GK,
  };
  const label: React.CSSProperties = {
    fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600,
    display: "block", marginBottom: 6,
  };
  const kLimitLabel = kLimit === Infinity ? "∞" : kLimit;
  const sLimitLabel = sLimit === Infinity ? "∞" : sLimit;

  const trashIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></svg>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(11,17,41,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: GK }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, maxHeight: "92dvh", background: "#F5F0E8", borderRadius: 18, boxShadow: "0 24px 70px rgba(11,17,41,0.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #ECE7DD", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 600, margin: "0 0 3px" }}>Pemilik · Kelola</p>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, color: "#0B1129", margin: 0, lineHeight: 1 }}>Kelola Kasir &amp; Shift</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A776F", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!authed ? (
          /* ── Owner identity gate ── */
          <form onSubmit={handleVerify} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            <p style={{ fontSize: 13, color: "#7A776F", lineHeight: 1.6, margin: 0 }}>
              Konfirmasi identitas pemilik untuk mengelola kasir &amp; shift. Masukkan email &amp; password akun toko Anda.
            </p>
            <div>
              <label style={label}>Email pemilik</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pemilik@toko.co.id" required style={input} autoComplete="email" />
            </div>
            <div>
              <label style={label}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={input} autoComplete="current-password" />
            </div>
            {gateErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{gateErr}</div>}
            <button type="submit" disabled={verifying} style={{ height: 46, borderRadius: 11, border: "none", background: "#0B1129", color: "#F5F0E8", fontSize: 13, fontWeight: 600, cursor: verifying ? "default" : "pointer", opacity: verifying ? 0.7 : 1, letterSpacing: "0.03em" }}>
              {verifying ? "Memverifikasi…" : "Konfirmasi Identitas"}
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, padding: "12px 20px 0", flexShrink: 0 }}>
              {(["kasir", "shift"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, height: 38, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: GK, fontSize: 12.5, fontWeight: 600,
                  background: tab === t ? "#0B1129" : "white", color: tab === t ? "#F5F0E8" : "#7A776F",
                  boxShadow: tab === t ? "none" : "inset 0 0 0 1px #ECE7DD",
                }}>
                  {t === "kasir" ? `Kasir · ${kCount}/${kLimitLabel}` : `Shift · ${sCount}/${sLimitLabel}`}
                </button>
              ))}
            </div>

            {tab === "kasir" ? (
              /* ── KASIR ── */
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 8px", minHeight: 120 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dbCashiers.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "white", border: "1px solid #ECE7DD", borderRadius: 11, padding: "10px 12px" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#7A776F", flexShrink: 0 }}>{c.initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0B1129" }}>{c.name}</div>
                          <div style={{ fontSize: 10.5, color: "#7A776F", marginTop: 1 }}>{c.role}</div>
                        </div>
                        {pendingDelete === c.id ? (
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setPendingDelete(null)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid #ECE7DD", background: "white", fontSize: 11, color: "#7A776F", cursor: "pointer", fontFamily: GK }}>Batal</button>
                            <button onClick={() => handleDeleteKasir(c.id)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: GK }}>Hapus</button>
                          </div>
                        ) : (
                          <button onClick={() => setPendingDelete(c.id)} title="Hapus kasir" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)", color: "#C0392B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{trashIcon}</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #ECE7DD", padding: "14px 20px 18px", flexShrink: 0, background: "#FAFAF7" }}>
                  {kAtLimit ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,165,95,0.08)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      <span style={{ fontSize: 12, color: "#0B1129", lineHeight: 1.5 }}>Batas {kLimit} kasir tercapai. <strong>Upgrade ke {nextTierLabel(storeTier)}</strong> untuk menambah.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleAddKasir} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, margin: 0 }}>Tambah Kasir</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={name} onChange={(e) => { setName(e.target.value); if (!initialsTouched) setInitials(deriveInitials(e.target.value)); }} placeholder="Nama kasir" style={{ ...input, flex: 1 }} />
                        <input value={initials} onChange={(e) => { setInitials(e.target.value.toUpperCase().slice(0, 3)); setInitialsTouched(true); }} placeholder="AB" style={{ ...input, width: 62, textAlign: "center", letterSpacing: "0.1em" }} maxLength={3} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...input, flex: 1, appearance: "none", cursor: "pointer" }}>
                          <option>Kasir</option><option>Supervisor</option><option>Pemilik</option>
                        </select>
                        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN 4 digit" inputMode="numeric" style={{ ...input, width: 130, letterSpacing: "0.15em" }} />
                      </div>
                      {addErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{addErr}</div>}
                      <button type="submit" disabled={adding} style={{ height: 44, borderRadius: 10, border: "none", background: "#0B1129", color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, cursor: adding ? "default" : "pointer", opacity: adding ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {adding ? "Menyimpan…" : "Tambah Kasir"}
                        {!adding && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* ── SHIFT ── */
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 8px", minHeight: 120 }}>
                  {shifts.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#A8A39B", textAlign: "center", padding: "20px 0" }}>Belum ada shift. Tambahkan slot shift di bawah.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {shifts.map((s) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "white", border: "1px solid #ECE7DD", borderRadius: 11, padding: "10px 12px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", color: "#A6843F", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0B1129" }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: "#7A776F", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{s.start_time} – {s.end_time}</div>
                          </div>
                          {pendingShiftDelete === s.id ? (
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button onClick={() => setPendingShiftDelete(null)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid #ECE7DD", background: "white", fontSize: 11, color: "#7A776F", cursor: "pointer", fontFamily: GK }}>Batal</button>
                              <button onClick={() => handleDeleteShift(s.id)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: GK }}>Hapus</button>
                            </div>
                          ) : (
                            <button onClick={() => setPendingShiftDelete(s.id)} title="Hapus shift" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)", color: "#C0392B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{trashIcon}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #ECE7DD", padding: "14px 20px 18px", flexShrink: 0, background: "#FAFAF7" }}>
                  {sAtLimit ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,165,95,0.08)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      <span style={{ fontSize: 12, color: "#0B1129", lineHeight: 1.5 }}>Batas {sLimit === 1 ? "1 shift" : `${sLimit} shift`} tercapai. <strong>Upgrade ke {nextTierLabel(storeTier)}</strong> untuk menambah.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleAddShift} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, margin: 0 }}>Tambah Shift</p>
                      <input value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="Nama shift (mis. Shift Pagi)" style={input} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={label}>Mulai</label>
                          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={input} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={label}>Selesai</label>
                          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={input} />
                        </div>
                      </div>
                      {shiftErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{shiftErr}</div>}
                      <button type="submit" disabled={addingShift} style={{ height: 44, borderRadius: 10, border: "none", background: "#0B1129", color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, cursor: addingShift ? "default" : "pointer", opacity: addingShift ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {addingShift ? "Menyimpan…" : "Tambah Shift"}
                        {!addingShift && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
