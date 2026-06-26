import { useState } from "react";
import { useStore } from "../store";
import { supabase } from "../lib/supabase";

export default function OwnerLogin() {
  const setScreen = useStore(s => s.setScreen);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
      setSuccess("Akun berhasil dibuat! Cek email Anda untuk konfirmasi, lalu masuk.");
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    setScreen("login");
  }

  return (
    <div className="w-full h-full bg-cream-deep flex items-center justify-center overflow-auto" style={{ padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#FAFAF7", border: "1px solid #ECE7DD", borderRadius: 18, padding: "44px 44px 36px", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px -24px rgba(11,17,41,0.18), 0 4px 16px rgba(11,17,41,0.06)" }}>

        {/* Mini chrome */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.18)", display: "inline-block" }} />
            <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>SYSTEM READY</span>
          </div>
          <button className="bg-white border border-warm-border rounded-[8px] flex items-center gap-1.5 text-navy" style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
            <span>ID</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <img src="/horizontal-light.png" alt="Prospera" style={{ height: 96, width: "auto", objectFit: "contain", marginBottom: 18 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "0 0 28px", height: 1, background: "linear-gradient(to right, rgba(201,165,95,0), rgba(201,165,95,0.6))", display: "inline-block" }} />
            <span className="font-mono text-gold" style={{ fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 500 }}>POS · POINT OF SALE</span>
            <span style={{ flex: "0 0 28px", height: 1, background: "linear-gradient(to left, rgba(201,165,95,0), rgba(201,165,95,0.6))", display: "inline-block" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 30, textAlign: "center" }}>
          <h2 className="font-serif text-navy" style={{ fontSize: 38, fontWeight: 500, margin: "0 0 8px", letterSpacing: "-0.015em", lineHeight: 1.05 }}>
            {mode === "signin" ? "Masuk ke toko Anda" : "Daftar toko baru"}
          </h2>
          <div className="text-text-mute" style={{ fontSize: 13.5 }}>
            {mode === "signin" ? "Sign in to manage your store" : "Create your Prospera POS account"}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Store name (sign up only) */}
          {mode === "signup" && (
            <div>
              <label style={{ display: "block", marginBottom: 8 }}>
                <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>NAMA TOKO · STORE NAME</span>
              </label>
              <div className="bg-white border border-warm-border rounded-[11px] flex items-center gap-[10px]" style={{ padding: "0 14px", height: 50, transition: "border-color 0.15s, box-shadow 0.15s" }}
                onFocus={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 4px rgba(11,17,41,0.06)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#0B1129"; }}
                onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; (e.currentTarget as HTMLDivElement).style.borderColor = "#ECE7DD"; } }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Toko Sembako Maju" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, padding: 0 }} />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{ display: "block", marginBottom: 8 }}>
              <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>EMAIL · NOMOR WHATSAPP</span>
            </label>
            <div className="bg-white border border-warm-border rounded-[11px] flex items-center gap-[10px]" style={{ padding: "0 14px", height: 50, transition: "border-color 0.15s, box-shadow 0.15s" }}
              onFocus={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 4px rgba(11,17,41,0.06)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#0B1129"; }}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; (e.currentTarget as HTMLDivElement).style.borderColor = "#ECE7DD"; } }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@toko.id" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, padding: 0 }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span className="font-mono text-text-mute uppercase" style={{ fontSize: 10, letterSpacing: "0.22em" }}>KATA SANDI · PASSWORD</span>
              {mode === "signin" && (
                <button type="button" className="text-text-mute" style={{ background: "transparent", border: "none", padding: 0, fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(122,119,111,0.3)" }}>Lupa?</button>
              )}
            </label>
            <div className="bg-white border border-warm-border rounded-[11px] flex items-center gap-[10px]" style={{ padding: "0 14px", height: 50, transition: "border-color 0.15s, box-shadow 0.15s" }}
              onFocus={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 4px rgba(11,17,41,0.06)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#0B1129"; }}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; (e.currentTarget as HTMLDivElement).style.borderColor = "#ECE7DD"; } }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="flex-1 bg-transparent border-0 outline-none text-navy" style={{ fontSize: 14.5, letterSpacing: showPw ? 0 : "0.1em", padding: 0 }} />
              <button type="button" onClick={() => setShowPw(p => !p)} className="text-text-mute" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            {mode === "signup" && <p className="text-text-mute mt-1.5" style={{ fontSize: 11 }}>Minimal 6 karakter</p>}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
          )}
          {success && (
            <div style={{ fontSize: 12, color: "#5C9E7E", background: "rgba(92,158,126,0.06)", border: "1px solid rgba(92,158,126,0.2)", borderRadius: 8, padding: "8px 12px" }}>{success}</div>
          )}

          {/* CTA */}
          <button type="submit" disabled={loading} className="bg-navy text-cream-text flex items-center justify-center gap-3 hover:bg-navy-soft transition-colors" style={{ marginTop: 8, border: "none", borderRadius: 12, padding: "0 22px", height: 54, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", opacity: loading ? 0.75 : 1 }}>
            <span>{loading ? "Memproses…" : mode === "signin" ? "MASUK KE TOKO" : "DAFTAR SEKARANG"}</span>
            {!loading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
          </button>
        </form>

        {/* Manager notice (sign in only) */}
        {mode === "signin" && (
          <div className="bg-white border border-warm-border flex items-start gap-[10px]" style={{ marginTop: 18, padding: "12px 14px", borderRadius: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <div className="text-text-mute" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Khusus pemilik / manajer toko. Kasir akan login dengan PIN di tablet setelah Anda buka shift.
            </div>
          </div>
        )}

        {/* Demo mode */}
        <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(201,165,95,0.07)", border: "1px dashed rgba(201,165,95,0.35)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-text-mute" style={{ fontSize: 11.5 }}>Ingin coba dulu tanpa akun?</span>
          <button type="button" onClick={() => setScreen("login")} className="font-mono text-gold" style={{ background: "transparent", border: "none", fontSize: 10, letterSpacing: "0.14em", cursor: "pointer", fontWeight: 600, textTransform: "uppercase" }}>
            COBA DEMO →
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-warm-border flex justify-between items-center" style={{ marginTop: 20, paddingTop: 18 }}>
          <div className="text-text-mute" style={{ fontSize: 11.5 }}>
            {mode === "signin" ? (
              <>Belum punya akun?{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(""); setSuccess(""); }} className="text-navy" style={{ background: "transparent", border: "none", padding: "0 0 0 4px", fontSize: 11.5, cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>Daftar toko</button>
              </>
            ) : (
              <>Sudah punya akun?{" "}
                <button type="button" onClick={() => { setMode("signin"); setError(""); setSuccess(""); }} className="text-navy" style={{ background: "transparent", border: "none", padding: "0 0 0 4px", fontSize: 11.5, cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>Masuk</button>
              </>
            )}
          </div>
          <div className="font-mono text-text-mute uppercase" style={{ fontSize: 9.5, letterSpacing: "0.18em" }}>© 2026 PROSPERA</div>
        </div>
      </div>
    </div>
  );
}
