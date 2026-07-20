import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore, startedAsInvite } from "../store";
import { appAuthSetup, appAuthSetupInfo } from "../lib/appAuth";
import { BUILD } from "../version";

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
  const [lang, setLang]           = useState<"id" | "en">("id");
  // New per-app setup link (?setup_token) → set THIS app's own password, no Supabase verify.
  const [setupToken] = useState(() => new URLSearchParams(window.location.search).get("setup_token") || "");

  useEffect(() => {
    if (setupToken) {
      // Setup flow: resolve the registered email for display, then show the form.
      appAuthSetupInfo(setupToken)
        .then(({ email }) => { if (email) setEmail(email); setExchanging(false); })
        .catch(() => { setExchanging(false); setError("Tautan sudah kadaluarsa atau dipakai. Minta tautan baru."); });
      return;
    }
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
    const linkType = pick("type");
    if (tokenHash && (linkType === "recovery" || linkType === "invite")) {
      supabase.auth.verifyOtp({ type: linkType as "recovery" | "invite", token_hash: tokenHash }).then(({ data, error: otpError }) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
    if (password !== confirm)  { setError("Konfirmasi password tidak cocok."); return; }
    setLoading(true); setError("");
    // New per-app setup: store the POS password via Master Office (no Supabase session).
    if (setupToken) {
      try { await appAuthSetup(setupToken, password); }
      catch (err) { setLoading(false); setError((err as Error).message || "Gagal menyimpan kata sandi."); return; }
      setLoading(false); setDone(true);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    await supabase.auth.signOut();
    setDone(true);
  }

  // ── Shared styles (mirrors OwnerLogin / Back Office login) ──
  const inputStyle: React.CSSProperties = { width: "100%", height: 46, boxSizing: "border-box", border: "1.5px solid #ddd9cc", borderRadius: 10, padding: "0 14px 0 42px", fontSize: 13, color: "#0D1117", background: "#fff", fontFamily: "Inter, sans-serif", outline: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8f897a", fontWeight: 600, marginBottom: 6 };
  const iconStyle: React.CSSProperties = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8f897a" };
  const eyeBtn: React.CSSProperties = { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8f897a", padding: 4, display: "flex" };

  const EnvelopeIcon = () => (
    <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
  );
  const LockIcon = () => (
    <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
  );
  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const fonts = <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>;

  const card = (
    <div style={{ width: "100%", maxWidth: 420, background: "#f8f6ef", borderRadius: 18, padding: "24px 30px 20px", border: "1px solid #ddd9cc", boxShadow: "0 8px 40px rgba(11,17,41,0.09)", boxSizing: "border-box" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.22)" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#8f897a", fontWeight: 600, textTransform: "uppercase" }}>Sesi Aman</span>
        </div>
        <button type="button" onClick={() => setLang(l => l === "id" ? "en" : "id")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #ddd9cc", borderRadius: 8, padding: "4px 9px", fontSize: 10.5, fontWeight: 600, color: "#0D1117", cursor: "pointer" }}>
          {lang.toUpperCase()}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>

      {/* Branding */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <img src="/horizontal-light.png" alt="Sterith" style={{ width: 190, maxWidth: "72%", display: "block", margin: "0 auto 6px", mixBlendMode: "multiply" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ height: 1, width: 30, background: "#b8934a", opacity: 0.6 }} />
          <span style={{ fontSize: 9, letterSpacing: "0.25em", color: "#b8934a", textTransform: "uppercase", fontWeight: 600 }}>Point of Sale</span>
          <div style={{ height: 1, width: 30, background: "#b8934a", opacity: 0.6 }} />
        </div>
      </div>

      {done ? (
        /* ── Success ── */
        <div style={{ textAlign: "center", padding: "4px 4px 8px", animation: "fadeUp .5s ease both" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#e9f1ea", display: "grid", placeItems: "center", margin: "0 auto 18px", position: "relative" }}>
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px dashed #cfe0d1" }} />
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#3f7d54" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3f7d54", fontWeight: 600, marginBottom: 8 }}>{(setupToken || startedAsInvite) ? "Berhasil · Kata Sandi Dibuat" : "Berhasil · Kata Sandi Diperbarui"}</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 500, color: "#0D1117", margin: "0 0 6px", lineHeight: 1.2 }}>{(setupToken || startedAsInvite) ? "Kata sandi Anda telah dibuat." : "Kata sandi baru tersimpan."}</h1>
          <p style={{ fontSize: 12, color: "#8f897a", lineHeight: 1.5, margin: "0 0 20px" }}>Silakan masuk kembali ke Sterith POS menggunakan kata sandi baru Anda.</p>
          <a href="https://pos.sterith.com" style={{ textDecoration: "none", height: 48, background: "#e7c987", color: "#0D1117", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Inter, sans-serif" }}>
            Login ke POS
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
        </div>

      ) : exchanging ? (
        <div style={{ padding: "24px 0 32px", textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: "#8f897a", fontFamily: "Inter, sans-serif", margin: 0 }}>Memverifikasi link…</p>
        </div>

      ) : error && !password ? (
        <div style={{ padding: "8px 0 20px", textAlign: "center", animation: "fadeUp .4s ease both" }}>
          <p style={{ fontSize: 12.5, color: "#b0492f", background: "#f4e9e4", padding: "11px 14px", borderRadius: 8, lineHeight: 1.5, margin: "0 0 18px" }}>{error}</p>
          <button onClick={() => setScreen("owner-login")} style={{ background: "transparent", border: "none", fontSize: 12, color: "#8f897a", cursor: "pointer", fontFamily: "Inter, sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
            ← Kembali ke login
          </button>
        </div>

      ) : (
        /* ── Form ── */
        <>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 500, color: "#0D1117", margin: "0 0 4px", lineHeight: 1.2 }}>
              {(setupToken || startedAsInvite) ? "Buat kata sandi Anda" : "Atur ulang kata sandi"}
            </h1>
            <p style={{ fontSize: 12, color: "#8f897a", lineHeight: 1.5, margin: 0 }}>
              {setupToken ? "Buat kata sandi khusus untuk Sterith POS." : startedAsInvite ? "Buat kata sandi untuk mulai menggunakan Sterith POS." : "Buat kata sandi baru untuk akun Anda."}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp .4s ease both" }}>

            {/* Email (read-only) */}
            <div>
              <label style={labelStyle}>Email Akun</label>
              <div style={{ position: "relative" }}>
                <EnvelopeIcon />
                <input type="email" value={email} readOnly placeholder="pemilik@toko.co.id"
                  style={{ ...inputStyle, background: "#f2f0e8", color: email ? "#0D1117" : "#a49d8c", caretColor: "transparent" }} />
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={labelStyle}>Kata Sandi Baru</label>
              <div style={{ position: "relative" }}>
                <LockIcon />
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter" required style={{ ...inputStyle, padding: "0 44px 0 42px" }} />
                <button type="button" style={eyeBtn} onClick={() => setShowPw(p => !p)}><EyeIcon /></button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={labelStyle}>Ketik Ulang Kata Sandi</label>
              <div style={{ position: "relative" }}>
                <LockIcon />
                <input type={showCf ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Ulangi kata sandi baru" required style={{ ...inputStyle, padding: "0 44px 0 42px" }} />
                <button type="button" style={eyeBtn} onClick={() => setShowCf(p => !p)}><EyeIcon /></button>
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: "#b0492f", background: "#f4e9e4", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{error}</p>}

            <button type="submit" disabled={loading} style={{ height: 48, background: "#e7c987", color: "#0D1117", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "Inter, sans-serif", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? "MENYIMPAN…" : setupToken ? "BUAT KATA SANDI" : startedAsInvite ? "BUAT KATA SANDI & MASUK" : "SIMPAN KATA SANDI BARU"}
              {!loading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
            </button>
          </form>
        </>
      )}

      {/* Security footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid #ddd9cc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b8a88a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 10, color: "#b8a88a", fontFamily: "Inter, sans-serif" }}>Terenkripsi · build {BUILD}</span>
        </div>
        <span style={{ fontSize: 10, color: "#b8a88a", fontFamily: "Inter, sans-serif" }}>© 2026 STERITH</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      {fonts}
      {card}
    </div>
  );
}
