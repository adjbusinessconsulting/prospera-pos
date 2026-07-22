import { useState } from "react";
import { useStore, localDateISO } from "../store";
import { supabase } from "../lib/supabase";
import { appAuthLogin, AUTH_BASE } from "../lib/appAuth";
import { pruneLog } from "../lib/auditlog";
import type { CashierDB } from "../types";
import { BUILD } from "../version";
import { DemoChooser } from "../components/DemoChooser";


// New sign-ups go through the Sterith website form (portfolio + Sterith POS tab).
// Submitting posts to Master Office's register endpoint (apps=['pos']) → lands as a
// New Request. After payment is confirmed there, the client gets a WhatsApp link to
// set their password. Not an in-app signup.
const DAFTAR_POS_URL = "https://sterith.com/form.html?daftar=pos";

// Max stores per tier. NOTE: also enforce server-side (RLS / provisioning) —
// this client cap is UX only and can be bypassed.
// Base stores included per tier. Standard/Premium include 1; EXTRA stores are a
// paid add-on provisioned by Master Office (Standard +50rb, Premium +70rb each),
// so self-serve create is capped to the included store here.
function storeCap(tier: string | null): number {
  const t = (tier || "free").toLowerCase();
  if (t === "business" || t === "enterprise") return Infinity;
  return 1; // free / standard / premium all include 1; extras are paid add-ons
}

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  tier: string | null;
  qris_image_url: string | null;
  midtrans_client_key: string | null;
  inventory_enabled: boolean | null;
  low_stock_threshold: number | null;
  tier_expires_at: string | null;
  receipt_logo: string | null;
  settings: unknown;
}

export default function OwnerLogin() {
  const { setScreen, setStoreData, setProductsFromDB, setTrxCounter, setDbShifts, startDemo, setInventorySettings, setSubscription, setReceiptLogo, loadSettings } = useStore();
  const [storeChoices, setStoreChoices] = useState<StoreRow[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"id" | "en">("id");
  const [showChooser, setShowChooser] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      // Issue a fresh POS setup link (resets the POS password specifically).
      await fetch("https://masteroffice.sterith.com/api/app-auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, app: "pos" }),
      });
      setLoading(false);
      setSuccess("Jika email terdaftar, tautan buat kata sandi baru sudah dikirim. Cek inbox atau folder spam.");
    } catch {
      setLoading(false);
      setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    }
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
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

    try {
      await appAuthLogin(email, password, "pos");
    } catch (err) {
      // Lockout carries a helpful message; anything else is a generic wrong-password.
      const msg = (err as Error)?.message;
      setError(msg && /percobaan/i.test(msg) ? msg : "Email atau kata sandi salah."); setLoading(false); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (userId) {
      const { data: storeRows } = await supabase
        .from("stores")
        .select("id, name, address, phone, tier, qris_image_url, midtrans_client_key, inventory_enabled, low_stock_threshold, tier_expires_at, receipt_logo, settings")
        .eq("owner_id", userId)
        .order("created_at");
      // Multi-store: show the picker when there's >1 store, OR when the tier can
      // still add more (so single-store paid owners can create a 2nd). Free (cap 1
      // with 1 store) auto-enters — no friction.
      if (storeRows && storeRows.length >= 1) {
        const cap = storeCap(storeRows[0].tier);
        if (storeRows.length > 1 || cap > storeRows.length) {
          setOwnerId(userId);
          setStoreChoices(storeRows as StoreRow[]);
          setLoading(false);
          return;
        }
        await enterStore(storeRows[0] as StoreRow);
        return;
      }
      // Logged in but the account has no store yet (provisioning didn't stick).
      // Never fall into the built-in seed catalog — clear it and let the owner
      // name their store, then enter a clean slate.
      setProductsFromDB([]);
      setOwnerId(userId);
      setShowCreate(true);
      setLoading(false);
      return;
    }
    setScreen("login");
  }

  async function enterStore(store: StoreRow) {
    const { data: cashierRows } = await supabase
      .from("cashiers").select("*").eq("store_id", store.id).eq("active", true);
    // Subscription expiry: if the paid period has passed, revert to Free features
    // (data stays; a renew banner is shown). Expiry day itself is still valid.
    const paidTier = store.tier || "free";
    const expired = !!store.tier_expires_at && localDateISO() > store.tier_expires_at;
    const effectiveTier = expired ? "free" : paidTier;
    setSubscription(expired, expired ? paidTier : "");
    setStoreData(
      store.id,
      store.name,
      store.address || "",
      (cashierRows ?? []) as CashierDB[],
      store.phone || "",
      store.qris_image_url || "",
      store.midtrans_client_key || "",
      effectiveTier,
    );
    setInventorySettings(store.inventory_enabled ?? true, store.low_stock_threshold ?? 5);
    setReceiptLogo(store.receipt_logo ?? "");
    loadSettings(store.settings);
    void pruneLog(effectiveTier);   // trim on-device audit log to the tier window
    const [{ data: productRows }, { count: saleCount }, { data: shiftRows }] = await Promise.all([
      supabase.from("products").select("*").eq("store_id", store.id).eq("active", true).order("name"),
      supabase.from("sales").select("*", { count: "exact", head: true }).eq("store_id", store.id),
      supabase.from("shifts").select("id, name, start_time, end_time").eq("store_id", store.id).order("start_time"),
    ]);
    // Daily rollover: on the first login of a new day, yesterday's sisa becomes
    // today's stok_awal and the tambahan/terjual counters reset.
    const today = localDateISO();
    const mapped = (productRows ?? []).map((r: Record<string, unknown>) => {
      const stock = (r.stock as number) ?? 0;
      const rolls = r.stock_date !== today;
      return {
        ...r,
        stock,
        stockAwal:     rolls ? stock : ((r.stock_awal as number) ?? stock),
        stockTambahan: rolls ? 0     : ((r.stock_tambahan as number) ?? 0),
        stockTerjual:  rolls ? 0     : ((r.stock_terjual as number) ?? 0),
        stockDate:     today,
      };
    });
    (productRows ?? []).forEach((r: Record<string, unknown>) => {
      if (r.stock_date !== today) {
        supabase.from("products").update({ stock_awal: (r.stock as number) ?? 0, stock_tambahan: 0, stock_terjual: 0, stock_date: today }).eq("id", r.id as string);
      }
    });
    // Always set from the DB — an empty store must clear the built-in sample
    // catalog, not fall through and keep showing the seed products.
    setProductsFromDB(mapped as unknown as import("../types").Product[]);
    setDbShifts((shiftRows ?? []) as import("../types").ShiftDef[]);
    setTrxCounter((saleCount ?? 0) + 1);
    setScreen("login");
  }

  async function createStore() {
    const name = newStoreName.trim();
    if (!name || !ownerId) return;
    setCreating(true); setError("");

    // First store (self-heal, no existing stores): provision via Master Office so
    // the store inherits the owner's real tier from their tenant record instead of
    // a client-side FREE default. Falls back to the direct insert below on failure.
    if (storeChoices.length === 0) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const res = await fetch(`${AUTH_BASE}/api/provision-store`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name }),
          });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j.store) {
            setCreating(false); setNewStoreName(""); setShowCreate(false);
            await enterStore(j.store as StoreRow);
            return;
          }
        }
      } catch { /* fall through to the direct insert */ }
    }

    const tier = storeChoices[0]?.tier || "free";  // inherit the owner's tier
    const { data, error: createErr } = await supabase.from("stores")
      .insert({ owner_id: ownerId, name, tier, status: "active" })
      .select("id, name, address, phone, tier, qris_image_url, midtrans_client_key, inventory_enabled, low_stock_threshold, tier_expires_at, receipt_logo")
      .single();
    setCreating(false);
    if (createErr || !data) {
      // Surface the real cause (e.g. RLS: run store_create_policy.sql) instead of a blank fail.
      setError(createErr?.message ? `Gagal membuat toko: ${createErr.message}` : "Gagal membuat toko. Coba lagi atau hubungi Sterith.");
      return;
    }
    setNewStoreName(""); setShowCreate(false);
    // Enter the freshly-created (empty) store straight away — clean catalog.
    await enterStore(data as StoreRow);
  }

  const inputStyle: React.CSSProperties = { width: "100%", height: 46, boxSizing: "border-box", border: "1.5px solid #ddd9cc", borderRadius: 10, padding: "0 14px 0 42px", fontSize: 13, color: "#0D1117", background: "#fff", fontFamily: "'Hanken Grotesk', sans-serif", outline: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8f897a", fontWeight: 600, marginBottom: 6 };
  const iconStyle: React.CSSProperties = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8f897a" };

  const card = (
    <div style={{ width: "100%", maxWidth: 420, background: "#f8f6ef", borderRadius: 18, padding: "24px 30px 20px", border: "1px solid #ddd9cc", boxShadow: "0 8px 40px rgba(11,17,41,0.09)", boxSizing: "border-box" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.22)" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#8f897a", fontWeight: 600, textTransform: "uppercase" }}>System Ready</span>
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
        <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 26, fontWeight: 500, color: "#0D1117", margin: "0 0 4px", lineHeight: 1.2 }}>
          {mode === "signup" ? "Buat akun toko" : mode === "forgot" ? "Lupa password?" : "Selamat datang kembali"}
        </h1>
        <p style={{ fontSize: 12, color: "#8f897a", lineHeight: 1.5, margin: 0 }}>
          {mode === "signup" ? "Daftarkan toko Anda ke Sterith POS." : mode === "forgot" ? "Kami kirim link atur ulang ke email Anda." : "Masuk untuk mulai berjualan hari ini."}
        </p>
      </div>

      {/* Forgot password form */}
      {mode === "forgot" && (
        <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Email Akun</label>
            <div style={{ position: "relative" }}>
              <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@toko.com" required style={inputStyle} />
            </div>
          </div>
          {error   && <p style={{ fontSize: 12, color: "#b0492f", background: "#f4e9e4", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{error}</p>}
          {success && <p style={{ fontSize: 12, color: "#3f7d54", background: "#e9f1ea", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{success}</p>}
          <button type="submit" disabled={loading} style={{ height: 48, background: "#e7c987", color: "#0D1117", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 2, fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            {loading ? "MENGIRIM…" : "KIRIM LINK RESET →"}
          </button>
          <button type="button" onClick={() => { setMode("signin"); setError(""); setSuccess(""); }} style={{ background: "transparent", border: "none", fontSize: 12, color: "#8f897a", cursor: "pointer", fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
            ← Kembali ke login
          </button>
        </form>
      )}

      {/* Form */}
      {mode !== "forgot" && <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {mode === "signup" && (
          <div>
            <label style={labelStyle}>Nama Toko</label>
            <div style={{ position: "relative" }}>
              <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Toko Sembako Maju" required style={inputStyle} />
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Email · Nomor WA</label>
          <div style={{ position: "relative" }}>
            <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="anthony@tokomaju.id" required style={inputStyle} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Kata Sandi</label>
            {mode === "signin" && (
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }} style={{ background: "transparent", border: "none", padding: 0, fontSize: 10.5, color: "#8f897a", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>Lupa?</button>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" required style={{ ...inputStyle, padding: "0 44px 0 42px" }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8f897a", padding: 4, display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          {mode === "signup" && <p style={{ marginTop: 5, fontSize: 10.5, color: "#b8a88a", fontFamily: "'Hanken Grotesk', sans-serif" }}>Minimal 6 karakter</p>}
        </div>

        {mode === "signin" && (
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <div onClick={() => setRememberMe(r => !r)} style={{ width: 17, height: 17, borderRadius: 4, border: rememberMe ? "none" : "1.5px solid #ddd9cc", background: rememberMe ? "#0D1117" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {rememberMe && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <span style={{ fontSize: 12, color: "#0D1117", fontFamily: "'Hanken Grotesk', sans-serif" }}>Ingat saya selama 30 hari</span>
          </label>
        )}

        {error && <p style={{ fontSize: 12, color: "#b0492f", background: "#f4e9e4", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{error}</p>}
        {success && <p style={{ fontSize: 12, color: "#3f7d54", background: "#e9f1ea", padding: "9px 12px", borderRadius: 8, margin: 0 }}>{success}</p>}

        <button type="submit" disabled={loading} style={{ height: 48, background: "#e7c987", color: "#0D1117", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "'Hanken Grotesk', sans-serif", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? "MEMPROSES…" : mode === "signin" ? "MASUK" : "DAFTAR SEKARANG"}
          {!loading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
        </button>
      </form>}

      {/* Footer links */}
      {mode !== "forgot" && <div style={{ marginTop: 14, textAlign: "center" as const }}>
        {mode === "signin" ? (
          <p style={{ fontSize: 12, color: "#8f897a", margin: 0, fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Mau berlangganan?{" "}
            <button type="button" onClick={() => window.open(DAFTAR_POS_URL, "_blank", "noopener,noreferrer")}
              style={{ background: "transparent", border: "none", padding: "0 0 0 2px", fontSize: 12, color: "#0D1117", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#b8934a" }}>
              Daftar Gratis
            </button>
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "#8f897a", margin: 0, fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Sudah punya akun?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(""); }}
              style={{ background: "transparent", border: "none", padding: "0 0 0 2px", fontSize: 12, color: "#0D1117", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#b8934a" }}>
              Masuk
            </button>
          </p>
        )}
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(184,147,74,0.07)", border: "1px dashed rgba(184,147,74,0.4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#8f897a", fontFamily: "'Hanken Grotesk', sans-serif" }}>Coba tanpa akun?</span>
          <button type="button" onClick={() => setShowChooser(true)} style={{ background: "transparent", border: "none", fontSize: 9.5, color: "#b8934a", cursor: "pointer", letterSpacing: "0.14em", fontWeight: 700, textTransform: "uppercase" as const, fontFamily: "'Hanken Grotesk', sans-serif" }}>
            COBA DEMO →
          </button>
        </div>
      </div>}

      {/* Security footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid #ddd9cc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b8a88a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 10, color: "#b8a88a", fontFamily: "'Hanken Grotesk', sans-serif" }}>Terenkripsi · build {BUILD}</span>
        </div>
        <span style={{ fontSize: 10, color: "#b8a88a", fontFamily: "'Hanken Grotesk', sans-serif" }}>© 2026 STERITH</span>
      </div>
    </div>
  );

  const fonts = <style>{`@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`}</style>;

  // ── First store (logged in, but the account has no store yet) ──
  if (ownerId && storeChoices.length === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        {fonts}
        <img src="/horizontal-light.png" alt="Sterith" style={{ height: 56, width: "auto", marginBottom: 24 }} />
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>TOKO BARU</p>
          <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 30, fontWeight: 500, color: "#0D1117", textAlign: "center", margin: "0 0 6px" }}>Beri nama toko Anda</h1>
          <p style={{ fontSize: 13, color: "#7A776F", textAlign: "center", margin: "0 0 24px" }}>Mulai dari awal yang bersih — katalog kosong, siap Anda isi.</p>
          <input autoFocus value={newStoreName} onChange={e => setNewStoreName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createStore(); }} placeholder="mis. Cafe Kopi Cinta"
            style={{ ...inputStyle, paddingLeft: 14, marginBottom: 12 }} />
          {error && <p style={{ fontSize: 12, color: "#B0492F", margin: "0 0 12px" }}>{error}</p>}
          <button onClick={createStore} disabled={!newStoreName.trim() || creating}
            style={{ width: "100%", height: 48, borderRadius: 11, border: "none", background: "#0D1117", color: "#FAFAF7", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", cursor: (!newStoreName.trim() || creating) ? "default" : "pointer", opacity: (!newStoreName.trim() || creating) ? 0.5 : 1 }}>
            {creating ? "Membuat…" : "Buat Toko"}
          </button>
          <button onClick={() => { setOwnerId(""); setShowCreate(false); setNewStoreName(""); setError(""); supabase.auth.signOut(); }}
            style={{ width: "100%", marginTop: 12, background: "transparent", border: "none", fontSize: 12, color: "#8f897a", cursor: "pointer", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Keluar
          </button>
        </div>
      </div>
    );
  }

  // ── Multi-store picker (shown after login when the account has >1 store) ──
  if (storeChoices.length > 0) {
    return (
      <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        {fonts}
        <img src="/horizontal-light.png" alt="Sterith" style={{ height: 56, width: "auto", marginBottom: 24 }} />
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>PILIH TOKO</p>
          <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 30, fontWeight: 500, color: "#0D1117", textAlign: "center", margin: "0 0 6px" }}>Toko mana hari ini?</h1>
          <p style={{ fontSize: 13, color: "#7A776F", textAlign: "center", margin: "0 0 24px" }}>Akun Anda memiliki {storeChoices.length} toko. Pilih satu untuk masuk.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {storeChoices.map(s => (
              <button key={s.id} onClick={() => { setLoading(true); enterStore(s); }} disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 14, background: "white", border: "1px solid #ECE7DD", borderRadius: 14, padding: "14px 16px", cursor: loading ? "default" : "pointer", textAlign: "left", width: "100%", opacity: loading ? 0.7 : 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#7A776F", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.address || "—"}</div>
                </div>
                <span style={{ fontSize: 8, letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase", color: "#A6843F", background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>{s.tier || "free"}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M5 12h14M13 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>

          {/* Create store (tier-capped) */}
          {error && <p style={{ fontSize: 11.5, color: "#C25E3D", textAlign: "center", marginTop: 12 }}>{error}</p>}
          {(() => {
            const cap = storeCap(storeChoices[0]?.tier);
            if (storeChoices.length >= cap) return (
              <p style={{ fontSize: 11.5, color: "#7A776F", textAlign: "center", marginTop: 14, background: "rgba(201,165,95,0.06)", border: "1px dashed rgba(201,165,95,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                Tambah toko / cabang adalah <b style={{ color: "#0D1117" }}>add-on berbayar</b> (Standard +Rp 50rb, Premium +Rp 70rb per toko). Hubungi Sterith untuk menambah.
              </p>
            );
            if (showCreate) return (
              <div style={{ marginTop: 12, background: "white", border: "1px solid #ECE7DD", borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 8 }}>Toko Baru</p>
                <input autoFocus value={newStoreName} onChange={e => setNewStoreName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createStore(); }} placeholder="mis. Toko Sembako Maju · Cabang 2"
                  style={{ width: "100%", height: 46, borderRadius: 10, border: `1px solid ${newStoreName.trim() ? "#5C9E7E" : "#ECE7DD"}`, padding: "0 14px", fontSize: 14, color: "#0D1117", outline: "none", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => { setShowCreate(false); setNewStoreName(""); setError(""); }} style={{ flex: 1, height: 44, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
                  <button onClick={createStore} disabled={!newStoreName.trim() || creating} style={{ flex: 2, height: 44, borderRadius: 11, border: "none", background: "#0D1117", color: "#FAFAF7", fontSize: 13, fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: !newStoreName.trim() || creating ? 0.5 : 1 }}>{creating ? "Membuat…" : "Buat Toko"}</button>
                </div>
                <p style={{ fontSize: 10.5, color: "#A8A39B", marginTop: 8 }}>Paket {storeChoices[0]?.tier || "free"}: maksimal {cap === Infinity ? "tanpa batas" : cap} toko.</p>
              </div>
            );
            return (
              <button onClick={() => setShowCreate(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 12, height: 50, borderRadius: 14, border: "1.5px dashed rgba(201,165,95,0.5)", background: "rgba(201,165,95,0.06)", color: "#A6843F", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Buat Toko Baru
              </button>
            );
          })()}

          <button onClick={() => { setStoreChoices([]); setShowCreate(false); setError(""); supabase.auth.signOut(); }}
            style={{ display: "block", margin: "20px auto 0", background: "none", border: "none", fontSize: 12.5, color: "#7A776F", cursor: "pointer", textDecoration: "underline" }}>
            ← Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {fonts}
      {showChooser && <DemoChooser onClassic={() => { setShowChooser(false); startDemo(); }} onClose={() => setShowChooser(false)} />}
      {card}
    </div>
  );
}
