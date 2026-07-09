import { useRef, useState } from "react";
import { useStore, isAtLeast } from "../store";
import { supabase } from "../lib/supabase";

export function ReceiptSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const storeId = useStore((s) => s.storeId);
  const storeTier = useStore((s) => (s.storeId ? s.storeTier : "free"));
  const isDemoMode = useStore((s) => s.isDemoMode);
  const storeName = useStore((s) => s.storeName);
  const receiptLogo = useStore((s) => s.receiptLogo);
  const setReceiptLogo = useStore((s) => s.setReceiptLogo);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const canBranding = isAtLeast(storeTier, "standard");

  if (!open) return null;

  async function saveLogo(dataUrl: string) {
    setSaving(true);
    setReceiptLogo(dataUrl);
    if (storeId && !isDemoMode) await supabase.from("stores").update({ receipt_logo: dataUrl }).eq("id", storeId);
    setSaving(false);
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 500 * 1024) { alert("Logo maksimal 500KB. Perkecil ukuran gambar dulu."); return; }
    const reader = new FileReader();
    reader.onload = () => void saveLogo(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(11,17,41,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "white", borderRadius: 18, padding: 24, boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600 }}>Sterith POS · Struk</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#0B1129" }}>Logo Struk</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#7A776F" }}>✕</button>
        </div>

        {canBranding ? (
          <>
            <p style={{ margin: "8px 0 14px", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6 }}>
              Logo toko Anda tampil di bagian atas struk (dengan “Powered by Sterith” di bawahnya).
            </p>
            <div style={{ border: "1px dashed #D8D2C4", borderRadius: 12, padding: "18px 14px", textAlign: "center", background: "#FAFAF7", marginBottom: 12 }}>
              {receiptLogo
                ? <img src={receiptLogo} alt="" style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", margin: "0 auto", display: "block" }} />
                : <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 600, color: "#0B1129" }}>{storeName || "Toko Anda"}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={onFile} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} disabled={saving}
                style={{ flex: 1, height: 44, borderRadius: 11, border: "none", background: "#0B1129", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Menyimpan…" : receiptLogo ? "Ganti Logo" : "Unggah Logo"}
              </button>
              {receiptLogo && (
                <button onClick={() => void saveLogo("")} disabled={saving}
                  style={{ height: 44, padding: "0 14px", borderRadius: 11, border: "1px solid rgba(192,57,43,0.3)", background: "transparent", color: "#C0392B", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Hapus
                </button>
              )}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "#B8B0A8" }}>PNG / JPG, maks 500KB. Latar transparan (PNG) paling rapi.</p>
          </>
        ) : (
          <div style={{ marginTop: 10, background: "rgba(201,165,95,0.07)", border: "1px dashed rgba(201,165,95,0.4)", borderRadius: 12, padding: "16px 14px" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "#0B1129", lineHeight: 1.6 }}>
              <b>Logo struk kustom</b> tersedia mulai paket <b>Standard</b>. Struk Anda saat ini memakai branding Sterith.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
