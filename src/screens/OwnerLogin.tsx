import { useState, useEffect } from "react";
import { useStore } from "../store";
import { supabase } from "../lib/supabase";
import type { CashierDB } from "../types";
import { BUILD } from "../version";

const DAY_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function OwnerLogin() {
  const { setScreen, setStoreData, setProductsFromDB, setTrxCounter } = useStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginAs, setLoginAs] = useState<"toko" | "backoffice">("toko");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"id" | "en">("id");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dayStr = DAY_ID[now.getDay()];

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (loginAs === "backoffice") return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { store_name: storeName } },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      setSuccess("Akun dibuat! Cek email Anda untuk konfirmasi, lalu masuk.");
      setMode("signin");
      setLoading(false);
      return;
    }

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); return; }

    const userId = authData.user?.id;
    if (userId) {
      const { data: storeRows } = await supabase
        .from("stores")
        .select("id, name, address, phone")
        .eq("owner_id", userId)
        .limit(1);
      if (storeRows && storeRows.length > 0) {
        const store = storeRows[0];
        const { data: cashierRows } = await supabase
          .from("cashiers")
          .select("*")
          .eq("store_id", store.id)
          .eq("active", true);
        setStoreData(store.id, store.name, store.address || "", (cashierRows ?? []) as CashierDB[], store.phone || "");

        const [{ data: productRows }, { count: saleCount }] = await Promise.all([
          supabase.from("products").select("*").eq("store_id", store.id).eq("active", true).order("name"),
          supabase.from("sales").select("*", { count: "exact", head: true }).eq("store_id", store.id),
        ]);
        if (productRows && productRows.length > 0) setProductsFromDB(productRows as import("../types").Product[]);
        setTrxCounter((saleCount ?? 0) + 1);
      }
    }
    setScreen("login");
  }

  const card = (
    <div style={{ width: "100%", maxWidth: isMobile ? "100%" : 340, background: "white", borderRadius: 18, padding: "28px 28px 24px", boxShadow: "0 8px 48px rgba(11,17,41,0.10), 0 2px 8px rgba(11,17,41,0.04)" }}>

      {/* MASUK SEBAGAI */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 600, margin: "0 0 9px", textAlign: isMobile ? "center" : "left" as const }}>MASUK SEBAGAI</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* Toko tile */}
          <button onClick={() => setLoginAs("toko")} style={{ position: "relative", background: loginAs === "toko" ? "white" : "#FAFAF7", border: loginAs === "toko" ? "2px solid #0B1129" : "1.5px solid #ECE7DD", borderRadius: 11, padding: "12px 14px 12px", cursor: "pointer", textAlign: isMobile ? "center" as const : "left" as const }}>
            {loginAs === "toko" && (
              <span style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: "#0B1129", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loginAs === "toko" ? "#0B1129" : "#A8A39B"} strokeWidth="1.8" style={{ marginBottom: 6, display: "block", margin: isMobile ? "0 auto 6px" : "0 0 6px" }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: loginAs === "toko" ? "#0B1129" : "#A8A39B", marginBottom: 2 }}>Toko</div>
            <div style={{ fontSize: 10.5, color: loginAs === "toko" ? "#7A776F" : "#C4C0B8" }}>POS, kasir, jualan</div>
          </button>

          {/* Backoffice tile — PREMIUM tier */}
          <button onClick={() => setLoginAs("backoffice")} style={{ position: "relative", background: loginAs === "backoffice" ? "white" : "#FAFAF7", border: loginAs === "backoffice" ? "2px solid #0B1129" : "1.5px solid #ECE7DD", borderRadius: 11, padding: "12px 14px 12px", cursor: "pointer", textAlign: isMobile ? "center" as const : "left" as const }}>
            <span style={{ position: "absolute", top: -1, right: -1, background: "#C9A55F", color: "white", fontSize: 7, letterSpacing: "0.12em", fontWeight: 700, padding: "3px 8px", borderRadius: "0 10px 0 7px", textTransform: "uppercase" as const }}>PREMIUM</span>
            {loginAs === "backoffice" && (
              <span style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: "#0B1129", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
            )}
            <div style={{ display: "flex", justifyContent: isMobile ? "center" : "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loginAs === "backoffice" ? "#0B1129" : "#A8A39B"} strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: loginAs === "backoffice" ? "#0B1129" : "#A8A39B", marginBottom: 2 }}>Backoffice</div>
            <div style={{ fontSize: 10.5, color: loginAs === "backoffice" ? "#7A776F" : "#C4C0B8" }}>Inventory, staff</div>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {mode === "signup" && (
          <div>
            <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>NAMA TOKO</label>
            <div style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 10, padding: "0 13px", height: 46, display: "flex", alignItems: "center", gap: 9 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A39B" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Toko Sembako Maju" required style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0B1129", background: "transparent", fontFamily: "Inter, sans-serif" }} />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>EMAIL · NOMOR WA</label>
          <div style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 10, padding: "0 13px", height: 46, display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A39B" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="anthony@tokomaju.id" required style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0B1129", background: "transparent", fontFamily: "Inter, sans-serif" }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 600 }}>KATA SANDI</label>
            {mode === "signin" && (
              <button type="button" style={{ background: "transparent", border: "none", padding: 0, fontSize: 11.5, color: "#7A776F", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>Lupa?</button>
            )}
          </div>
          <div style={{ background: "white", border: "1.5px solid #0B1129", borderRadius: 10, padding: "0 13px", height: 46, display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A39B" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0B1129", background: "transparent", letterSpacing: showPw ? 0 : "0.12em", fontFamily: "Inter, sans-serif" }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, color: "#A8A39B", display: "flex" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          {mode === "signup" && <p style={{ marginTop: 4, fontSize: 10.5, color: "#A8A39B", fontFamily: "Inter, sans-serif" }}>Minimal 6 karakter</p>}
        </div>

        {mode === "signin" && (
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <div onClick={() => setRememberMe(r => !r)} style={{ width: 17, height: 17, borderRadius: 4, border: rememberMe ? "none" : "1.5px solid #D8D2C4", background: rememberMe ? "#0B1129" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {rememberMe && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <span style={{ fontSize: 12.5, color: "#0B1129", fontFamily: "Inter, sans-serif" }}>Ingat saya selama 30 hari</span>
          </label>
        )}

        {error && <div style={{ fontSize: 11.5, color: "#C25E3D", background: "rgba(194,94,61,0.06)", border: "1px solid rgba(194,94,61,0.2)", borderRadius: 8, padding: "7px 12px", fontFamily: "Inter, sans-serif" }}>{error}</div>}
        {success && <div style={{ fontSize: 11.5, color: "#5C9E7E", background: "rgba(92,158,126,0.06)", border: "1px solid rgba(92,158,126,0.2)", borderRadius: 8, padding: "7px 12px", fontFamily: "Inter, sans-serif" }}>{success}</div>}

        <button type="submit" disabled={loading} style={{ background: "#0B1129", color: "#FAFAF7", border: "none", borderRadius: 11, height: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 13.5, fontWeight: 600, letterSpacing: "0.06em", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
          {loading ? "Memproses…" : mode === "signin" ? "MASUK" : "DAFTAR SEKARANG"}
          {!loading && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
        </button>
      </form>

      {/* Footer */}
      <div style={{ marginTop: 14, textAlign: "center" as const }}>
        {mode === "signin" ? (
          <p style={{ fontSize: 12.5, color: "#7A776F", margin: 0, fontFamily: "Inter, sans-serif" }}>
            Belum punya akun?{" "}
            <button type="button" onClick={() => { setMode("signup"); setError(""); }}
              style={{ background: "transparent", border: "none", padding: "0 0 0 2px", fontSize: 12.5, color: "#0B1129", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>
              Daftar gratis
            </button>
          </p>
        ) : (
          <p style={{ fontSize: 12.5, color: "#7A776F", margin: 0, fontFamily: "Inter, sans-serif" }}>
            Sudah punya akun?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(""); }}
              style={{ background: "transparent", border: "none", padding: "0 0 0 2px", fontSize: 12.5, color: "#0B1129", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A55F" }}>
              Masuk
            </button>
          </p>
        )}
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(201,165,95,0.07)", border: "1px dashed rgba(201,165,95,0.40)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#7A776F", fontFamily: "Inter, sans-serif" }}>Coba tanpa akun?</span>
          <button type="button" onClick={() => setScreen("login")} style={{ background: "transparent", border: "none", fontSize: 9.5, color: "#C9A55F", cursor: "pointer", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase" as const, fontFamily: "Inter, sans-serif" }}>
            COBA DEMO →
          </button>
        </div>
      </div>
    </div>
  );

  const fonts = <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');`}</style>;

  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
        {fonts}
        {/* Mobile header */}
        <header style={{ height: 46, borderBottom: "1px solid #ECE7DD", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.18)", display: "inline-block" }} />
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 500 }}>ONLINE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#7A776F" }}>{timeStr} · {dayStr}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "#C4C0B8", fontFamily: "Inter, sans-serif" }}>build {BUILD}</span>
          </div>
        </header>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 40px" }}>
          <img src="/horizontal-light.png" alt="Sterith" style={{ height: 80, width: "auto", marginBottom: 22 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 400, marginBottom: 24 }}>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(201,165,95,0.6), rgba(201,165,95,0))" }} />
            <span style={{ fontSize: 8.5, letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "#C9A55F", fontWeight: 500, whiteSpace: "nowrap" as const }}>POS · POINT OF SALE</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, rgba(201,165,95,0.6), rgba(201,165,95,0))" }} />
          </div>
          <div style={{ width: "100%", maxWidth: 400 }}>
            {card}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      {fonts}

      {/* Top bar */}
      <header style={{ height: 50, borderBottom: "1px solid #ECE7DD", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.18)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#7A776F", fontWeight: 500 }}>SYSTEM READY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "#0B1129" }}>{timeStr} · {dayStr}</span>
          <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "#C4C0B8", fontFamily: "Inter, sans-serif" }}>build {BUILD}</span>
          <span style={{ width: 1, height: 13, background: "#ECE7DD", display: "inline-block" }} />
          <button onClick={() => setLang(l => l === "id" ? "en" : "id")}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "white", border: "1px solid #ECE7DD", borderRadius: 8, padding: "4px 10px", fontSize: 11.5, fontWeight: 500, color: "#0B1129", cursor: "pointer" }}>
            {lang.toUpperCase()}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </header>

      {/* Desktop: split layout */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 64, width: "100%", maxWidth: 940, padding: "40px 40px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <img src="/horizontal-light.png" alt="Sterith Business Consulting" style={{ width: "100%", height: "auto", objectFit: "contain", objectPosition: "left", display: "block", marginBottom: 20 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(201,165,95,0.6), rgba(201,165,95,0))" }} />
              <span style={{ fontSize: 9.5, letterSpacing: "0.32em", textTransform: "uppercase" as const, color: "#C9A55F", fontWeight: 500, whiteSpace: "nowrap" as const }}>POS · POINT OF SALE</span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, rgba(201,165,95,0.6), rgba(201,165,95,0))" }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 46, fontWeight: 500, color: "#0B1129", lineHeight: 1.1, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
              Selamat datang<br />kembali
            </h1>
            <p style={{ fontSize: 14, color: "#7A776F", lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
              Pilih ke mana Anda ingin masuk, lalu isi email dan kata sandi. Kasir akan login dengan PIN setelah Anda buka shift.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            {card}
          </div>
        </div>
      </div>
    </div>
  );
}
