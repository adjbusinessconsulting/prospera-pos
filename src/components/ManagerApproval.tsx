import { useEffect, useState } from "react";
import { useStore } from "../store";
import { supabase } from "../lib/supabase";
import { appAuthVerify } from "../lib/appAuth";
import { verifyApproval, PERM_LABELS } from "../lib/managerAuth";

interface Props {
  open: boolean;
  action: string;               // e.g. "products", "void", "discount"
  onClose: () => void;
  onApproved: () => void;
}

// Manager-override approval (Phase 2). A cashier/manager triggering a gated action
// must enter a PIN or password (per the store's approvalMethod) belonging to the owner
// or a manager the owner authorized for this action.
export function ManagerApproval({ open, action, onClose, onApproved }: Props) {
  const settings = useStore(s => s.settings);
  const dbCashiers = useStore(s => s.dbCashiers);
  const isDemoMode = useStore(s => s.isDemoMode);
  const method = settings.approvalMethod === "password" ? "password" : "pin";
  const managerPerms = settings.managerPerms ?? {};
  const [cred, setCred] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setCred(""); setError(""); } }, [open]);
  if (!open) return null;

  async function confirm() {
    if (!cred.trim()) return;
    if (isDemoMode) { onApproved(); return; }   // demo: any input approves (show the flow)
    if (verifyApproval(action, cred, method, dbCashiers, managerPerms)) { onApproved(); return; }
    // Owner fallback (password method): the owner can always approve with their
    // account login password — no separate "approval password" to set up.
    if (method === "password") {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (email && await appAuthVerify(email, cred, "pos")) { onApproved(); return; }
    }
    setError(method === "password" ? "Kata sandi tidak berwenang." : "PIN tidak berwenang untuk tindakan ini.");
  }

  const label = PERM_LABELS[action] ?? "tindakan ini";
  const credLabel = method === "password" ? "kata sandi" : "PIN";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(11,17,41,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, background: "white", borderRadius: 18, padding: 24, boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(201,165,95,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.9"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        </div>
        <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 700 }}>Persetujuan Manajer</p>
        <h3 style={{ margin: "4px 0 6px", fontSize: 18, fontWeight: 800, color: "#0D1117" }}>Butuh izin: {label}</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6 }}>
          Masukkan {credLabel} pemilik atau manajer yang berwenang.
        </p>
        <input autoFocus type="password" inputMode={method === "pin" ? "numeric" : undefined}
          value={cred} onChange={e => setCred(e.target.value)} onKeyDown={e => e.key === "Enter" && confirm()}
          placeholder={method === "password" ? "Kata sandi" : "PIN 6-digit"}
          style={{ width: "100%", height: 46, border: `1.5px solid ${error ? "#C25E3D" : "#ECE7DD"}`, borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#0D1117", outline: "none", boxSizing: "border-box", letterSpacing: method === "pin" ? "0.3em" : "normal" }} />
        {error && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#C25E3D" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
          <button onClick={confirm} disabled={!cred.trim()} style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: cred.trim() ? "pointer" : "default", opacity: cred.trim() ? 1 : 0.6 }}>Setujui</button>
        </div>
      </div>
    </div>
  );
}
