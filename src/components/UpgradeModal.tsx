import { useState } from "react";
import { useStore, tierLevel } from "../store";
import { supabase } from "../lib/supabase";

interface Props { open: boolean; onClose: () => void; }

type TierKey = "free" | "standard" | "premium";

const TIERS: { key: TierKey; name: string; price: number; reg?: number; tagline: string; features: string[] }[] = [
  { key: "free", name: "Free", price: 0, tagline: "Mulai gratis",
    features: ["1 toko", "1 akun kasir", "1 shift", "Dashboard hari ini (omset + modal)", "Riwayat 1 hari", "Tunai · QRIS · Transfer"] },
  { key: "standard", name: "Standard", price: 50000, reg: 75000, tagline: "Punya karyawan, kamu masih di toko",
    features: ["1 toko (tambahan +Rp 50rb/toko)", "10 akun kasir", "5 shift", "Laporan periode + grafik + produk terlaris + export", "Riwayat 30 hari", "Uang kas, hutang, struk logo + WhatsApp"] },
  { key: "premium", name: "Premium", price: 100000, reg: 150000, tagline: "Kontrol dari mana saja + kasir tanpa batas",
    features: ["Kasir & shift tanpa batas", "1 toko (tambahan +Rp 70rb/toko)", "Riwayat 90 hari", "Analitik mendalam (metode, kasir, bulan lalu)", "Semua metode bayar (Debit, E-Wallet)", "Back Office web + audit log", "Inventori dasar"] },
];

const ADDONS: { key: string; name: string; price: number; desc: string }[] = [
  { key: "inventori", name: "Inventori Lengkap", price: 50000, desc: "Gudang, Toko 2-level, Stok Opname, Riwayat, Transfer, Scan AI" },
  { key: "crm", name: "CRM + Loyalti", price: 50000, desc: "Data pelanggan & program membership / loyalti" },
];

const rp = (n: number) => n === 0 ? "Gratis" : "Rp " + n.toLocaleString("id-ID");

export default function UpgradeModal({ open, onClose }: Props) {
  const storeTier = useStore(s => s.storeId ? s.storeTier : "free");
  const [target, setTarget] = useState<TierKey>(() => (tierLevel(storeTier) < 2 ? "premium" : "premium"));
  const [addons, setAddons] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const targetIsPremium = tierLevel(target) >= 2;
  const chosenAddons = ADDONS.filter(a => addons.has(a.key) && targetIsPremium);
  const tierObj = TIERS.find(t => t.key === target)!;
  const monthly = (target === "free" ? 0 : tierObj.price) + chosenAddons.reduce((s, a) => s + a.price, 0);

  function toggleAddon(k: string) {
    setAddons(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }

  async function submit() {
    setSending(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    if (!email) { setError("Sesi tidak ditemukan. Masuk kembali lalu coba lagi."); setSending(false); return; }
    const lines = [
      "[PERMINTAAN UPGRADE]",
      `Dari tier: ${storeTier.charAt(0).toUpperCase() + storeTier.slice(1)}`,
      `Minta tier: ${tierObj.name}${target === "free" ? "" : ` (${rp(tierObj.price)}/bln)`}`,
      chosenAddons.length ? `Add-on: ${chosenAddons.map(a => `${a.name} (~${rp(a.price)}/bln)`).join(", ")}` : "Add-on: —",
      `Estimasi total: ${rp(monthly)}/bln`,
      "",
      "Dikirim dari POS.",
    ];
    const { error: insErr } = await supabase.from("feedback").insert({
      type: "upgrade_request", email, message: lines.join("\n"), status: "pending",
      requested_tier: target, requested_addons: chosenAddons.map(a => a.key), app: "pos",
    });
    setSending(false);
    if (insErr) { setError("Gagal mengirim permintaan. Coba lagi."); return; }
    setDone(true);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(11,17,41,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "90dvh", background: "#FAFAF7", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #ECE7DD", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 700 }}>Sterith POS · Paket</p>
            <h2 style={{ margin: "4px 0 0", fontSize: 21, fontWeight: 800, color: "#0B1129", letterSpacing: "-0.02em" }}>Tingkatkan paket Anda</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#7A776F" }}>Paket saat ini: <b style={{ color: "#0B1129", textTransform: "capitalize" }}>{storeTier}</b> · pilih yang Anda mau, tim kami akan menghubungi Anda.</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#7A776F", flexShrink: 0 }}>✕</button>
        </div>

        {done ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(92,158,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0B1129" }}>Permintaan terkirim!</p>
            <p style={{ margin: "6px auto 22px", fontSize: 13, color: "#7A776F", lineHeight: 1.6, maxWidth: 360 }}>Tim Sterith akan meninjau dan menghubungi Anda untuk menyelesaikan upgrade. Terima kasih!</p>
            <button onClick={onClose} style={{ height: 44, padding: "0 30px", borderRadius: 11, border: "none", background: "#0B1129", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Tutup</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
              {/* Tiers */}
              <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A776F", fontWeight: 700, margin: "0 0 10px" }}>Pilih paket</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                {TIERS.map(t => {
                  const isCurrent = t.key === storeTier;
                  const selected = t.key === target;
                  const canPick = tierLevel(t.key) >= tierLevel(storeTier) && !isCurrent;
                  return (
                    <button key={t.key} disabled={!canPick} onClick={() => canPick && setTarget(t.key)}
                      style={{ textAlign: "left", background: selected ? "white" : "#fff", border: `2px solid ${selected ? "#C9A55F" : "#ECE7DD"}`, borderRadius: 14, padding: 14, cursor: canPick ? "pointer" : "default", opacity: !canPick && !isCurrent ? 0.5 : 1, position: "relative" }}>
                      {isCurrent && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 8, letterSpacing: "0.1em", fontWeight: 800, color: "#7A776F", background: "#F0EBE1", borderRadius: 5, padding: "2px 6px", textTransform: "uppercase" }}>Paket Anda</span>}
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#0B1129" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#7A776F", marginBottom: 8 }}>{t.tagline}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#C9A55F" }}>{rp(t.price)}{t.price > 0 && <span style={{ fontSize: 11, color: "#B8B0A8", fontWeight: 600 }}>/bln</span>}</div>
                      {t.reg && <div style={{ fontSize: 10, color: "#B8B0A8", textDecoration: "line-through" }}>{rp(t.reg)}/bln</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                        {t.features.map(f => (
                          <div key={f} style={{ display: "flex", gap: 6, fontSize: 11, color: "#3A3A38", lineHeight: 1.4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="3" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>{f}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add-ons */}
              <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7A776F", fontWeight: 700, margin: "20px 0 4px" }}>Add-on {targetIsPremium ? "" : "(butuh Premium)"}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ADDONS.map(a => {
                  const on = addons.has(a.key) && targetIsPremium;
                  return (
                    <button key={a.key} disabled={!targetIsPremium} onClick={() => toggleAddon(a.key)}
                      style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "white", border: `1.5px solid ${on ? "#C9A55F" : "#ECE7DD"}`, borderRadius: 12, padding: "12px 14px", cursor: targetIsPremium ? "pointer" : "not-allowed", opacity: targetIsPremium ? 1 : 0.5 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${on ? "#C9A55F" : "#D8D2C4"}`, background: on ? "#C9A55F" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5" /></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1129" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#7A776F" }}>{a.desc}</div>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#C9A55F", flexShrink: 0 }}>~{rp(a.price)}/bln</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #ECE7DD", padding: "14px 24px", flexShrink: 0, background: "white" }}>
              {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#C25E3D" }}>{error}</p>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A776F", fontWeight: 700 }}>Estimasi</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1129" }}>{rp(monthly)}<span style={{ fontSize: 12, color: "#B8B0A8", fontWeight: 600 }}>/bln</span></div>
                </div>
                <button onClick={submit} disabled={sending}
                  style={{ height: 50, padding: "0 26px", borderRadius: 12, border: "none", background: "#0B1129", color: "#F2EDE3", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 9 }}>
                  {sending ? "Mengirim…" : "Kirim Permintaan"}
                  {!sending && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
