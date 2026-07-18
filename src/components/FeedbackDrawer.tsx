import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "email" | "message" | "done";

export default function FeedbackDrawer({ open, onClose }: Props) {
  const isDemoMode = useStore((s) => s.isDemoMode);
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // The owner is already signed in — take their email from the session and skip
  // straight to the message. Typing + verifying it again is pure friction on the
  // people we most want feedback from. Falls back to the manual step if there's no
  // session (e.g. a cashier-only device).
  useEffect(() => {
    if (!open || isDemoMode) return;   // demo: let them type any email
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email;
      if (!cancelled && e) { setEmail(e); setStep("message"); }
    });
    return () => { cancelled = true; };
  }, [open, isDemoMode]);

  function reset() {
    setStep("email");
    setEmail("");
    setMessage("");
    setError("");
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function verifyEmail() {
    if (!email.trim()) return;
    if (isDemoMode) { setStep("message"); return; }   // demo: any email accepted
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("check_email_registered", { p_email: email.trim().toLowerCase() });
    setLoading(false);
    if (rpcError || !data) {
      setError("Email tidak terdaftar. Pastikan email yang Anda masukkan sesuai dengan akun Sterith POS Anda.");
      return;
    }
    setStep("message");
  }

  async function handleSubmit() {
    if (!message.trim()) return;
    if (isDemoMode) { setStep("done"); return; }   // demo: don't write a real feedback row
    setLoading(true);
    setError("");
    const { error: insertError } = await supabase.from("feedback").insert({
      type: "feedback",
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: "pending",
      app: "pos",
    });
    setLoading(false);
    if (insertError) { setError("Gagal mengirim. Coba lagi."); return; }
    setStep("done");
  }

  if (!open) return null;

  const content = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #ECE7DD", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F" }}>STERITH POS · BANTUAN</p>
          <p style={{ margin: "2px 0 0", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: "#0B1129" }}>Kritik & Saran</p>
        </div>
        <button onClick={handleClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, color: "#B8B0A8" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {step === "done" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(92,158,126,0.12)", border: "1px solid rgba(92,158,126,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: "#0B1129", margin: "0 0 6px" }}>Terima kasih!</p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#7A776F", margin: "0 0 24px", lineHeight: 1.6 }}>
            Kritik dan saran Anda sudah kami terima dan akan ditinjau oleh tim Sterith.
          </p>
          <button onClick={handleClose} style={{ background: "#0B1129", color: "#F2EDE3", border: "none", borderRadius: 10, height: 42, padding: "0 28px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Tutup
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6, margin: "0 0 20px" }}>
            Ada masukan, saran, atau kendala? Tulis di sini dan tim kami akan meninjau secepatnya.
          </p>

          {/* Email step */}
          {step === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>EMAIL AKUN ANDA</label>
                <div style={{ background: "white", border: "1.5px solid #ECE7DD", borderRadius: 10, padding: "0 13px", height: 46, display: "flex", alignItems: "center", gap: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A39B" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                  <input
                    type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && verifyEmail()}
                    placeholder="email yang terdaftar"
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, color: "#0B1129", background: "transparent", fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                {error && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#C25E3D", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{error}</p>}
              </div>
              <button onClick={verifyEmail} disabled={loading || !email.trim()}
                style={{ height: 46, background: "#0B1129", color: "#F2EDE3", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading || !email.trim() ? "not-allowed" : "pointer", opacity: !email.trim() ? 0.5 : 1, fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? "Memeriksa…" : "Lanjutkan →"}
              </button>
            </div>
          )}

          {/* Message step */}
          {step === "message" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(92,158,126,0.06)", border: "1px solid rgba(92,158,126,0.2)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{ fontSize: 11.5, color: "#5C9E7E", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{email}</span>
                <button onClick={() => { setStep("email"); setError(""); }} style={{ marginLeft: "auto", background: "transparent", border: "none", fontSize: 11, color: "#7A776F", cursor: "pointer", fontFamily: "Inter, sans-serif", textDecoration: "underline" }}>Ganti</button>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>KRITIK & SARAN ANDA</label>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Tulis masukan, saran, atau kendala yang Anda alami…"
                  rows={6}
                  style={{ width: "100%", background: "white", border: `1.5px solid ${message.trim() ? "#C9A55F" : "#ECE7DD"}`, borderRadius: 10, padding: "12px 13px", fontSize: 13.5, color: "#0B1129", fontFamily: "Inter, sans-serif", resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
                />
                {error && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#C25E3D", fontFamily: "Inter, sans-serif" }}>{error}</p>}
              </div>
              <button onClick={handleSubmit} disabled={loading || !message.trim()}
                style={{ height: 46, background: "#0B1129", color: "#F2EDE3", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading || !message.trim() ? "not-allowed" : "pointer", opacity: !message.trim() ? 0.5 : 1, fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? "Mengirim…" : "Kirim →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(11,17,41,0.4)", zIndex: 900 }} />

      {/* Desktop: right drawer */}
      <div className="hidden lg:flex" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 340, background: "white", zIndex: 901, flexDirection: "column", boxShadow: "-8px 0 48px rgba(11,17,41,0.14)" }}>
        {content}
      </div>

      {/* Mobile: bottom sheet */}
      <div className="lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", zIndex: 901, borderRadius: "18px 18px 0 0", maxHeight: "88dvh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 48px rgba(11,17,41,0.14)" }}>
        <div style={{ width: 36, height: 4, background: "#ECE7DD", borderRadius: 99, margin: "10px auto 0", flexShrink: 0 }} />
        {content}
      </div>
    </>
  );
}
