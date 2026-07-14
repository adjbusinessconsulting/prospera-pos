import { useEffect, useState } from "react";
import { useStore, isAtLeast } from "../store";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";
import { DEFAULT_SETTINGS, type StoreSettings } from "../settings";
import { OwnerConfirm } from "./OwnerConfirm";

type Key = keyof StoreSettings;

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      style={{ width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? "#3D7A5E" : "#D8D2C4", transition: "background 0.15s", position: "relative", padding: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: 999,
        background: "white", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

export function SettingsPanel({ open, onClose, onOpenReceipt, onOpenPrinter }: { open: boolean; onClose: () => void; onOpenReceipt?: () => void; onOpenPrinter?: () => void }) {
  const storeId = useStore((s) => s.storeId);
  const isDemoMode = useStore((s) => s.isDemoMode);
  const storeTier = useStore((s) => (s.storeId ? s.storeTier : "free"));
  const settings = useStore((s) => s.settings);
  const inventoryEnabled = useStore((s) => s.inventoryEnabled);
  const setSettings = useStore((s) => s.setSettings);
  const setInventoryEnabled = useStore((s) => s.setInventoryEnabled);

  const isStd = isAtLeast(storeTier, "standard");
  const isPre = isAtLeast(storeTier, "premium");

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [draftInv, setDraftInv] = useState(inventoryEnabled);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setDraft(settings); setDraftInv(inventoryEnabled); } }, [open, settings, inventoryEnabled]);

  if (!open) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings) || draftInv !== inventoryEnabled;
  const flip = (k: Key) => setDraft((d) => ({ ...d, [k]: !d[k] }));

  async function persist() {
    setSaving(true);
    if (storeId && !isDemoMode) {
      try {
        await supabase.from("stores").update({ settings: draft, inventory_enabled: draftInv }).eq("id", storeId);
        void logEvent("settings.update", "Pengaturan fitur diperbarui");
      } catch { /* keep local */ }
    }
    setSettings(draft);
    setInventoryEnabled(draftInv);
    setSaving(false);
    setConfirmOpen(false);
    onClose();
  }

  function onSave() {
    if (!dirty) { onClose(); return; }
    if (isDemoMode) { void persist(); return; }   // demo has no owner account to reauth
    setConfirmOpen(true);
  }

  const Row = ({ k, label, desc, on, toggle }: { k?: Key; label: string; desc: string; on?: boolean; toggle?: () => void }) => {
    const val = on ?? (k ? draft[k] : false);
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid #F2EDE3" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0B1129" }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#7A776F", lineHeight: 1.5 }}>{desc}</p>
        </div>
        <Switch on={val} onToggle={toggle ?? (() => k && flip(k))} />
      </div>
    );
  };

  const SectionHead = ({ title, badge }: { title: string; badge?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 2px" }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0B1129", fontWeight: 700 }}>{title}</p>
      {badge && <span style={{ fontSize: 8, letterSpacing: "0.12em", fontWeight: 700, color: "#A6843F", background: "rgba(201,165,95,0.14)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>{badge}</span>}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(11,17,41,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "90vh", display: "flex", flexDirection: "column", background: "white", borderRadius: 18, boxShadow: "0 30px 80px rgba(11,17,41,0.4)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 24px 14px", borderBottom: "1px solid #ECE7DD" }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600 }}>Sterith POS</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#0B1129" }}>{isPre ? "Pengaturan Perangkat" : "Pengaturan Fitur"}</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#7A776F" }}>✕</button>
        </div>

        {isPre ? (
          /* Premium: business/feature settings live in Back Office only. This
             device shows printer setup only (physical per-device pairing). */
          <div style={{ padding: "6px 24px 22px", display: "flex", flexDirection: "column" }}>
            <p style={{ margin: "12px 0 2px", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6 }}>
              Pengaturan toko & fitur dikelola dari <b>Back Office</b>. Di perangkat ini hanya <b>setup printer</b>, karena printer dipasangkan langsung ke perangkat.
            </p>
            <button onClick={() => { onClose(); onOpenPrinter?.(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14, padding: "14px 14px", borderRadius: 11, border: "1px solid #ECE7DD", background: "#FAFAF7", cursor: "pointer" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(11,17,41,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0B1129" strokeWidth="1.8"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
                </span>
                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0B1129" }}>Atur Printer</span>
                  <span style={{ display: "block", fontSize: 11, color: "#7A776F", marginTop: 1 }}>Sambungkan printer thermal · ukuran kertas · test print</span>
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button onClick={onClose} style={{ marginTop: 16, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0B1129", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Tutup</button>
          </div>
        ) : (
          <>
            {/* Scroll body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 8px" }}>
              <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#7A776F", lineHeight: 1.6 }}>
                Matikan fitur yang tidak Anda pakai. <b>Data lama tidak hilang</b> — mematikan
                fitur hanya menyembunyikan pembuatan baru, bukan data yang sudah ada.
              </p>

              <SectionHead title="Metode Pembayaran" />
              <Row k="pay_tunai"    label="Tunai" desc="Terima pembayaran tunai." />
              <Row k="pay_qris"     label="QRIS" desc="Tampilkan opsi QRIS saat bayar." />
              <Row k="pay_transfer" label="Transfer" desc="Terima transfer bank." />
              {isPre && <Row k="pay_debit"   label="Kartu Debit" desc="Terima kartu debit." />}
              {isPre && <Row k="pay_ewallet" label="E-Wallet" desc="OVO, GoPay, Dana, dll." />}

              <SectionHead title="Kasir & Struk" />
              <Row k="printReceipt" label="Cetak struk" desc="Tampilkan tombol cetak struk & aktifkan pengaturan printer." />
              {draft.printReceipt && onOpenPrinter && (
                <button onClick={() => { onClose(); onOpenPrinter(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "10px 0 2px", padding: "12px 14px", borderRadius: 11, border: "1px solid #ECE7DD", background: "#FAFAF7", cursor: "pointer" }}>
                  <span style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0B1129" }}>Atur Printer</span>
                    <span style={{ display: "block", fontSize: 11, color: "#7A776F", marginTop: 1 }}>Sambungkan printer thermal · ukuran kertas · test print</span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}
              <Row k="passwordConfirmPrice" label="Konfirmasi kata sandi saat ubah harga" desc="Minta kata sandi pemilik sebelum harga/produk diubah." />

              {isStd && <>
                <SectionHead title="Fitur Toko" badge="Standard" />
                <Row k="hutang" label="Hutang / Bon" desc="Opsi bon saat bayar. Buku Hutang tetap terlihat walau dimatikan." />
                <Row k="kas" label="Uang Kas" desc="Catat kas masuk/keluar. Riwayat kas tetap terlihat." />
                <Row k="fotoBuktiWajib" label="Foto bukti kas wajib" desc="Wajibkan foto tiap catat kas. (Default mati.)" />
                <Row k="rekonsiliasi" label="Rekonsiliasi kas" desc="Tombol hitung laci saat tutup toko." />
                <Row k="pinWajib" label="PIN wajib per kasir" desc="Minta PIN tiap kasir masuk. Matikan untuk tim kecil terpercaya." />
                <Row k="gantiShift" label="Ganti / Pindah shift" desc="Tombol serah-terima shift." />
                <Row k="whatsappShare" label="Bagikan via WhatsApp" desc="Kirim struk & laporan lewat WhatsApp." />
                <Row k="receiptLogo" label="Logo di struk" desc="Tampilkan logo toko di struk. Unggah logo di menu Struk & QRIS." />
              </>}

              {isPre && <>
                <SectionHead title="Fitur Toko" badge="Premium" />
                <Row label="Inventori / Stok" desc="Lacak stok barang. Kolom stok & peringatan stok menipis ikut aktif." on={draftInv} toggle={() => setDraftInv(v => !v)} />
              </>}

              {onOpenReceipt && (
                <button onClick={() => { onClose(); onOpenReceipt(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18, padding: "13px 14px", borderRadius: 11, border: "1px solid #ECE7DD", background: "#FAFAF7", cursor: "pointer" }}>
                  <span style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0B1129" }}>Struk & QRIS</span>
                    <span style={{ display: "block", fontSize: 11, color: "#7A776F", marginTop: 1 }}>Logo struk & gambar QRIS statis</span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A776F" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              )}

              <div style={{ height: 8 }} />
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 10, padding: "14px 24px 20px", borderTop: "1px solid #ECE7DD" }}>
              <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0B1129", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Tutup</button>
              <button onClick={onSave} disabled={!dirty || saving}
                style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: dirty ? "#0B1129" : "#D8D2C4", color: dirty ? "#F2EDE3" : "#8A857C", fontSize: 13, fontWeight: 700, cursor: dirty && !saving ? "pointer" : "default" }}>
                {saving ? "Menyimpan…" : dirty ? "Simpan Perubahan" : "Tersimpan"}
              </button>
            </div>
          </>
        )}
      </div>

      <OwnerConfirm
        open={confirmOpen}
        title="Simpan pengaturan"
        message="Masukkan kata sandi pemilik untuk menyimpan perubahan pengaturan"
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => void persist()}
      />
    </div>
  );
}

// Small helper so surfaces can read a single flag succinctly.
export function useSetting<K extends keyof StoreSettings>(key: K): StoreSettings[K] {
  return useStore((s) => (s.settings ?? DEFAULT_SETTINGS)[key]);
}
