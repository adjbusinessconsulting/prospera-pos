import { useState } from "react";
import { Trash2, Clock, ShoppingBag } from "lucide-react";
import { formatRp } from "../data";
import { listHeld, saveHeld, removeHeld, type HeldOrder } from "../lib/heldOrders";
import type { CartItem } from "../types";

// "Tahan Pesanan" — hold the current cart (optionally atas nama siapa) and recall
// it later to settle. mode "hold" = save the active cart; mode "list" = recall/delete.
interface Props {
  mode: "hold" | "list" | null;
  storeId: string;
  cashierName: string;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onHeld: () => void;                    // after saving — parent clears the cart
  onRecall: (items: CartItem[]) => void; // load a held order back into the cart
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function HeldOrders({ mode, storeId, cashierName, cart, total, onClose, onHeld, onRecall }: Props) {
  const [name, setName] = useState("");
  const [tick, setTick] = useState(0);   // bump to re-read the list after a delete
  if (!mode) return null;
  const held = listHeld(storeId);

  function doHold() {
    saveHeld(storeId, {
      id: crypto.randomUUID(),
      label: name.trim() || `Pesanan ${held.length + 1}`,
      items: cart,
      total,
      cashierName,
      createdAt: new Date().toISOString(),
    });
    setName("");
    onHeld();
  }

  function recall(o: HeldOrder) {
    if (cart.length > 0 && !window.confirm("Keranjang aktif akan diganti dengan pesanan ini. Lanjut?")) return;
    removeHeld(storeId, o.id);
    onRecall(o.items);
  }

  function del(id: string) {
    removeHeld(storeId, id);
    setTick(t => t + 1);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(11,17,41,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "88vh", display: "flex", flexDirection: "column", background: "white", borderRadius: 18, boxShadow: "0 30px 80px rgba(11,17,41,0.4)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 22px 16px", borderBottom: "1px solid #ECE7DD" }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600 }}>PESANAN</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#0D1117" }}>{mode === "hold" ? "Tahan pesanan" : "Pesanan ditahan"}</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#7A776F" }}>✕</button>
        </div>

        {mode === "hold" ? (
          <div style={{ padding: "18px 22px 22px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#7A776F", lineHeight: 1.6 }}>Simpan keranjang ini untuk diselesaikan nanti. {cart.length} item · <b style={{ color: "#0D1117" }}>{formatRp(total)}</b>.</p>
            <label style={{ display: "block", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600, marginBottom: 7 }}>Atas nama <span style={{ textTransform: "none", letterSpacing: 0, color: "#B0A99A", fontWeight: 400 }}>(opsional)</span></label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="mis. Budi / Meja 4"
              style={{ width: "100%", height: 46, boxSizing: "border-box", border: "1.5px solid #ECE7DD", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#0D1117", background: "#FAFAF7", outline: "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Batal</button>
              <button onClick={doHold} style={{ flex: 2, height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Simpan pesanan</button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 18px" }} key={tick}>
            {held.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#8A857C" }}>
                <ShoppingBag size={26} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                <p style={{ margin: "10px 0 0", fontSize: 13 }}>Belum ada pesanan ditahan.</p>
              </div>
            )}
            {held.map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 6px", borderBottom: "1px solid #F2EDE3" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0D1117", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#8A857C", display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={11} /> {fmtTime(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} item · {formatRp(o.total)}
                  </p>
                </div>
                <button onClick={() => del(o.id)} title="Hapus" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#b0492f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
                <button onClick={() => recall(o)} style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>Buka</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
