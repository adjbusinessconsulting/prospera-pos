import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

const GK = "'Hanken Grotesk', system-ui, sans-serif";
const EBG = "'EB Garamond', Georgia, serif";

export default function ResetPassword() {
  const setScreen = useStore(s => s.setScreen);

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  useEffect(() => {
    let resolved = false;

    function resolve(userEmail: string | undefined, customError?: string) {
      if (resolved) return;
      resolved = true;
      setExchanging(false);
      if (userEmail) {
        setEmail(userEmail);
      } else {
        setError(customError ?? "Link tidak valid atau sudah kadaluarsa. Silakan minta link reset baru.");
      }
    }

    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const pick = (k: string) => q.get(k) ?? h.get(k);

    // 1) Supabase already rejected the link (expired / already used / scanner-consumed).
    if (pick("error") || pick("error_code")) {
      const code = pick("error_code");
      const msg = code === "otp_expired"
        ? "Link reset sudah kadaluarsa atau sudah dipakai. Silakan minta link reset baru."
        : "Link tidak valid. Silakan minta link reset baru.";
      resolve(undefined, msg);
      return;
    }

    // 2) Scanner-proof flow: the email link carries a token_hash we verify ourselves.
    //    (Email scanners loading the page don't run this call, so the token survives.)
    const tokenHash = pick("token_hash");
    if (tokenHash && pick("type") === "recovery") {
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ data, error: otpError }) => {
        if (otpError) {
          resolve(undefined, "Link reset sudah kadaluarsa atau sudah dipakai. Silakan minta link reset baru.");
        } else if (data.session?.user?.email) {
          resolve(data.session.user.email);
        }
      });
    }

    // 3) Implicit / PKCE flow: Supabase establishes the session from the URL itself.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) resolve(session.user.email);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        resolve(session?.user?.email);
      }
    });

    // Fallback: if nothing resolves in 10s, show a generic error
    const timeout = setTimeout(() => resolve(undefined), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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

  const inputWrap: React.CSSProperties = {
    position: "relative",
  };
  const inputBase: React.CSSProperties = {
    width: "100%",
    border: "1px solid #e0dac9",
    background: "#fbfaf5",
    borderRadius: 10,
    padding: "12px 12px 12px 36px",
    font: `500 14px/1 ${GK}`,
    color: "#14203a",
    outline: "none",
    boxSizing: "border-box",
  };
  const iconLeft: React.CSSProperties = {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#a49d8c",
    display: "flex",
    pointerEvents: "none",
  };
  const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "grid",
    placeItems: "center" as const,
    color: "#a49d8c",
    background: "none",
    border: "none",
    cursor: "pointer",
  };
  const labelStyle: React.CSSProperties = {
    font: `600 10px/1 ${GK}`,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#a49d8c",
    display: "block",
    marginBottom: 8,
  };

  const EnvelopeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
    </svg>
  );
  const LockIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
    </svg>
  );
  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#d8d3c2", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "20px 16px", fontFamily: GK }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#eceadf", borderRadius: 20, boxShadow: "0 20px 60px rgba(15,20,30,.18)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "16px 24px 2px", flexShrink: 0 }}>
          <img src="/logo-pos.png" alt="Sterith Business Consulting — POS" style={{ height: 104, width: "auto", objectFit: "contain" }} />
        </div>

        {done ? (
          /* ── Success screen ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px 36px 40px", textAlign: "center", animation: "fadeUp .5s ease both" }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

            <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#e9f1ea", display: "grid", placeItems: "center", marginBottom: 28, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: -12, borderRadius: "50%", border: "1px dashed #cfe0d1" }} />
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3f7d54" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>

            <div style={{ font: `600 10.5px/1.4 ${GK}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3f7d54", marginBottom: 12 }}>Berhasil · Kata Sandi Diperbarui</div>
            <h1 style={{ font: `500 30px/1.15 ${EBG}`, color: "#14203a", margin: "0 0 12px" }}>Kata sandi baru Anda telah tersimpan.</h1>
            <p style={{ font: `400 13.5px/1.6 ${GK}`, color: "#8f897a", margin: "0 0 32px", maxWidth: 320 }}>Silakan masuk kembali ke Sterith POS menggunakan kata sandi baru Anda.</p>

            <a href="https://pos.sterith.com" style={{ textDecoration: "none", width: "100%", background: "#14203a", color: "#fff", borderRadius: 11, padding: "14px 18px", font: `600 13.5px/1 ${GK}`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              Login ke POS
              <span style={{ color: "#e7c987", fontWeight: 700 }}>→</span>
            </a>

            <div style={{ marginTop: 20, font: `500 12.5px/1 ${GK}`, color: "#8f897a" }}>
              Butuh bantuan? <a href="#" style={{ color: "#14203a", textDecoration: "none", fontWeight: 600 }}>Layanan</a>
            </div>
          </div>

        ) : exchanging ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <p style={{ font: `400 13.5px/1 ${GK}`, color: "#8f897a" }}>Memverifikasi link…</p>
          </div>

        ) : error && !password ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 36px 40px", textAlign: "center" }}>
            <p style={{ font: `400 13.5px/1.6 ${GK}`, color: "#c25e3d", marginBottom: 20 }}>{error}</p>
            <button onClick={() => setScreen("owner-login")} style={{ font: `500 13px/1 ${GK}`, color: "#8f897a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Kembali ke login
            </button>
          </div>

        ) : (
          /* ── Form screen ── */
          <div style={{ flex: 1, padding: "2px 24px 20px", animation: "fadeUp .4s ease both" }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

            <div style={{ font: `600 10.5px/1.4 ${GK}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#b8934a", marginBottom: 7 }}>Akun · Pengaturan Ulang</div>
            <h1 style={{ font: `500 24px/1.1 ${EBG}`, color: "#14203a", margin: "0 0 6px" }}>Atur ulang kata sandi</h1>
            <p style={{ font: `400 13px/1.5 ${GK}`, color: "#8f897a", margin: "0 0 14px" }}>Masukkan email Anda dan buat kata sandi baru untuk melanjutkan.</p>

            <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e8e3d5", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Email (pre-filled, readonly) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Email</label>
                <div style={inputWrap}>
                  <span style={iconLeft}><EnvelopeIcon /></span>
                  <input type="email" value={email} readOnly placeholder="pemilik@toko.co.id"
                    style={{ ...inputBase, color: email ? "#14203a" : "#a49d8c", caretColor: "transparent" }} />
                </div>
              </div>

              {/* New password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Kata sandi baru</label>
                <div style={inputWrap}>
                  <span style={iconLeft}><LockIcon /></span>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter" required
                    style={{ ...inputBase, paddingRight: 42 }} />
                  <button type="button" style={eyeBtn} onClick={() => setShowPw(p => !p)}><EyeIcon /></button>
                </div>
              </div>

              {/* Confirm password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Ketik ulang kata sandi</label>
                <div style={inputWrap}>
                  <span style={iconLeft}><LockIcon /></span>
                  <input type={showCf ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Ulangi kata sandi baru" required
                    style={{ ...inputBase, paddingRight: 42 }} />
                  <button type="button" style={eyeBtn} onClick={() => setShowCf(p => !p)}><EyeIcon /></button>
                </div>
              </div>

              {error && (
                <div style={{ font: `400 12px/1.5 ${GK}`, color: "#c25e3d", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "9px 12px" }}>{error}</div>
              )}

              <button type="submit" disabled={loading}
                style={{ marginTop: 2, background: "#14203a", color: "#fff", borderRadius: 11, padding: "13px 18px", font: `600 13.5px/1 ${GK}`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1 }}>
                {loading ? "Menyimpan…" : "Simpan kata sandi baru"}
                {!loading && <span style={{ color: "#e7c987", fontWeight: 700 }}>→</span>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 12, font: `500 12.5px/1 ${GK}`, color: "#8f897a" }}>
              Butuh bantuan? <a href="#" style={{ color: "#14203a", textDecoration: "none", fontWeight: 600 }}>Layanan</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
