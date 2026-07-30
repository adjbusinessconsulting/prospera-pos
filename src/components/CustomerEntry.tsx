import { useEffect, useState } from "react";
import { useStore, isAtLeast } from "../store";
import { supabase } from "../lib/supabase";

// Tag a customer to the current order. Free/Standard: just type a name (+ optional
// WhatsApp) — it rides on the sale (receipt + Riwayat) but isn't saved to a book.
// Premium: also a picker/autocomplete from the saved customers (the mini database)
// so repeat customers are recognized. The customer is only *saved* to the book
// when the order is settled as hutang (handled in the payment flow).
interface Cust { name: string; phone: string | null }

export function CustomerEntry({ open, onClose }: { open: boolean; onClose: () => void }) {
  const storeId = useStore(s => s.storeId);
  const storeTier = useStore(s => s.storeTier);
  const isDemoMode = useStore(s => s.isDemoMode);
  const orderCustomer = useStore(s => s.orderCustomer);
  const setOrderCustomer = useStore(s => s.setOrderCustomer);
  const isPremium = isAtLeast(storeId ? storeTier : "premium", "premium");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recent, setRecent] = useState<Cust[]>([]);

  useEffect(() => { if (open) { setName(orderCustomer?.name ?? ""); setPhone(orderCustomer?.phone ?? ""); } }, [open, orderCustomer]);

  useEffect(() => {
    if (!open || !isPremium || !storeId || isDemoMode) return;
    let cancelled = false;
    supabase.from("customers").select("name,phone").eq("store_id", storeId).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (!cancelled) setRecent((data ?? []) as Cust[]); });
    return () => { cancelled = true; };
  }, [open, isPremium, storeId, isDemoMode]);

  if (!open) return null;

  const suggestions = isPremium && name.trim().length >= 1
    ? recent.filter(c => c.name.toLowerCase().includes(name.trim().toLowerCase()) && c.name.toLowerCase() !== name.trim().toLowerCase()).slice(0, 5)
    : [];

  function save() {
    const n = name.trim();
    if (!n) { setOrderCustomer(null); onClose(); return; }
    setOrderCustomer({ name: n, phone: phone.trim() });
    onClose();
  }

  const inp: React.CSSProperties = { width: "100%", height: 46, boxSizing: "border-box", border: "1.5px solid #ECE7DD", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#0D1117", background: "#FAFAF7", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, margin: "0 0 6px" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1150, background: "rgba(11,17,41,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "white", borderRadius: 18, padding: 22, boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
        <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#A6843F", fontWeight: 700 }}>PELANGGAN</p>
        <h3 style={{ margin: "3px 0 4px", fontSize: 18, fontWeight: 800, color: "#0D1117" }}>Atas nama pesanan</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#7A776F", lineHeight: 1.5 }}>
          Muncul di struk &amp; riwayat. {isPremium ? "Pelanggan lama akan dikenali." : "Tersimpan di buku pelanggan hanya bila jadi hutang."}
        </p>

        <label style={lbl}>Nama</label>
        <input value={name} autoFocus onChange={e => setName(e.target.value)} placeholder="mis. Budi" style={inp} />
        {suggestions.length > 0 && (
          <div style={{ border: "1px solid #ECE7DD", borderRadius: 10, marginTop: 6, overflow: "hidden" }}>
            {suggestions.map((c, i) => (
              <button key={i} onClick={() => { setName(c.name); setPhone(c.phone ?? ""); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: "white", border: "none", borderTop: i ? "1px solid #F2EDE3" : "none", cursor: "pointer", fontSize: 13, color: "#0D1117", fontFamily: "inherit" }}>
                {c.name}{c.phone ? <span style={{ color: "#A6843F", marginLeft: 6, fontSize: 11.5 }}>· {c.phone}</span> : null}
              </button>
            ))}
          </div>
        )}

        <label style={{ ...lbl, marginTop: 14 }}>WhatsApp / Telp <span style={{ textTransform: "none", letterSpacing: 0, color: "#B0A99A", fontWeight: 400 }}>(opsional)</span></label>
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="0812-xxxx-xxxx" style={inp} />

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {orderCustomer
            ? <button onClick={() => { setOrderCustomer(null); onClose(); }} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#b0492f", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Hapus</button>
            : <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Batal</button>}
          <button onClick={save} style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
