import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

export default function ResetPassword() {
  const setScreen = useStore(s => s.setScreen);
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        setExchanging(false);
        if (err) setError("Link tidak valid atau sudah kadaluarsa. Silakan minta admin mengirim ulang.");
        window.history.replaceState({}, "", "/");
      });
    } else {
      setExchanging(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
    if (password !== confirm)  { setError("Konfirmasi password tidak cocok."); return; }
    setLoading(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    await supabase.auth.signOut();
    setDone(true);
  }

  const iField: React.CSSProperties = {
    width: "100%", height: 46, border: "1px solid #ECE7DD", borderRadius: 10,
    padding: "0 13px", fontSize: 14, color: "#0B1129", background: "white",
    outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "Inter, sans-serif" }}>

      {/* Logo */}
      <img src="/horizontal-light.png" alt="Sterith" style={{ height: 64, width: "auto", marginBottom: 32, objectFit: "contain" }} />

      <div style={{ width: "100%", maxWidth: 380, background: "white", borderRadius: 18, padding: "32px 32px 28px", boxShadow: "0 8px 48px rgba(11,17,41,0.10), 0 2px 8px rgba(11,17,41,0.04)" }}>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(92,158,126,0.10)", border: "1.5px solid rgba(92,158,126,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#0B1129", marginBottom: 8 }}>Password berhasil diubah</p>
            <p style={{ fontSize: 13, color: "#7A776F", lineHeight: 1.6, marginBottom: 24 }}>Silakan masuk kembali menggunakan password baru Anda.</p>
            <button onClick={() => setScreen("owner-login")}
              style={{ width: "100%", height: 48, borderRadius: 11, border: "none", background: "#0B1129", color: "#F2EDE3", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Masuk →
            </button>
          </div>
        ) : exchanging ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: 13, color: "#7A776F" }}>Memverifikasi link…</p>
          </div>
        ) : error && !password ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#C25E3D", marginBottom: 20 }}>{error}</p>
            <button onClick={() => setScreen("owner-login")}
              style={{ fontSize: 13, color: "#7A776F", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Kembali ke login
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7A776F", marginBottom: 5 }}>RESET PASSWORD</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "#0B1129", marginBottom: 4 }}>Buat password baru</p>
            <p style={{ fontSize: 12.5, color: "#B8B0A8", marginBottom: 24 }}>Masukkan password baru untuk akun POS Anda.</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>PASSWORD BARU</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    style={{ ...iField, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#A8A39B", display: "flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>KONFIRMASI PASSWORD</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  style={iField}
                />
              </div>

              {error && (
                <div style={{ fontSize: 11.5, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
              )}

              <button type="submit" disabled={loading}
                style={{ height: 50, borderRadius: 11, border: "none", background: "#0B1129", color: "#F2EDE3", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1, marginTop: 4 }}>
                {loading ? "Menyimpan…" : "Simpan Password Baru →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
