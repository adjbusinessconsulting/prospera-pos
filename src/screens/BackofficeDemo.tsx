import { useState, useEffect, type CSSProperties } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { DemoControls } from "../components/DemoControls";
import { getLog, type AuditEntry } from "../lib/auditlog";
import type { Product } from "../types";

const NAVY = "#0B1129", GOLD = "#A6843F", GREEN = "#4E8C6E", MUTE = "#7A776F",
  BORDER = "#ECE7DD", CREAM = "#FAFAF7", CARD = "#FFFFFF", DANGER = "#C25E3D";

interface Branch { id: string; name: string; address: string; sales: number; trx: number; stockValue: number; lowStock: number; }
const DEMO_BRANCHES: Branch[] = [
  { id: "b1", name: "Toko Sembako Maju · Pusat", address: "Jl. Diponegoro No. 24, Palu Timur", sales: 4286000, trx: 168, stockValue: 7778500, lowStock: 1 },
  { id: "b2", name: "Toko Sembako Maju · Palu Barat", address: "Jl. Sisingamangaraja No. 8", sales: 3120000, trx: 121, stockValue: 6240000, lowStock: 3 },
  { id: "b3", name: "Toko Sembako Maju · Palu Selatan", address: "Jl. Basuki Rahmat No. 15", sales: 2810000, trx: 104, stockValue: 5410000, lowStock: 2 },
  { id: "b4", name: "Toko Sembako Maju · Donggala", address: "Jl. Trans Sulawesi Km 34", sales: 1940000, trx: 78, stockValue: 4120000, lowStock: 5 },
  { id: "b5", name: "Toko Sembako Maju · Poso", address: "Jl. Pulau Sumatra No. 3", sales: 2350000, trx: 92, stockValue: 4880000, lowStock: 2 },
];

type Tab = "ringkasan" | "produk" | "stok" | "log";
const TABS: { id: Tab; label: string }[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "produk", label: "Produk & Stok" },
  { id: "stok", label: "Stok Harian" },
  { id: "log", label: "Log Aktivitas" },
];

const typeLabel: Record<string, string> = {
  "product.add": "Produk baru",
  "product.price": "Ubah harga",
  "product.edit": "Ubah produk",
  "stock.add": "Tambah stok",
  "sale": "Transaksi",
};
const typeColor: Record<string, string> = {
  "product.price": DANGER, "product.add": GREEN, "stock.add": GOLD,
};

export default function BackofficeDemo() {
  const { products, updateProduct, lowStockThreshold } = useStore();
  const threshold = lowStockThreshold || 5;

  const [tab, setTab] = useState<Tab>("ringkasan");
  const [q, setQ] = useState("");
  const [tambahTarget, setTambahTarget] = useState<Product | null>(null);
  const [tambahQty, setTambahQty] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(DEMO_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<string>(DEMO_BRANCHES[0].id);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [logEntries, setLogEntries] = useState<AuditEntry[]>([]);
  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);
  useEffect(() => { if (tab === "log") setLogEntries([...getLog()].reverse()); }, [tab]);

  const branch = branches.find(b => b.id === selectedBranch) ?? branches[0];
  const branchShort = branch.name.replace("Toko Sembako Maju · ", "");
  const totSales = branches.reduce((s, b) => s + b.sales, 0);
  const totTrx = branches.reduce((s, b) => s + b.trx, 0);
  const totStock = branches.reduce((s, b) => s + b.stockValue, 0);
  const totLow = branches.reduce((s, b) => s + b.lowStock, 0);

  function addBranch() {
    const name = newBranch.trim();
    if (!name) return;
    const b: Branch = { id: `b${Date.now()}`, name: `Toko Sembako Maju · ${name}`, address: "Cabang baru — atur alamat nanti", sales: 0, trx: 0, stockValue: 0, lowStock: 0 };
    setBranches(prev => [...prev, b]); setSelectedBranch(b.id); setShowAddBranch(false); setNewBranch("");
  }

  const list = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const totalProduk = products.length;
  const stokRendah = products.filter(p => (p.stock ?? 0) <= threshold).length;
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

  const cell = (extra: CSSProperties = {}): CSSProperties => ({ padding: "11px 18px", fontSize: 13, ...extra });

  return (
    <div style={{ position: "fixed", inset: 0, background: CREAM, display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", padding: "8px 10px", background: CREAM, borderBottom: `1px solid ${BORDER}` }}>
        <DemoControls />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "16px 16px 40px" : "24px 32px 48px" }}>
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Sterith · Back Office (Demo) · Premium</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: isMobile ? 26 : 32, fontWeight: 500, color: NAVY, marginTop: 4 }}>Toko Sembako Maju</h1>
          <p style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>{branches.length} cabang · dikelola dari satu Back Office</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                appearance: "none", border: "none", background: "transparent", cursor: "pointer",
                padding: "9px 14px", fontSize: 13, fontWeight: on ? 800 : 600, whiteSpace: "nowrap",
                color: on ? NAVY : MUTE, borderBottom: `2px solid ${on ? GOLD : "transparent"}`, marginBottom: -1,
              }}>{t.label}</button>
            );
          })}
        </div>

        {/* ── RINGKASAN ── */}
        {tab === "ringkasan" && (<>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(78,140,110,0.07)", border: "1px solid rgba(78,140,110,0.3)", borderRadius: 12, padding: "11px 14px", marginBottom: 18 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            <span style={{ fontSize: 12.5, color: "#0B1129" }}>Kontrol semua cabang dari satu tempat. Perubahan <b>langsung terlihat di Kasir</b>. Sesi demo sementara — muat ulang untuk reset.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { l: "Penjualan Hari Ini", v: formatRp(totSales), accent: true },
              { l: "Transaksi", v: String(totTrx), accent: false },
              { l: "Nilai Stok", v: formatRp(totStock), accent: false },
              { l: "Stok Rendah", v: `${totLow} item`, accent: false, warn: totLow > 0 },
            ].map(s => (
              <div key={s.l} style={{ background: s.accent ? NAVY : CARD, border: s.accent ? "none" : `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: s.accent ? "rgba(201,165,95,0.85)" : MUTE }}>{s.l}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginTop: 6, color: s.accent ? "#F2EDE3" : (s.warn ? GOLD : NAVY), fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Semua Cabang · {branches.length}</h2>
            <button onClick={() => setShowAddBranch(true)} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 9, border: `1px solid ${GOLD}55`, background: "rgba(201,165,95,0.10)", color: GOLD, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Buat Cabang</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
            {branches.map(b => {
              const active = b.id === selectedBranch;
              const row = (label: string, val: string, color: string) => (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ color: MUTE }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{val}</span>
                </div>
              );
              return (
                <button key={b.id} onClick={() => { setSelectedBranch(b.id); setTab("produk"); }}
                  style={{ textAlign: "left", background: CARD, border: `2px solid ${active ? GOLD : BORDER}`, borderRadius: 14, padding: 14, cursor: "pointer", position: "relative" }}>
                  {active && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: NAVY, background: "rgba(201,165,95,0.9)", borderRadius: 5, padding: "2px 6px", textTransform: "uppercase" }}>Dikelola</span>}
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: NAVY }}>{b.name.replace("Toko Sembako Maju · ", "")}</div>
                  <div style={{ fontSize: 10.5, color: MUTE, marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.address}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {row("Penjualan", formatRp(b.sales), GREEN)}
                    {row("Transaksi", String(b.trx), NAVY)}
                    {row("Nilai stok", formatRp(b.stockValue), NAVY)}
                    {b.lowStock > 0 && row("Stok rendah", `${b.lowStock} item`, DANGER)}
                  </div>
                </button>
              );
            })}
          </div>
        </>)}

        {/* branch context strip (shared by Produk & Stok tabs) */}
        {(tab === "produk" || tab === "stok") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: MUTE }}>Cabang:</span>
            {branches.map(b => {
              const on = b.id === selectedBranch;
              return (
                <button key={b.id} onClick={() => setSelectedBranch(b.id)} style={{
                  height: 30, padding: "0 11px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${on ? GOLD : BORDER}`, background: on ? "rgba(201,165,95,0.12)" : CARD, color: on ? GOLD : MUTE, whiteSpace: "nowrap",
                }}>{b.name.replace("Toko Sembako Maju · ", "")}</button>
              );
            })}
          </div>
        )}

        {/* ── PRODUK & STOK ── */}
        {tab === "produk" && (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Kelola Produk &amp; Stok</h2>
              <p style={{ fontSize: 11.5, color: MUTE, marginTop: 1 }}>{branchShort} · {totalProduk} produk · {stokRendah} stok rendah · terjual {terjualHariIni} pcs</p>
            </div>
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
                      <td style={cell({ fontWeight: 600, color: NAVY })}>{p.name}</td>
                      <td style={cell({ fontSize: 12, color: MUTE })}>{p.category}</td>
                      <td style={{ padding: "11px 18px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0 10px", height: 34, background: CREAM }}>
                          <span style={{ fontSize: 12, color: MUTE }}>Rp</span>
                          <input value={p.price.toLocaleString("id-ID")} onChange={e => setPrice(p.id, e.target.value)} inputMode="numeric"
                            style={{ width: 92, border: 0, outline: "none", background: "transparent", fontSize: 13.5, fontWeight: 600, color: NAVY, fontVariantNumeric: "tabular-nums" }} />
                        </div>
                      </td>
                      <td style={cell({ textAlign: "right", fontSize: 13.5, fontWeight: 700, color: (p.stock ?? 0) <= threshold ? GOLD : NAVY, fontVariantNumeric: "tabular-nums" })}>{p.stock ?? 0}</td>
                      <td style={cell({ textAlign: "right", fontSize: 13, color: MUTE, fontVariantNumeric: "tabular-nums" })}>{p.stockTerjual ?? 0}</td>
                      <td style={{ padding: "11px 18px", textAlign: "right" }}>
                        <button onClick={() => { setTambahTarget(p); setTambahQty(""); }} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid rgba(78,140,110,0.4)`, background: "rgba(78,140,110,0.07)", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Stok</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ── STOK HARIAN (daily ledger: awal + tambahan − terjual = sisa) ── */}
        {tab === "stok" && (<>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Stok Harian</h2>
            <p style={{ fontSize: 11.5, color: MUTE, marginTop: 1 }}>{branchShort} · Stok Awal + Tambahan − Terjual = Sisa. Sisa jadi Stok Awal besok otomatis.</p>
          </div>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map(p => {
                const awal = p.stockAwal ?? 0, tambah = p.stockTambahan ?? 0, jual = p.stockTerjual ?? 0, sisa = p.stock ?? 0;
                return (
                  <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{p.name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                      {[["Awal", awal, NAVY], ["+ Tambah", tambah, GREEN], ["− Terjual", jual, DANGER], ["= Sisa", sisa, sisa <= threshold ? GOLD : NAVY]].map(([l, v, c]) => (
                        <div key={l as string}>
                          <div style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTE, fontWeight: 700 }}>{l}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: c as string, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{v as number}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Produk", "Stok Awal", "+ Tambahan", "− Terjual", "= Sisa"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 ? "left" : "right", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTE, fontWeight: 700, padding: "12px 18px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const awal = p.stockAwal ?? 0, tambah = p.stockTambahan ?? 0, jual = p.stockTerjual ?? 0, sisa = p.stock ?? 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid #F2EDE3` }}>
                        <td style={cell({ fontWeight: 600, color: NAVY })}>{p.name}</td>
                        <td style={cell({ textAlign: "right", fontVariantNumeric: "tabular-nums", color: NAVY })}>{awal}</td>
                        <td style={cell({ textAlign: "right", fontVariantNumeric: "tabular-nums", color: GREEN, fontWeight: 700 })}>{tambah ? `+${tambah}` : "—"}</td>
                        <td style={cell({ textAlign: "right", fontVariantNumeric: "tabular-nums", color: DANGER, fontWeight: 700 })}>{jual ? `−${jual}` : "—"}</td>
                        <td style={cell({ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 800, color: sisa <= threshold ? GOLD : NAVY })}>{sisa}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ── LOG AKTIVITAS (append-only audit trail) ── */}
        {tab === "log" && (<>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Log Aktivitas</h2>
            <p style={{ fontSize: 11.5, color: MUTE, marginTop: 1 }}>Catatan perubahan harga, produk &amp; stok oleh kasir. Tidak bisa diubah atau dihapus.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(78,140,110,0.07)", border: "1px solid rgba(78,140,110,0.3)", borderRadius: 10, padding: "9px 12px", marginBottom: 14 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
            <span style={{ fontSize: 12, color: NAVY }}>Rantai utuh — tidak ada entri yang diubah atau dihapus.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logEntries.map(e => {
              const t = new Date(e.time);
              const when = t.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={e.seq} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: typeColor[e.type] ?? MUTE, background: `${typeColor[e.type] ?? MUTE}18`, borderRadius: 6, padding: "3px 8px", marginTop: 1 }}>{typeLabel[e.type] ?? e.type}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: NAVY }}>{e.detail}</div>
                    <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{e.actor} · {when}</div>
                  </div>
                </div>
              );
            })}
            {!logEntries.length && <p style={{ fontSize: 12.5, color: MUTE }}>Belum ada aktivitas.</p>}
          </div>
        </>)}
      </div>
      </div>

      {/* Buat Cabang modal */}
      {showAddBranch && (
        <div onClick={() => setShowAddBranch(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,17,41,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: isMobile ? "18px 18px 0 0" : 16, width: "100%", maxWidth: isMobile ? "100%" : 380, padding: "20px 20px 18px", boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTE, fontWeight: 700 }}>Multi-toko · Premium</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "3px 0 4px" }}>Buat cabang baru</div>
            <p style={{ fontSize: 12, color: MUTE, marginBottom: 12 }}>Premium boleh menambah cabang tanpa batas. Standard maksimal 2.</p>
            <input autoFocus value={newBranch} onChange={e => setNewBranch(e.target.value)} onKeyDown={e => e.key === "Enter" && addBranch()}
              placeholder="mis. Palu Utara"
              style={{ width: "100%", height: 46, borderRadius: 10, border: `1px solid ${newBranch.trim() ? GREEN : BORDER}`, padding: "0 14px", fontSize: 15, color: NAVY, outline: "none" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowAddBranch(false)} style={{ flex: 1, height: 46, borderRadius: 11, border: `1px solid ${BORDER}`, background: CARD, color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              <button onClick={addBranch} disabled={!newBranch.trim()} style={{ flex: 2, height: 46, borderRadius: 11, border: 0, background: NAVY, color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: newBranch.trim() ? 1 : 0.5 }}>Buat Cabang</button>
            </div>
          </div>
        </div>
      )}

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
