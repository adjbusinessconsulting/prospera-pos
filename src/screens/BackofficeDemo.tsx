import { useState, useEffect, type CSSProperties } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { DemoControls } from "../components/DemoControls";
import { getLog, type AuditEntry } from "../lib/auditlog";
import type { Product } from "../types";

const NAVY = "#0D1117", GOLD = "#A6843F", GREEN = "#4E8C6E", MUTE = "#7A776F",
  BORDER = "#ECE7DD", CREAM = "#FAFAF7", CARD = "#FFFFFF", DANGER = "#C25E3D";

interface Branch { id: string; name: string; address: string; sales: number; trx: number; stockValue: number; lowStock: number; }
const DEMO_BRANCHES: Branch[] = [
  { id: "b1", name: "Toko Sembako Maju · Pusat", address: "Jl. Diponegoro No. 24, Palu Timur", sales: 4286000, trx: 168, stockValue: 7778500, lowStock: 1 },
  { id: "b2", name: "Toko Sembako Maju · Palu Barat", address: "Jl. Sisingamangaraja No. 8", sales: 3120000, trx: 121, stockValue: 6240000, lowStock: 3 },
  { id: "b3", name: "Toko Sembako Maju · Palu Selatan", address: "Jl. Basuki Rahmat No. 15", sales: 2810000, trx: 104, stockValue: 5410000, lowStock: 2 },
  { id: "b4", name: "Toko Sembako Maju · Donggala", address: "Jl. Trans Sulawesi Km 34", sales: 1940000, trx: 78, stockValue: 4120000, lowStock: 5 },
  { id: "b5", name: "Toko Sembako Maju · Poso", address: "Jl. Pulau Sumatra No. 3", sales: 2350000, trx: 92, stockValue: 4880000, lowStock: 2 },
];

// Per-branch product seeds — each cabang stocks a different mix, to show that
// one Back Office manages branches that don't sell the same things.
let _pid = 0;
const mk = (name: string, category: string, price: number, awal: number, tambahan: number, terjual: number): Product => {
  _pid++;
  return {
    id: `bp${_pid}`, name, monogram: name.slice(0, 2).toUpperCase(), emoji: "📦",
    category, unit: "pcs", price, stock: awal + tambahan - terjual,
    stockAwal: awal, stockTambahan: tambahan, stockTerjual: terjual, stockDate: null,
  };
};
// b1 (Pusat) uses the live Kasir catalog from the store. b2–b5 have their own.
const BRANCH_SEEDS: Record<string, Product[]> = {
  b2: [ // Palu Barat — dekat pasar, fokus beras & minyak
    mk("Beras Pandan 5kg", "Sembako", 74000, 40, 20, 18),
    mk("Beras Merah 5kg", "Sembako", 82000, 18, 6, 9),
    mk("Minyak Bimoli 2L", "Sembako", 39000, 30, 12, 24),
    mk("Gula Pasir 1kg", "Sembako", 15500, 35, 10, 28),
    mk("Tepung Terigu 1kg", "Sembako", 13000, 25, 0, 12),
    mk("Telur Ayam /kg", "Segar", 29000, 30, 15, 41),
    mk("Kopi Kapal Api 165g", "Minuman", 12000, 24, 0, 8),
    mk("Teh Celup 25s", "Minuman", 8500, 20, 0, 3),
  ],
  b3: [ // Palu Selatan — dekat sekolah, minuman & rokok laris
    mk("Indomie Goreng", "Makanan", 3500, 120, 60, 148),
    mk("Aqua 600ml", "Minuman", 4000, 96, 48, 132),
    mk("Teh Botol 350ml", "Minuman", 5000, 72, 24, 78),
    mk("Rokok Sampoerna 16", "Rokok", 32000, 40, 20, 44),
    mk("Kopi Good Day", "Minuman", 5500, 60, 0, 33),
    mk("Susu Kental Manis", "Sembako", 12000, 30, 10, 22),
    mk("Sabun Mandi", "Rumah Tangga", 5000, 40, 0, 6),
    mk("Beras Pandan 5kg", "Sembako", 75000, 20, 5, 12),
  ],
  b4: [ // Donggala — pesisir, banyak ikan asin & bumbu
    mk("Ikan Teri Asin 250g", "Segar", 18000, 24, 12, 22),
    mk("Sarden Kaleng", "Makanan", 9500, 48, 0, 15),
    mk("Minyak Goreng Curah 1L", "Sembako", 17000, 40, 20, 44),
    mk("Gula Merah 1kg", "Sembako", 20000, 20, 0, 8),
    mk("Kecap Manis 275ml", "Sembako", 11000, 30, 0, 9),
    mk("Garam 500g", "Sembako", 4000, 50, 0, 5),
    mk("Mie Sedaap", "Makanan", 3200, 100, 40, 96),
    mk("Beras Pandan 5kg", "Sembako", 76000, 15, 5, 14),
  ],
  b5: [ // Poso — campur, ada kopi lokal & jajanan
    mk("Kopi Robusta Lokal 250g", "Minuman", 22000, 30, 10, 18),
    mk("Cokelat Bubuk", "Minuman", 15000, 24, 0, 7),
    mk("Kerupuk 1kg", "Makanan", 24000, 20, 0, 6),
    mk("Gula Pasir 1kg", "Sembako", 15500, 30, 10, 25),
    mk("Minyak Bimoli 2L", "Sembako", 38000, 25, 10, 20),
    mk("Telur Ayam /kg", "Segar", 28000, 28, 12, 33),
    mk("Tepung Beras 500g", "Sembako", 9000, 22, 0, 4),
    mk("Beras Pandan 5kg", "Sembako", 75000, 24, 8, 19),
  ],
};

type Tab = "ringkasan" | "laporan" | "produk" | "stok" | "log" | "pengaturan";
const TABS: { id: Tab; label: string }[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "laporan", label: "Laporan" },
  { id: "produk", label: "Produk & Stok" },
  { id: "stok", label: "Stok Harian" },
  { id: "log", label: "Log Aktivitas" },
  { id: "pengaturan", label: "Pengaturan" },
];

// Demo analytics for the Laporan tab (month-to-date, all cabang).
const PAY_BREAKDOWN = [
  { label: "Tunai", value: 8_900_000, color: "#4E8C6E" },
  { label: "QRIS", value: 3_100_000, color: "#0D1117" },
  { label: "Transfer", value: 1_300_000, color: "#A6843F" },
  { label: "Debit", value: 1_206_000, color: "#7A776F" },
];
const PIUTANG = 1_240_000; // hutang belum lunas — piutang, bukan omzet
const TOP_PRODUCTS = [
  { name: "Beras Pandan 5kg", qty: 128, rev: 9_600_000 },
  { name: "Telur Ayam /kg", qty: 96, rev: 2_688_000 },
  { name: "Rokok Sampoerna 16", qty: 62, rev: 1_984_000 },
  { name: "Aqua 600ml", qty: 388, rev: 1_552_000 },
  { name: "Indomie Goreng", qty: 420, rev: 1_470_000 },
];
const BY_CASHIER = [
  { name: "Aerith D.", rev: 7_820_000, trx: 92 },
  { name: "Stevany C.", rev: 6_686_000, trx: 76 },
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
  const { products, updateProduct, addProduct, deleteProduct, lowStockThreshold } = useStore();
  const threshold = lowStockThreshold || 5;

  const [tab, setTab] = useState<Tab>("ringkasan");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [tambahTarget, setTambahTarget] = useState<Product | null>(null);
  const [tambahQty, setTambahQty] = useState("");
  const [stockMode, setStockMode] = useState<"in" | "out">("in");   // + Stok / − Stok
  const [delTarget, setDelTarget] = useState<Product | null>(null);  // delete confirm
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [npName, setNpName] = useState("");
  const [npCat, setNpCat] = useState("");
  const [npPrice, setNpPrice] = useState("");
  const [npStock, setNpStock] = useState("");
  const [npUnit, setNpUnit] = useState("pcs");
  const [isMobile, setIsMobile] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(DEMO_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<string>(DEMO_BRANCHES[0].id);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [logEntries, setLogEntries] = useState<AuditEntry[]>([]);
  // Editable per-branch catalogs for b2–b5 (b1/Pusat uses the live store products).
  const [branchProducts, setBranchProducts] = useState<Record<string, Product[]>>(() => ({ ...BRANCH_SEEDS }));
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
    const id = `b${Date.now()}`;
    const b: Branch = { id, name: `Toko Sembako Maju · ${name}`, address: "Cabang baru — atur alamat nanti", sales: 0, trx: 0, stockValue: 0, lowStock: 0 };
    setBranches(prev => [...prev, b]);
    setBranchProducts(prev => ({ ...prev, [id]: [] }));
    setSelectedBranch(id); setShowAddBranch(false); setNewBranch("");
  }

  // Pusat (b1) reflects the live Kasir catalog; other branches have their own.
  const isPusat = selectedBranch === "b1";
  const branchList: Product[] = isPusat ? products : (branchProducts[selectedBranch] ?? []);
  const categories = ["Semua", ...Array.from(new Set(branchList.map(p => p.category).filter(Boolean)))];
  const list = branchList.filter(p =>
    (catFilter === "Semua" || p.category === catFilter) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const totalProduk = branchList.length;
  const stokRendah = branchList.filter(p => (p.stock ?? 0) <= threshold).length;
  const terjualHariIni = branchList.reduce((s, p) => s + (p.stockTerjual ?? 0), 0);

  // Update a product on the selected branch (Pusat → live store; others → local catalog).
  function patchProduct(id: string, updates: Partial<Product>) {
    if (isPusat) { updateProduct(id, updates); return; }
    setBranchProducts(prev => ({
      ...prev,
      [selectedBranch]: (prev[selectedBranch] ?? []).map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }
  function setPrice(id: string, val: string) {
    patchProduct(id, { price: parseInt(val.replace(/\D/g, ""), 10) || 0 });
  }
  // Stock in (+) or out (−); out never goes below 0.
  function adjustStock() {
    const n = parseInt(tambahQty, 10);
    if (!tambahTarget || !n || n <= 0) return;
    const p = tambahTarget;
    if (stockMode === "in") {
      patchProduct(p.id, { stock: (p.stock ?? 0) + n, stockTambahan: (p.stockTambahan ?? 0) + n });
    } else {
      const dec = Math.min(n, p.stock ?? 0);
      patchProduct(p.id, { stock: (p.stock ?? 0) - dec, stockTambahan: Math.max(0, (p.stockTambahan ?? 0) - dec) });
    }
    setTambahTarget(null); setTambahQty("");
  }
  function createProduct() {
    const name = npName.trim();
    const price = parseInt(npPrice.replace(/\D/g, ""), 10) || 0;
    const stock = parseInt(npStock.replace(/\D/g, ""), 10) || 0;
    if (!name) return;
    const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");
    const np: Product = {
      id: `np${Date.now()}`, name, category: npCat.trim() || "Umum", unit: npUnit.trim() || "pcs",
      price, stock, stockAwal: stock, stockTambahan: 0, stockTerjual: 0,
      monogram: initials.charAt(0).toUpperCase() + (initials.charAt(1) || "").toLowerCase(), emoji: "📦",
    };
    if (isPusat) { addProduct(np); }
    else { setBranchProducts(prev => ({ ...prev, [selectedBranch]: [...(prev[selectedBranch] ?? []), np] })); }
    setShowAddProduct(false); setNpName(""); setNpCat(""); setNpPrice(""); setNpStock(""); setNpUnit("pcs");
  }
  function removeProduct(id: string) {
    if (isPusat) { deleteProduct(id); }
    else { setBranchProducts(prev => ({ ...prev, [selectedBranch]: (prev[selectedBranch] ?? []).filter(p => p.id !== id) })); }
    setDelTarget(null);
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
            <span style={{ fontSize: 12.5, color: "#0D1117" }}>Kontrol semua cabang dari satu tempat. Perubahan <b>langsung terlihat di Kasir</b>. Sesi demo sementara — muat ulang untuk reset.</span>
          </div>

          {/* Subscription + add-ons */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Subscription (active) */}
            <div style={{ background: CARD, border: `1px solid ${GOLD}55`, borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: MUTE }}>Langganan</div>
                <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, background: "rgba(78,140,110,0.12)", borderRadius: 5, padding: "2px 7px" }}>Aktif</span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginTop: 6, color: NAVY }}>Premium</div>
              <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>Aktif s/d 9 Agu 2026 · perpanjang otomatis</div>
            </div>
            {/* Add-ons (darkened — separate purchase) */}
            {[
              { name: "Inventori Lengkap", desc: "Gudang, opname, mutasi antar cabang" },
              { name: "CRM Pelanggan", desc: "Data pelanggan, poin & riwayat belanja" },
            ].map(a => (
              <div key={a.name} style={{ position: "relative", background: "#F4F1EA", border: `1px dashed ${BORDER}`, borderRadius: 16, padding: "16px 18px", opacity: 0.72 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: MUTE }}>{a.name}</div>
                  <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, background: "rgba(201,165,95,0.14)", borderRadius: 5, padding: "2px 7px" }}>Add-on</span>
                </div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 8 }}>{a.desc}</div>
                <div style={{ fontSize: 11, color: MUTE, marginTop: 6, fontStyle: "italic" }}>Add-on terpisah — belum aktif. Hubungi Sterith untuk mengaktifkan.</div>
              </div>
            ))}
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

        {/* ── LAPORAN (sales analytics, month-to-date · all cabang) ── */}
        {tab === "laporan" && (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Laporan Penjualan</h2>
              <p style={{ fontSize: 11.5, color: MUTE, marginTop: 1 }}>Bulan ini · semua cabang · omzet = uang diterima (hutang dihitung saat lunas)</p>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: GOLD, background: "rgba(201,165,95,0.12)", border: `1px solid ${GOLD}44`, borderRadius: 8, padding: "6px 12px" }}>Bulan ini</span>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { l: "Total Omzet", v: formatRp(totSales), accent: true },
              { l: "Transaksi", v: String(totTrx), accent: false },
              { l: "Rata-rata / Trx", v: formatRp(Math.round(totSales / totTrx)), accent: false },
              { l: "Piutang (belum lunas)", v: formatRp(PIUTANG), accent: false, warn: true },
            ].map(s => (
              <div key={s.l} style={{ background: s.accent ? NAVY : CARD, border: s.accent ? "none" : `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: s.accent ? "rgba(201,165,95,0.85)" : MUTE }}>{s.l}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 23, fontWeight: 600, marginTop: 6, color: s.accent ? "#F2EDE3" : (s.warn ? DANGER : NAVY), fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            {/* Payment breakdown */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 14 }}>Metode Pembayaran</h3>
              {PAY_BREAKDOWN.map(m => {
                const pct = Math.round((m.value / totSales) * 100);
                return (
                  <div key={m.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7, color: NAVY }}><span style={{ width: 8, height: 8, borderRadius: 999, background: m.color }} />{m.label}</span>
                      <span style={{ fontWeight: 700, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{formatRp(m.value)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#F0ECE3", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: m.color }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${BORDER}` }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, color: DANGER }}><span style={{ width: 8, height: 8, borderRadius: 999, background: DANGER }} />Hutang belum lunas</span>
                <span style={{ fontWeight: 700, color: DANGER, fontVariantNumeric: "tabular-nums" }}>{formatRp(PIUTANG)}</span>
              </div>
            </div>

            {/* Per cashier */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 14 }}>Per Kasir</h3>
              {BY_CASHIER.map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid #F2EDE3` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 999, background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: MUTE }}>{c.name.split(" ").map(w => w[0]).join("")}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: MUTE }}>{c.trx} transaksi</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 600, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{formatRp(c.rev)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", marginTop: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Produk Terlaris</h3>
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < TOP_PRODUCTS.length - 1 ? `1px solid #F2EDE3` : "none" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? "rgba(201,165,95,0.16)" : "#F0ECE3", color: i === 0 ? GOLD : MUTE, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: NAVY }}>{p.name}</span>
                <span style={{ fontSize: 12, color: MUTE, fontVariantNumeric: "tabular-nums" }}>{p.qty} terjual</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, fontVariantNumeric: "tabular-nums", minWidth: 96, textAlign: "right" }}>{formatRp(p.rev)}</span>
              </div>
            ))}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0 12px", height: 38, minWidth: 180 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTE} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari produk…" style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontSize: 13, color: NAVY }} />
              </div>
              <button onClick={() => { setNpCat(catFilter !== "Semua" ? catFilter : ""); setShowAddProduct(true); }} style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "none", background: NAVY, color: "#F2EDE3", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Tambah Produk</button>
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {categories.map(c => {
                const on = catFilter === c;
                return (
                  <button key={c} onClick={() => setCatFilter(c)} style={{
                    height: 28, padding: "0 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
                    border: `1px solid ${on ? NAVY : BORDER}`, background: on ? NAVY : CARD, color: on ? "#F2EDE3" : MUTE, whiteSpace: "nowrap",
                  }}>{c}</button>
                );
              })}
            </div>
          )}

          {list.length === 0 ? (
            <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{branchList.length === 0 ? "Belum ada produk" : "Tidak ada hasil"}</p>
              <p style={{ fontSize: 12, color: MUTE, marginBottom: 14 }}>{branchList.length === 0 ? `Tambah produk pertama untuk ${branchShort}.` : "Coba ubah pencarian atau kategori."}</p>
              {branchList.length === 0 && (
                <button onClick={() => { setNpCat(""); setShowAddProduct(true); }} style={{ height: 40, padding: "0 20px", borderRadius: 9, border: "none", background: NAVY, color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Tambah Produk</button>
              )}
            </div>
          ) : isMobile ? (
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
                    <div style={{ marginLeft: "auto", marginTop: 16, display: "flex", gap: 6 }}>
                      <button onClick={() => { setStockMode("in"); setTambahTarget(p); setTambahQty(""); }} style={{ height: 38, padding: "0 12px", borderRadius: 9, border: `1px solid rgba(78,140,110,0.4)`, background: "rgba(78,140,110,0.07)", color: GREEN, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Stok</button>
                      <button onClick={() => { setStockMode("out"); setTambahTarget(p); setTambahQty(""); }} style={{ height: 38, padding: "0 12px", borderRadius: 9, border: `1px solid rgba(178,107,46,0.4)`, background: "rgba(178,107,46,0.07)", color: "#B26B2E", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>− Stok</button>
                      <button onClick={() => setDelTarget(p)} title="Hapus produk" style={{ height: 38, width: 38, borderRadius: 9, border: `1px solid rgba(192,57,43,0.35)`, background: "rgba(192,57,43,0.05)", color: DANGER, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>
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
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => { setStockMode("in"); setTambahTarget(p); setTambahQty(""); }} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid rgba(78,140,110,0.4)`, background: "rgba(78,140,110,0.07)", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Stok</button>
                          <button onClick={() => { setStockMode("out"); setTambahTarget(p); setTambahQty(""); }} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid rgba(178,107,46,0.4)`, background: "rgba(178,107,46,0.07)", color: "#B26B2E", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>− Stok</button>
                          <button onClick={() => setDelTarget(p)} title="Hapus produk" style={{ height: 32, width: 32, borderRadius: 8, border: `1px solid rgba(192,57,43,0.35)`, background: "rgba(192,57,43,0.05)", color: DANGER, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                          </button>
                        </div>
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
              {branchList.map(p => {
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
                  {branchList.map(p => {
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

        {/* ── PENGATURAN (subscription + master lock + payment config) ── */}
        {tab === "pengaturan" && (<>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Pengaturan Toko</h2>
            <p style={{ fontSize: 11.5, color: MUTE, marginTop: 1 }}>Langganan, pengaturan terpusat, dan konfigurasi pembayaran.</p>
          </div>

          {/* Subscription */}
          <div style={{ background: CARD, border: `1px solid ${GOLD}55`, borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: MUTE }}>Paket Anda</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, marginTop: 2, color: NAVY }}>Premium</div>
                <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>Aktif s/d 9 Agu 2026 · perpanjang otomatis</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, background: "rgba(78,140,110,0.12)", borderRadius: 6, padding: "4px 10px" }}>Aktif</span>
            </div>
          </div>

          {/* Centralized settings — structural rule for Premium (no toggle) */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>Pengaturan Terpusat</h3>
            </div>
            <p style={{ fontSize: 12.5, color: NAVY, lineHeight: 1.7, margin: "8px 0 0" }}>
              Di paket <b>Premium</b>, semua pengaturan toko &amp; fitur diatur dari Back Office ini.
              Aplikasi kasir <b>tidak menampilkan menu Pengaturan</b> — hanya <b>setup printer</b>
              (karena printer dipasangkan langsung ke perangkat). Perlindungan anti-utak-atik,
              tanpa perlu mengunci apa pun.
            </p>
          </div>

          {/* Payment config (info) */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Pembayaran & Struk</h3>
            <p style={{ fontSize: 12, color: MUTE, lineHeight: 1.7 }}>
              QRIS Statis (gratis, konfirmasi manual) & QRIS Dinamis Midtrans (otomatis),
              logo struk, dan setup printer thermal diatur di sini. <i>Sesi demo — konfigurasi tidak disimpan.</i>
            </p>
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
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTE, fontWeight: 700 }}>{stockMode === "in" ? "Tambah Stok" : "Kurangi Stok"}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "3px 0 14px" }}>{tambahTarget.name}</div>
            <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Sisa sekarang: <b style={{ color: NAVY }}>{tambahTarget.stock ?? 0}</b></div>
            <input autoFocus type="number" min={1} value={tambahQty} onChange={e => setTambahQty(e.target.value)} onKeyDown={e => e.key === "Enter" && adjustStock()}
              placeholder="mis. 24"
              style={{ width: "100%", height: 46, borderRadius: 10, border: `1px solid ${(parseInt(tambahQty, 10) || 0) > 0 ? (stockMode === "in" ? GREEN : "#B26B2E") : BORDER}`, padding: "0 14px", fontSize: 15, color: NAVY, outline: "none", fontVariantNumeric: "tabular-nums" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setTambahTarget(null)} style={{ flex: 1, height: 46, borderRadius: 11, border: `1px solid ${BORDER}`, background: CARD, color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              <button onClick={adjustStock} disabled={(parseInt(tambahQty, 10) || 0) <= 0} style={{ flex: 2, height: 46, borderRadius: 11, border: 0, background: stockMode === "in" ? NAVY : "#B26B2E", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (parseInt(tambahQty, 10) || 0) <= 0 ? 0.5 : 1 }}>{stockMode === "in" ? "Tambah Stok" : "Kurangi Stok"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add product modal */}
      {showAddProduct && (
        <div onClick={() => setShowAddProduct(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,17,41,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: isMobile ? "18px 18px 0 0" : 16, width: "100%", maxWidth: isMobile ? "100%" : 400, padding: "20px 20px 18px", boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTE, fontWeight: 700 }}>Produk Baru</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "3px 0 14px" }}>Tambah ke {branchShort}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 11, color: MUTE, fontWeight: 600 }}>Nama produk *
                <input autoFocus value={npName} onChange={e => setNpName(e.target.value)} placeholder="mis. Gula Pasir 1kg"
                  style={{ width: "100%", height: 42, marginTop: 4, borderRadius: 9, border: `1px solid ${BORDER}`, padding: "0 12px", fontSize: 14, color: NAVY, outline: "none", background: CREAM }} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 11, color: MUTE, fontWeight: 600 }}>Kategori
                  <input value={npCat} onChange={e => setNpCat(e.target.value)} placeholder="mis. Sembako"
                    style={{ width: "100%", height: 42, marginTop: 4, borderRadius: 9, border: `1px solid ${BORDER}`, padding: "0 12px", fontSize: 14, color: NAVY, outline: "none", background: CREAM }} />
                </label>
                <label style={{ width: 110, fontSize: 11, color: MUTE, fontWeight: 600 }}>Satuan
                  <input value={npUnit} onChange={e => setNpUnit(e.target.value)} placeholder="pcs"
                    style={{ width: "100%", height: 42, marginTop: 4, borderRadius: 9, border: `1px solid ${BORDER}`, padding: "0 12px", fontSize: 14, color: NAVY, outline: "none", background: CREAM }} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 11, color: MUTE, fontWeight: 600 }}>Harga (Rp)
                  <input value={npPrice} onChange={e => setNpPrice(e.target.value)} inputMode="numeric" placeholder="0"
                    style={{ width: "100%", height: 42, marginTop: 4, borderRadius: 9, border: `1px solid ${BORDER}`, padding: "0 12px", fontSize: 14, color: NAVY, outline: "none", background: CREAM, fontVariantNumeric: "tabular-nums" }} />
                </label>
                <label style={{ flex: 1, fontSize: 11, color: MUTE, fontWeight: 600 }}>Stok awal
                  <input value={npStock} onChange={e => setNpStock(e.target.value)} inputMode="numeric" placeholder="0"
                    style={{ width: "100%", height: 42, marginTop: 4, borderRadius: 9, border: `1px solid ${BORDER}`, padding: "0 12px", fontSize: 14, color: NAVY, outline: "none", background: CREAM, fontVariantNumeric: "tabular-nums" }} />
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowAddProduct(false)} style={{ flex: 1, height: 46, borderRadius: 11, border: `1px solid ${BORDER}`, background: CARD, color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              <button onClick={createProduct} disabled={!npName.trim()} style={{ flex: 2, height: 46, borderRadius: 11, border: 0, background: NAVY, color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: npName.trim() ? 1 : 0.5 }}>Simpan Produk</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete product confirm */}
      {delTarget && (
        <div onClick={() => setDelTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,17,41,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: isMobile ? "18px 18px 0 0" : 16, width: "100%", maxWidth: isMobile ? "100%" : 360, padding: "22px 20px 18px", boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: DANGER, fontWeight: 700 }}>Hapus Produk</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "3px 0 8px" }}>{delTarget.name}</div>
            <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 6, lineHeight: 1.5 }}>Produk ini akan dihapus dari {branchShort}{isPusat ? " dan langsung hilang dari Kasir" : ""}. Tindakan ini tidak bisa dibatalkan.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setDelTarget(null)} style={{ flex: 1, height: 46, borderRadius: 11, border: `1px solid ${BORDER}`, background: CARD, color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              <button onClick={() => removeProduct(delTarget.id)} style={{ flex: 2, height: 46, borderRadius: 11, border: 0, background: DANGER, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Hapus Produk</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
