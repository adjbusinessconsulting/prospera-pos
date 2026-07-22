import { useState, useEffect } from "react";
import { useStore, kasirLimit, shiftSlotLimit, nextTierLabel } from "../store";
import { appAuthVerify } from "../lib/appAuth";
import { supabase } from "../lib/supabase";
import type { CashierDB, ShiftDef } from "../types";

const GK = "'Hanken Grotesk', system-ui, sans-serif";

// 24-hour time field the owner TYPES (no locale AM/PM picker). Accepts digits
// with an optional : or . separator; auto-inserts the colon and clamps to a
// valid 00:00–23:59 on blur. Value in/out is always "HH:MM", same as before.
function formatTimeInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);   // keep up to 4 digits
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}
function clampTime(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const h = Math.min(23, parseInt(d.slice(0, 2) || "0", 10) || 0);
  const m = Math.min(59, parseInt(d.slice(2, 4) || "0", 10) || 0);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function Time24({ value, onChange, style }: { value: string; onChange: (v: string) => void; style: React.CSSProperties }) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(formatTimeInput(e.target.value))}
      onBlur={(e) => onChange(clampTime(e.target.value))}
      placeholder="mis. 13:47"
      maxLength={5}
      style={{ ...style, textAlign: "center", letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums" }}
    />
  );
}

type DraftStatus = "existing" | "new" | "edited" | "deleted";
interface KasirDraft { key: string; id: string | null; name: string; initials: string; role: string; pin: string; status: DraftStatus; }
interface ShiftDraft { key: string; id: string; name: string; start_time: string; end_time: string; status: DraftStatus; }

function deriveInitials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
}
function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
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
  const { storeId, storeTier, isDemoMode, dbCashiers, dbShifts, setDbCashiers, setDbShifts } = useStore();

  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"kasir" | "shift">("kasir");

  const [kasir, setKasir] = useState<KasirDraft[]>([]);
  const [shiftsD, setShiftsD] = useState<ShiftDraft[]>([]);

  // Kasir form
  const [kName, setKName] = useState("");
  const [kInitials, setKInitials] = useState("");
  const [kInitialsTouched, setKInitialsTouched] = useState(false);
  const [kRole, setKRole] = useState("Kasir");
  const [kPin, setKPin] = useState("");
  const [kEditKey, setKEditKey] = useState<string | null>(null);
  const [kErr, setKErr] = useState("");

  // Shift form
  const [sName, setSName] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [sEditKey, setSEditKey] = useState<string | null>(null);
  const [sErr, setSErr] = useState("");

  // Confirm
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmErr, setConfirmErr] = useState("");

  useEffect(() => {
    // Demo: work entirely off local in-memory state — no login, no database.
    if (isDemoMode) {
      setKasir(dbCashiers.map((c) => ({ key: c.id, id: c.id, name: c.name, initials: c.initials, role: c.role, pin: c.pin, status: "existing" as DraftStatus })));
      setShiftsD(dbShifts.map((s) => ({ key: s.id, id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time, status: "existing" as DraftStatus })));
      setLoaded(true);
      return;
    }
    (async () => {
      const [{ data: cRows }, { data: sRows }] = await Promise.all([
        supabase.from("cashiers").select("*").eq("store_id", storeId).order("created_at"),
        supabase.from("shifts").select("*").eq("store_id", storeId).order("start_time"),
      ]);
      setKasir((cRows ?? []).map((c: CashierDB) => ({ key: c.id, id: c.id, name: c.name, initials: c.initials, role: c.role, pin: c.pin, status: "existing" as DraftStatus })));
      setShiftsD((sRows ?? []).map((s: ShiftDef) => ({ key: s.id, id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time, status: "existing" as DraftStatus })));
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo: apply staged changes to local store state (ephemeral — resets on reload), skip login + DB.
  function applyLocalAndClose() {
    const nextCashiers = kasir.filter((k) => k.status !== "deleted").map((k) => ({ id: k.id || genId(), store_id: storeId, name: k.name, initials: k.initials, role: k.role, pin: k.pin, active: true }));
    const nextShifts = shiftsD.filter((s) => s.status !== "deleted").map((s) => ({ id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time }));
    setDbCashiers(nextCashiers as CashierDB[]);
    setDbShifts(nextShifts as ShiftDef[]);
    onClose();
  }

  const kLimit = kasirLimit(storeTier);
  const sLimit = shiftSlotLimit(storeTier);
  const visKasir = kasir.filter(k => k.status !== "deleted");
  const visShifts = shiftsD.filter(s => s.status !== "deleted");
  const kLimitLabel = kLimit === Infinity ? "∞" : kLimit;
  const sLimitLabel = sLimit === Infinity ? "∞" : sLimit;
  const hasChanges = kasir.some(k => k.status !== "existing") || shiftsD.some(s => s.status !== "existing");

  // ── Kasir ops ──
  function resetKForm() { setKName(""); setKInitials(""); setKInitialsTouched(false); setKRole("Kasir"); setKPin(""); setKEditKey(null); setKErr(""); }
  function startEditKasir(k: KasirDraft) { setKEditKey(k.key); setKName(k.name); setKInitials(k.initials); setKInitialsTouched(true); setKRole(k.role); setKPin(k.pin); setKErr(""); }
  function saveKasir(e: React.FormEvent) {
    e.preventDefault();
    setKErr("");
    const initials = (kInitials || deriveInitials(kName)).toUpperCase().slice(0, 3);
    if (!kName.trim())          { setKErr("Nama karyawan wajib diisi."); return; }
    if (!/^\d{6}$/.test(kPin))  { setKErr("PIN harus 6 digit angka."); return; }
    if (!initials)              { setKErr("Inisial wajib diisi."); return; }
    if (kEditKey) {
      setKasir(list => list.map(k => k.key === kEditKey ? { ...k, name: kName.trim(), initials, role: kRole, pin: kPin, status: k.status === "new" ? "new" : "edited" } : k));
    } else {
      if (visKasir.length >= kLimit) { setKErr(`Batas ${kLimit} karyawan tercapai. Upgrade ke ${nextTierLabel(storeTier)}.`); return; }
      setKasir(list => [...list, { key: genId(), id: null, name: kName.trim(), initials, role: kRole, pin: kPin, status: "new" }]);
    }
    resetKForm();
  }
  function removeKasir(k: KasirDraft) {
    setKasir(list => k.status === "new" ? list.filter(x => x.key !== k.key) : list.map(x => x.key === k.key ? { ...x, status: "deleted" } : x));
    if (kEditKey === k.key) resetKForm();
  }

  // ── Shift ops ──
  function resetSForm() { setSName(""); setSStart(""); setSEnd(""); setSEditKey(null); setSErr(""); }
  function startEditShift(s: ShiftDraft) { setSEditKey(s.key); setSName(s.name); setSStart(s.start_time); setSEnd(s.end_time); setSErr(""); }
  function saveShift(e: React.FormEvent) {
    e.preventDefault();
    setSErr("");
    if (!sName.trim())      { setSErr("Nama shift wajib diisi."); return; }
    if (!sStart || !sEnd)   { setSErr("Jam mulai & selesai wajib diisi."); return; }
    if (sStart === sEnd)    { setSErr("Jam mulai dan selesai tidak boleh sama."); return; }
    const clash = visShifts.find(s => s.key !== sEditKey && shiftsOverlap(sStart, sEnd, s.start_time, s.end_time));
    if (clash) { setSErr(`Jam bertabrakan dengan "${clash.name}" (${clash.start_time}–${clash.end_time}).`); return; }
    if (sEditKey) {
      setShiftsD(list => list.map(s => s.key === sEditKey ? { ...s, name: sName.trim(), start_time: sStart, end_time: sEnd, status: s.status === "new" ? "new" : "edited" } : s));
      resetSForm();
    } else {
      if (visShifts.length >= sLimit) { setSErr(`Batas ${sLimit} shift tercapai. Upgrade ke ${nextTierLabel(storeTier)}.`); return; }
      setShiftsD(list => [...list, { key: genId(), id: genId(), name: sName.trim(), start_time: sStart, end_time: sEnd, status: "new" }]);
      // Chain the next shift: start where this one ended (owner can still change it).
      setSName(""); setSEnd(""); setSEditKey(null); setSErr(""); setSStart(sEnd);
    }
  }
  function removeShift(s: ShiftDraft) {
    setShiftsD(list => s.status === "new" ? list.filter(x => x.key !== s.key) : list.map(x => x.key === s.key ? { ...x, status: "deleted" } : x));
    if (sEditKey === s.key) resetSForm();
  }

  // ── Commit (after password confirm) ──
  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setConfirmErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setSaving(false); setConfirmErr("Sesi tidak ditemukan. Silakan login ulang."); return; }
    const ok = await appAuthVerify(user.email, password, "pos");
    if (!ok) { setSaving(false); setConfirmErr("Password salah. Coba lagi."); return; }
    try {
      for (const k of kasir) {
        if (k.status === "new") { const { error } = await supabase.from("cashiers").insert({ store_id: storeId, name: k.name, initials: k.initials, role: k.role, pin: k.pin, active: true }); if (error) throw error; }
        else if (k.status === "edited" && k.id) { const { error } = await supabase.from("cashiers").update({ name: k.name, initials: k.initials, role: k.role, pin: k.pin }).eq("id", k.id); if (error) throw error; }
        else if (k.status === "deleted" && k.id) { const { error } = await supabase.from("cashiers").delete().eq("id", k.id); if (error) throw error; }
      }
      for (const s of shiftsD) {
        if (s.status === "new") { const { error } = await supabase.from("shifts").insert({ id: s.id, store_id: storeId, name: s.name, start_time: s.start_time, end_time: s.end_time, assigned_cashier_id: null }); if (error) throw error; }
        else if (s.status === "edited") { const { error } = await supabase.from("shifts").update({ name: s.name, start_time: s.start_time, end_time: s.end_time }).eq("id", s.id); if (error) throw error; }
        else if (s.status === "deleted") { const { error } = await supabase.from("shifts").delete().eq("id", s.id); if (error) throw error; }
      }
    } catch (err) {
      setSaving(false);
      setConfirmErr((err as { message?: string })?.message ?? "Gagal menyimpan perubahan.");
      return;
    }
    // Refresh store with fresh data
    const [{ data: cRows }, { data: sRows }] = await Promise.all([
      supabase.from("cashiers").select("*").eq("store_id", storeId).eq("active", true).order("created_at"),
      supabase.from("shifts").select("id, name, start_time, end_time").eq("store_id", storeId).order("start_time"),
    ]);
    setDbCashiers((cRows ?? []) as CashierDB[]);
    setDbShifts((sRows ?? []) as ShiftDef[]);
    onClose();
  }

  const input: React.CSSProperties = { width: "100%", height: 44, border: "1px solid #ECE7DD", background: "#FAFAF7", borderRadius: 10, padding: "0 13px", fontSize: 14, color: "#0D1117", outline: "none", boxSizing: "border-box", fontFamily: GK };
  const label: React.CSSProperties = { fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, display: "block", marginBottom: 6 };
  const rowBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" };

  const editIcon = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  const trashIcon = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></svg>;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(11,17,41,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: GK }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !showConfirm) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 460, maxHeight: "92dvh", background: "#FAFAF7", borderRadius: 18, boxShadow: "0 24px 70px rgba(11,17,41,0.3)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #ECE7DD", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 600, margin: "0 0 3px" }}>Pemilik · Kelola</p>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, color: "#0D1117", margin: 0, lineHeight: 1 }}>Karyawan &amp; Shift</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A776F", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!loaded ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#A8A39B", fontSize: 13 }}>Memuat…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, padding: "12px 20px 0", flexShrink: 0 }}>
              {(["kasir", "shift"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 38, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: GK, fontSize: 12.5, fontWeight: 600, background: tab === t ? "#0D1117" : "white", color: tab === t ? "#FAFAF7" : "#7A776F", boxShadow: tab === t ? "none" : "inset 0 0 0 1px #ECE7DD" }}>
                  {t === "kasir" ? `Karyawan · ${visKasir.length}/${kLimitLabel}` : `Shift · ${visShifts.length}/${sLimitLabel}`}
                </button>
              ))}
            </div>

            {/* ── KARYAWAN ── */}
            {tab === "kasir" && (
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 8px", minHeight: 110 }}>
                  {visKasir.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#A8A39B", textAlign: "center", padding: "16px 0" }}>Belum ada karyawan. Tambahkan di bawah.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {visKasir.map(k => (
                        <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 11, background: kEditKey === k.key ? "#FBF6E9" : "white", border: kEditKey === k.key ? "1px solid #E4CE9A" : "1px solid #ECE7DD", borderRadius: 11, padding: "10px 12px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#7A776F", flexShrink: 0 }}>{k.initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0D1117" }}>{k.name}</div>
                            <div style={{ fontSize: 10.5, color: "#7A776F", marginTop: 1 }}>{k.role} · PIN ••••••</div>
                          </div>
                          <button onClick={() => startEditKasir(k)} title="Edit" style={{ ...rowBtn, border: "1px solid #ECE7DD", color: "#7A776F" }}>{editIcon}</button>
                          <button onClick={() => removeKasir(k)} title="Hapus" style={{ ...rowBtn, border: "1px solid rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)", color: "#C0392B" }}>{trashIcon}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #ECE7DD", padding: "14px 20px 16px", flexShrink: 0, background: "#FAFAF7" }}>
                  {!kEditKey && visKasir.length >= kLimit ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,165,95,0.08)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      <span style={{ fontSize: 12, color: "#0D1117", lineHeight: 1.5 }}>Batas {kLimit} karyawan tercapai. <strong>Upgrade ke {nextTierLabel(storeTier)}</strong>.</span>
                    </div>
                  ) : (
                    <form onSubmit={saveKasir} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, margin: 0 }}>{kEditKey ? "Edit Karyawan" : "Tambah Karyawan"}</p>
                        {kEditKey && <button type="button" onClick={resetKForm} style={{ background: "none", border: "none", fontSize: 11.5, color: "#7A776F", cursor: "pointer", textDecoration: "underline" }}>Batal edit</button>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={kName} onChange={(e) => { setKName(e.target.value); if (!kInitialsTouched) setKInitials(deriveInitials(e.target.value)); }} placeholder="Nama karyawan" style={{ ...input, flex: 1 }} />
                        <input value={kInitials} onChange={(e) => { setKInitials(e.target.value.toUpperCase().slice(0, 3)); setKInitialsTouched(true); }} placeholder="AB" maxLength={3} style={{ ...input, width: 60, textAlign: "center", letterSpacing: "0.1em" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select value={kRole} onChange={(e) => setKRole(e.target.value)} style={{ ...input, flex: 1, appearance: "none", cursor: "pointer" }}>
                          <option>Kasir</option><option>Supervisor</option><option>Pemilik</option>
                        </select>
                        <input type="password" value={kPin} onChange={(e) => setKPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN 6 digit" inputMode="numeric" autoComplete="new-password" style={{ ...input, width: 140, letterSpacing: "0.3em" }} />
                      </div>
                      {kErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{kErr}</div>}
                      <button type="submit" style={{ height: 42, borderRadius: 10, border: "none", background: "#0D1117", color: "#FAFAF7", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{kEditKey ? "Simpan Perubahan" : "Tambah Karyawan"}</button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ── SHIFT ── */}
            {tab === "shift" && (
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 8px", minHeight: 110 }}>
                  {visShifts.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#A8A39B", textAlign: "center", padding: "16px 0" }}>Belum ada shift. Tambahkan di bawah.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {visShifts.map(s => (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11, background: sEditKey === s.key ? "#FBF6E9" : "white", border: sEditKey === s.key ? "1px solid #E4CE9A" : "1px solid #ECE7DD", borderRadius: 11, padding: "10px 12px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", color: "#A6843F", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0D1117" }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: "#7A776F", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{s.start_time} – {s.end_time}</div>
                          </div>
                          <button onClick={() => startEditShift(s)} title="Edit" style={{ ...rowBtn, border: "1px solid #ECE7DD", color: "#7A776F" }}>{editIcon}</button>
                          <button onClick={() => removeShift(s)} title="Hapus" style={{ ...rowBtn, border: "1px solid rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)", color: "#C0392B" }}>{trashIcon}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #ECE7DD", padding: "14px 20px 16px", flexShrink: 0, background: "#FAFAF7" }}>
                  {!sEditKey && visShifts.length >= sLimit ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,165,95,0.08)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      <span style={{ fontSize: 12, color: "#0D1117", lineHeight: 1.5 }}>Batas {sLimit === 1 ? "1 shift" : `${sLimit} shift`} tercapai. <strong>Upgrade ke {nextTierLabel(storeTier)}</strong>.</span>
                    </div>
                  ) : (
                    <form onSubmit={saveShift} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, margin: 0 }}>{sEditKey ? "Edit Shift" : "Tambah Shift"}</p>
                        {sEditKey && <button type="button" onClick={resetSForm} style={{ background: "none", border: "none", fontSize: 11.5, color: "#7A776F", cursor: "pointer", textDecoration: "underline" }}>Batal edit</button>}
                      </div>
                      <input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Nama shift (mis. Shift Pagi)" style={input} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}><label style={label}>Mulai</label><Time24 value={sStart} onChange={setSStart} style={input} /></div>
                        <div style={{ flex: 1 }}><label style={label}>Selesai</label><Time24 value={sEnd} onChange={setSEnd} style={input} /></div>
                      </div>
                      {sErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{sErr}</div>}
                      <button type="submit" style={{ height: 42, borderRadius: 10, border: "none", background: "#0D1117", color: "#FAFAF7", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{sEditKey ? "Simpan Perubahan" : "Tambah Shift"}</button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Footer commit */}
            <div style={{ borderTop: "1px solid #ECE7DD", padding: "12px 20px 16px", flexShrink: 0 }}>
              <button onClick={() => !hasChanges ? onClose() : isDemoMode ? applyLocalAndClose() : setShowConfirm(true)}
                style={{ width: "100%", height: 46, borderRadius: 11, border: "none", background: hasChanges ? "#0D1117" : "white", color: hasChanges ? "#FAFAF7" : "#7A776F", boxShadow: hasChanges ? "none" : "inset 0 0 0 1px #ECE7DD", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em" }}>
                {hasChanges ? "Simpan & Konfirmasi →" : "Tutup"}
              </button>
            </div>
          </div>
        )}

        {/* ── Password-only confirmation ── */}
        {showConfirm && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(245,240,232,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <form onSubmit={handleConfirm} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 600, margin: "0 0 5px" }}>Konfirmasi Pemilik</p>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 600, color: "#0D1117", margin: "0 0 6px" }}>Masukkan password Anda</h3>
                <p style={{ fontSize: 12.5, color: "#7A776F", lineHeight: 1.55, margin: 0 }}>Masukkan password akun toko untuk menyimpan perubahan karyawan &amp; shift.</p>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required autoFocus autoComplete="current-password" style={input} />
              {confirmErr && <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{confirmErr}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setShowConfirm(false); setPassword(""); setConfirmErr(""); }} disabled={saving} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#FAFAF7", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Menyimpan…" : "Konfirmasi & Simpan"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
