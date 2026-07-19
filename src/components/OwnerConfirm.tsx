import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirmed: () => void;
}

// Re-verifies the OWNER's login password before a sensitive action (Free/Standard).
// Only the owner knows the email account password, so cashiers can't do it alone.
// Verification hits Supabase, so it needs a connection.
export function OwnerConfirm({ open, title, message, onClose, onConfirmed }: Props) {
  const isDemoMode = useStore((s) => s.isDemoMode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPw(""); setError("");
    if (isDemoMode) { setEmail("pemilik@demo.sterith.com"); return; }
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [open, isDemoMode]);

  if (!open) return null;

  async function confirm() {
    if (!pw) return;
    // Demo: no real account to reauth — any password confirms, so prospects can
    // experience the owner-verification step without credentials.
    if (isDemoMode) { onConfirmed(); return; }
    if (!email) return;
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (e) {
      setError(/network|fetch/i.test(e.message) ? "Perlu koneksi internet untuk verifikasi." : "Kata sandi pemilik salah.");
      return;
    }
    onConfirmed();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(11,17,41,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, background: "white", borderRadius: 18, padding: 24, boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(201,165,95,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A6843F" strokeWidth="1.9"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        </div>
        <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 700 }}>Konfirmasi Pemilik</p>
        <h3 style={{ margin: "4px 0 6px", fontSize: 18, fontWeight: 800, color: "#0D1117" }}>{title ?? "Butuh izin pemilik"}</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6 }}>
          {message ?? "Masukkan kata sandi akun pemilik untuk melanjutkan."}{email ? ` (${email})` : ""}
        </p>
        <input autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder="Kata sandi pemilik"
          style={{ width: "100%", height: 46, border: `1.5px solid ${error ? "#C25E3D" : "#ECE7DD"}`, borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#0D1117", outline: "none", boxSizing: "border-box" }} />
        {error && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#C25E3D" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
          <button onClick={confirm} disabled={loading || !pw} style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: loading || !pw ? "default" : "pointer", opacity: loading || !pw ? 0.6 : 1 }}>
            {loading ? "Memverifikasi…" : "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
