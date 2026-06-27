import { useState } from "react";
import { useStore } from "../store";
import { supabase } from "../lib/supabase";
import type { CashierDB } from "../types";

const STRINGS = {
  id: {
    headingIn: "Masuk ke toko Anda",
    headingUp: "Daftar toko baru",
    subIn: "Masuk untuk mengelola toko Anda",
    subUp: "Buat akun Prospera POS baru",
    storeName: "NAMA TOKO",
    emailLabel: "EMAIL",
    pwLabel: "KATA SANDI",
    pwMin: "Minimal 6 karakter",
    forgot: "Lupa?",
    cta: "MASUK KE TOKO",
    ctaUp: "DAFTAR SEKARANG",
    ctaLoading: "Memproses…",
    demoPrompt: "Coba tanpa akun?",
    demoBtn: "COBA DEMO →",
    noAccount: "Belum punya akun?",
    register: "Daftar toko",
    hasAccount: "Sudah punya akun?",
    signIn: "Masuk",
    successMsg: "Akun dibuat! Cek email Anda untuk konfirmasi, lalu masuk.",
  },
  en: {
    headingIn: "Sign in to your store",
    headingUp: "Register new store",
    subIn: "Sign in to manage your store",
    subUp: "Create your Prospera POS account",
    storeName: "STORE NAME",
    emailLabel: "EMAIL",
    pwLabel: "PASSWORD",
    pwMin: "Minimum 6 characters",
    forgot: "Forgot?",
    cta: "SIGN IN TO STORE",
    ctaUp: "REGISTER NOW",
    ctaLoading: "Processing…",
    demoPrompt: "Try without an account?",
    demoBtn: "TRY DEMO →",
    noAccount: "Don't have an account?",
    register: "Register store",
    hasAccount: "Already have an account?",
    signIn: "Sign in",
    successMsg: "Account created! Check your email to confirm, then sign in.",
  },
};

function BrandLockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <svg width="44" height="44" viewBox="0 0 100 100">
        <rect x="10" y="62" width="14" height="26" rx="3" fill="#A6843F"/>
        <rect x="30" y="50" width="14" height="38" rx="3" fill="#C9A55F"/>
        <rect x="50" y="34" width="14" height="54" rx="3" fill="#D4B36C"/>
        <rect x="70" y="22" width="14" height="66" rx="3" fill="#E5C778"/>
        <polygon points="63,22 91,22 77,4" fill="#E5C778"/>
      </svg>
      <div style={{ width: 80, height: 1, background: "linear-gradient(to right, rgba(201,165,95,0), rgba(201,165,95,0.6), rgba(201,165,95,0))", margin: "7px 0 9px" }} />
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 32, letterSpacing: "0.06em", lineHeight: 1, color: "#0B1129" }}>PROSPERA</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, letterSpacing: "0.36em", color: "#C9A55F", marginTop: 5, lineHeight: 1 }}>BUSINESS&nbsp;CONSULTING</div>
    </div>
  );
}

export default function OwnerLogin() {
  const { setScreen, setStoreData } = useStore();
  const [lang, setLang] = useState<"id" | "en">("id");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const t = STRINGS[lang];

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { store_name: storeName } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setSuccess(t.successMsg);
      setMode("signin");
      setLoading(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    const userId = authData.user?.id;
    if (userId) {
      const { data: storeRows } = await supabase
        .from("stores")
        .select("id, name, address")
        .eq("owner_id", userId)
        .limit(1);
      if (storeRows && storeRows.length > 0) {
        const store = storeRows[0];
        const { data: cashierRows } = await supabase
          .from("cashiers")
          .select("*")
          .eq("store_id", store.id)
          .eq("active", true);
        setStoreData(store.id, store.name, store.address || "", (cashierRows ?? []) as CashierDB[]);
      }
    }

    setScreen("login");
  }

  return (
    <div className="w-full h-full bg-cream-deep flex items-center justify-center overflow-hidden" style={{ padding: "0 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=JetBrains+Mono:wght@400;500&display=swap');
      `}</style>
      <div style={{ width: "100%", maxWidth: 460, background: "#FAFAF7", border: "1px solid #ECE7DD", borderRadius: 18, padding: "22px 36px 18px", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px -24px rgba(11,17,41,0.18), 0 4px 16px rgba(11,17,41,0.06)" }}>

        {/* Mini chrome */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="w-[7px] h-[7px] rounded-full bg-success inline-block" style={{ boxShadow: "0 0 0 3px rgba(92,158,126,0.18)" }} />
            <span className="font-mono text-text-mute uppercase" style={{ fontSize: 9.5, letterSpacing: "0.18em" }}>SYSTEM READY</span>
          </div>
          <button
            onClick={() => setLang(l => l === "id" ? "en" : "id")}
            className="bg-white border border-warm-border flex items-center gap-1.5 text-navy hover:bg-cream-deep transition-colors"
            style={{ borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
            {lang.toUpperCase()}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        {/* Brand */}
        <div style={{ marginBottom: 12 }}>
          <BrandLockup />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <span style={{ flex: "0 0 28px", height: 1, background: "linear-gradient(to right, rgba(201,165,95,0), rgba(201,165,95,0.6))", display: "inline-block" }} />
            <span className="font-mono text-gold" style={{ fontSize: 9.5, letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 500 }}>POS · POINT OF SALE</span>
            <span style={{ flex: "0 0 28px", height: 1, background: "linear-gradient(to left, rgba(201,165,95,0), rgba(201,165,95,0.6))", display: "inline-block" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 14, textAlign: "center" }}>
          <h2 className="font-serif text-navy" style={{ fontSize: 28, fontWeight: 500, margin: "0 0 5px", letterSpacing: "-0.015em", lineHeight: 1.05 }}>
            {mode === "signin" ? t.headingIn : t.headingUp}
          </h2>
          <div className="text-text-mute" style={{ fontSize: 13 }}>
            {mode === "signin" ? t.subIn : t.subUp}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {mode === "signup" && (
            <div>
              <label style={{ display: "block", marginBottom: 7 }}>
                <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>{t.storeName}</span>
              </label>
              <div className="bg-white border border-warm-border flex items-center gap-[10px]" style={{ borderRadius: 11, padding: "0 14px", height: 46 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Toko Sembako Maju" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, padding: 0 }} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: 7 }}>
              <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>{t.emailLabel}</span>
            </label>
            <div className="bg-white border border-warm-border flex items-center gap-[10px]" style={{ borderRadius: 11, padding: "0 14px", height: 46 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@toko.id" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, padding: 0 }} />
            </div>
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>{t.pwLabel}</span>
              {mode === "signin" && (
                <button type="button" className="text-text-mute" style={{ background: "transparent", border: "none", padding: 0, fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(122,119,111,0.3)" }}>{t.forgot}</button>
              )}
            </label>
            <div className="bg-white border border-warm-border flex items-center gap-[10px]" style={{ borderRadius: 11, padding: "0 14px", height: 46 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, letterSpacing: showPw ? 0 : "0.1em", padding: 0 }} />
              <button type="button" onClick={() => setShowPw(p => !p)} className="text-text-mute" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            {mode === "signup" && <p className="text-text-mute mt-1" style={{ fontSize: 10.5 }}>{t.pwMin}</p>}
          </div>

          {error && (
            <div style={{ fontSize: 11.5, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "7px 12px" }}>{error}</div>
          )}
          {success && (
            <div style={{ fontSize: 11.5, color: "#5C9E7E", background: "rgba(92,158,126,0.06)", border: "1px solid rgba(92,158,126,0.2)", borderRadius: 8, padding: "7px 12px" }}>{success}</div>
          )}

          <button type="submit" disabled={loading} className="bg-navy text-cream-text flex items-center justify-center gap-3 hover:bg-navy-soft transition-colors" style={{ marginTop: 2, border: "none", borderRadius: 12, padding: "0 22px", height: 50, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", opacity: loading ? 0.75 : 1 }}>
            <span>{loading ? t.ctaLoading : mode === "signin" ? t.cta : t.ctaUp}</span>
            {!loading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
          </button>
        </form>

        {/* Demo bypass */}
        <div style={{ marginTop: 10, padding: "7px 12px", background: "rgba(201,165,95,0.07)", border: "1px dashed rgba(201,165,95,0.35)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-text-mute" style={{ fontSize: 11 }}>{t.demoPrompt}</span>
          <button type="button" onClick={() => setScreen("login")} className="font-mono text-gold" style={{ background: "transparent", border: "none", fontSize: 9.5, letterSpacing: "0.14em", cursor: "pointer", fontWeight: 600, textTransform: "uppercase" }}>
            {t.demoBtn}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-warm-border flex justify-between items-center" style={{ marginTop: 12, paddingTop: 11 }}>
          <div className="text-text-mute" style={{ fontSize: 11.5 }}>
            {mode === "signin" ? (
              <>{t.noAccount}{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(""); setSuccess(""); }} className="text-navy" style={{ background: "transparent", border: "none", padding: "0 0 0 3px", fontSize: 11.5, cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>{t.register}</button>
              </>
            ) : (
              <>{t.hasAccount}{" "}
                <button type="button" onClick={() => { setMode("signin"); setError(""); setSuccess(""); }} className="text-navy" style={{ background: "transparent", border: "none", padding: "0 0 0 3px", fontSize: 11.5, cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>{t.signIn}</button>
              </>
            )}
          </div>
          <div className="font-mono text-text-mute uppercase" style={{ fontSize: 9.5, letterSpacing: "0.18em" }}>© 2026 PROSPERA</div>
        </div>
      </div>
    </div>
  );
}
