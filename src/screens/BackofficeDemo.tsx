import { useState, useEffect } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { DemoControls } from "../components/DemoControls";
import type { Product } from "../types";

const NAVY = "#0B1129", GOLD = "#A6843F", GREEN = "#4E8C6E", MUTE = "#7A776F",
  BORDER = "#ECE7DD", CREAM = "#FAFAF7", CARD = "#FFFFFF";

export default function BackofficeDemo() {
  const { products, updateProduct, storeName, lowStockThreshold } = useStore();
  const threshold = lowStockThreshold || 5;

  const [q, setQ] = useState("");
  const [tambahTarget, setTambahTarget] = useState<Product | null>(null);
  const [tambahQty, setTambahQty] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  const list = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const totalProduk = products.length;
  const stokRendah = products.filter(p => (p.stock ?? 0) <= threshold).length;
  const nilaiStok = products.reduce((s, p) => s + p.price * (p.stock ?? 0), 0);
  const terjualHariIni = products.reduce((s, p) => s + (p.stockTerjual ?? 0), 0);

  function setPrice(id: string, val: string) {
    const n = parseInt(val.replace(/\D/g, ""), 10) || 0;
    updateProduct(id, { price: n });
  }
  function addStock() {
    const n = parseInt(tambahQty, 10);
    if (!tambahTarget || !n || n <= 0) return;
    const p = tambahTarget;
    updateProduct(p.id, { stock: (p.stock ?? 0) + n, stockTambahan: (p.stockTambahan ?? 0) + n });
    setTambahTarget(null); setTambahQty("");
  }

  const stats = [
    { l: "Total Produk", v: String(totalProduk), c: NAVY },
    { l: "Stok Rendah", v: String(stokRendah), c: stokRendah > 0 ? GOLD : NAVY },
    { l: "Nilai Stok", v: formatRp(nilaiStok), c: NAVY },
    { l: "Terjual Hari Ini", v: `${terjualHariIni} pcs`, c: GREEN },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: CREAM, display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", padding: "8px 10px", background: CREAM, borderBottom: `1px solid ${BORDER}` }}>
        <DemoControls />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "16px 16px 40px" : "24px 32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Sterith · Back Office (Demo)</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: isMobile ? 26 : 32, fontWeight: 500, color: NAVY, marginTop: 4 }}>{storeName || "Demo Toko"}</h1>
          </div>
        </div>

        {/* Live note */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(78,140,110,0.07)", border: "1px solid rgba(78,140,110,0.3)", borderRadius: 12, padding: "11px 14px", marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          <span style={{ fontSize: 12.5, color: "#0B1129" }}>
            Perubahan di sini <b>langsung terlihat di Kasir</b> (Front Office). Sesi demo bersifat sementara — muat ulang halaman untuk mengembalikan semuanya.
          </span>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
          {stats.map((s, i) => (
            <div key={s.l} style={{ background: i === 0 ? NAVY : CARD, border: i === 0 ? "none" : `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: i === 0 ? "rgba(201,165,95,0.85)" : MUTE }}>{s.l}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginTop: 6, color: i === 0 ? "#F2EDE3" : s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Product management */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Kelola Produk &amp; Stok</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0 12px", height: 38, minWidth: 200 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTE} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari produk…" style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontSize: 13, color: NAVY }} />
          </div>
        </div>

        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map(p => (
              <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{p.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: (p.stock ?? 0) <= threshold ? GOLD : NAVY, fontVariantNumeric: "tabular-nums" }}>Sisa {p.stock ?? 0}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 10.5, color: MUTE }}>Harga
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0 8px", height: 36, background: CREAM }}>
                      <span style={{ fontSize: 12, color: MUTE }}>Rp</span>
                      <input value={p.price.toLocaleString("id-ID")} onChange={e => setPrice(p.id, e.target.value)} inputMode="numeric"
                        style={{ width: 90, border: 0, outline: "none", background: "transparent", fontSize: 13.5, fontWeight: 600, color: NAVY, fontVariantNumeric: "tabular-nums" }} />
                    </div>
                  </label>
                  <button onClick={() => { setTambahTarget(p); setTambahQty(""); }} style={{ marginLeft: "auto", marginTop: 16, height: 38, padding: "0 14px", borderRadius: 9, border: `1px solid rgba(78,140,110,0.4)`, background: "rgba(78,140,110,0.07)", color: GREEN, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Tambah Stok</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Produk", "Kategori", "Harga (bisa diubah)", "Sisa", "Terjual", ""].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 3 && i <= 4 ? "right" : "left", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTE, fontWeight: 700, padding: "12px 18px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid #F2EDE3` }}>
                    <td style={{ padding: "11px 18px", fontSize: 13, fontWeight: 600, color: NAVY }}>{p.name}</td>
                    <td style={{ padding: "11px 18px", fontSize: 12, color: MUTE }}>{p.category}</td>
                    <td style={{ padding: "11px 18px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0 10px", height: 34, background: CREAM }}>
                        <span style={{ fontSize: 12, color: MUTE }}>Rp</span>
                        <input value={p.price.toLocaleString("id-ID")} onChange={e => setPrice(p.id, e.target.value)} inputMode="numeric"
                          style={{ width: 92, border: 0, outline: "none", background: "transparent", fontSize: 13.5, fontWeight: 600, color: NAVY, fontVariantNumeric: "tabular-nums" }} />
                      </div>
                    </td>
                    <td style={{ padding: "11px 18px", textAlign: "right", fontSize: 13.5, fontWeight: 700, color: (p.stock ?? 0) <= threshold ? GOLD : NAVY, fontVariantNumeric: "tabular-nums" }}>{p.stock ?? 0}</td>
                    <td style={{ padding: "11px 18px", textAlign: "right", fontSize: 13, color: MUTE, fontVariantNumeric: "tabular-nums" }}>{p.stockTerjual ?? 0}</td>
                    <td style={{ padding: "11px 18px", textAlign: "right" }}>
                      <button onClick={() => { setTambahTarget(p); setTambahQty(""); }} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid rgba(78,140,110,0.4)`, background: "rgba(78,140,110,0.07)", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Stok</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Tambah stok modal */}
      {tambahTarget && (
        <div onClick={() => setTambahTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,17,41,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: isMobile ? "18px 18px 0 0" : 16, width: "100%", maxWidth: isMobile ? "100%" : 360, padding: "20px 20px 18px", boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTE, fontWeight: 700 }}>Tambah Stok</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "3px 0 14px" }}>{tambahTarget.name}</div>
            <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Sisa sekarang: <b style={{ color: NAVY }}>{tambahTarget.stock ?? 0}</b></div>
            <input autoFocus type="number" min={1} value={tambahQty} onChange={e => setTambahQty(e.target.value)} onKeyDown={e => e.key === "Enter" && addStock()}
              placeholder="mis. 24"
              style={{ width: "100%", height: 46, borderRadius: 10, border: `1px solid ${(parseInt(tambahQty, 10) || 0) > 0 ? GREEN : BORDER}`, padding: "0 14px", fontSize: 15, color: NAVY, outline: "none", fontVariantNumeric: "tabular-nums" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setTambahTarget(null)} style={{ flex: 1, height: 46, borderRadius: 11, border: `1px solid ${BORDER}`, background: CARD, color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              <button onClick={addStock} disabled={(parseInt(tambahQty, 10) || 0) <= 0} style={{ flex: 2, height: 46, borderRadius: 11, border: 0, background: NAVY, color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (parseInt(tambahQty, 10) || 0) <= 0 ? 0.5 : 1 }}>Tambah Stok</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
