import { Search, X, Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useStore, isAtLeast, localDateISO } from "../store";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";
import { OwnerConfirm } from "../components/OwnerConfirm";
import { getCatLabel, formatRp, formatIDRInput, parseIDRInput, CATEGORY_OPTIONS } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import type { Product } from "../types";

const SKU_MAP: Record<string, string> = {
  bp: "BRS001", bm: "MNY008", ig: "IDM012", is: "IDM013",
  gp: "GLP004", tl: "TLR002", aq: "AQU006", tp: "TEH009",
  ka: "KAP001", sb: "SSU010", ry: "RYC003", lb: "LBY011",
  ps: "PPS007", mm: "RKK005",
};

const LOW_STOCK_THRESHOLD = 5;
const EMPTY_FORM = { name: "", sku: "", unit: "pcs", category: "SBK", price: "", stock: "", photo: "" };

export default function Produk() {
  const [search, setSearch] = useState("");
  // Unified add/edit product modal (same fields as Back Office).
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [added, setAdded] = useState<{ id: string; name: string }[]>([]);   // saved this session
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [tambahTarget, setTambahTarget] = useState<Product | null>(null);
  const [tambahQty, setTambahQty] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { cashierInitials, setScreen, signOut, storeId, storeTier, isDemoMode, inventoryEnabled, lowStockThreshold, setInventoryEnabled, products, settings, addProduct, updateProduct, deleteProduct } = useStore();
  const effectiveTier = storeId ? storeTier : 'free';
  const canStock = isAtLeast(effectiveTier, 'premium');
  const threshold = lowStockThreshold || LOW_STOCK_THRESHOLD;
  const inventoryOn = canStock && inventoryEnabled;   // Basic Inventori active (Premium + toggle ON)
  const showStockValue = inventoryOn || !canStock;    // hide values only when Premium + toggled OFF

  async function toggleInventory() {
    const next = !inventoryEnabled;
    setInventoryEnabled(next);
    if (storeId && !isDemoMode) {
      await supabase.from("stores").update({ inventory_enabled: next }).eq("id", storeId);
    }
  }

  async function handleAddStock() {
    const n = parseInt(tambahQty, 10);
    if (!tambahTarget || !n || n <= 0) return;
    const p = tambahTarget;
    const today = localDateISO();
    const newStock = (p.stock ?? 0) + n;
    const newTambahan = (p.stockTambahan ?? 0) + n;
    updateProduct(p.id, { stock: newStock, stockTambahan: newTambahan, stockDate: today });
    void logEvent("stock.add", `Tambah stok ${p.name}: +${n} → sisa ${newStock}`);
    if (storeId && !isDemoMode) {
      await supabase.from("products").update({ stock: newStock, store_qty: newStock, stock_tambahan: newTambahan, stock_date: today }).eq("id", p.id);
    }
    setTambahTarget(null); setTambahQty("");
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const lowStockItems = products.filter(p => p.stock <= threshold);
  const canSave = form.name.trim().length > 0 && form.price.trim().length > 0;

  // Free is trusted; Standard+ requires the owner's login password before product/price
  // edits (when the toggle is on). Shown in the demo too so prospects see the anti-cheat.
  const needsOwnerConfirm = isAtLeast(effectiveTier, "standard") && !!storeId && settings.passwordConfirmPrice;

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openAdd() { setEditId(null); setForm({ ...EMPTY_FORM }); setAdded([]); setAddingCat(false); setNewCat(""); setFormOpen(true); }
  function commitCat() {
    const v = newCat.trim();
    if (v) setForm(f => ({ ...f, category: v }));
    setNewCat(""); setAddingCat(false);
  }
  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({ name: p.name, sku: p.sku ?? SKU_MAP[p.id] ?? "", unit: p.unit || "pcs", category: p.category, price: formatIDRInput(String(p.price)), stock: String(p.stock ?? 0), photo: p.photo ?? "" });
    setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditId(null); setForm({ ...EMPTY_FORM }); setAdded([]); }
  function backToAdd() { setEditId(null); setForm(f => ({ ...EMPTY_FORM, unit: f.unit, category: f.category })); nameRef.current?.focus(); }

  const inSessionEdit = !!editId && added.some(a => a.id === editId);

  // Persist the current form (create or update). Gated by the owner password on Standard+.
  async function doSave(addAnother: boolean) {
    if (!canSave) return;
    const price = parseIDRInput(form.price);
    const stock = parseInt(form.stock, 10) || 0;
    const words = form.name.trim().split(/\s+/);
    const monogram = words.length >= 2 ? (words[0][0].toUpperCase() + words[1][0].toLowerCase()) : form.name.trim().slice(0, 2);
    const sku = form.sku.trim();
    const unit = form.unit.trim() || "pcs";

    if (editId) {
      updateProduct(editId, { name: form.name.trim(), sku: sku || undefined, unit, category: form.category, price, stock, monogram, ...(form.photo ? { photo: form.photo } : {}) });
      void logEvent("product.edit", `Ubah produk: ${form.name.trim()}`);
      if (storeId && !isDemoMode) {
        const { error } = await supabase.from("products").update({ name: form.name.trim(), sku: sku || null, unit, category: form.category, price, stock, store_qty: stock, monogram }).eq("id", editId);
        if (error) { alert(`Perubahan belum tersimpan ke server: ${error.message}`); return; }
      }
      if (inSessionEdit) { setAdded(list => list.map(a => a.id === editId ? { ...a, name: form.name.trim() } : a)); backToAdd(); }
      else closeForm();
      return;
    }

    const id = `u${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const newProduct: Product = { id, name: form.name.trim(), monogram, emoji: "📦", category: form.category, unit, price, stock, ...(sku ? { sku } : {}), ...(form.photo ? { photo: form.photo } : {}) };
    addProduct(newProduct);
    void logEvent("product.add", `Produk baru: ${newProduct.name} — ${formatRp(price)}`);
    if (storeId && !isDemoMode) {
      const { error } = await supabase.from("products").insert({ id, store_id: storeId, name: newProduct.name, monogram, emoji: newProduct.emoji, category: newProduct.category, unit, price, stock, store_qty: stock, sku: sku || null });
      if (error) { alert(`Produk belum tersimpan ke server: ${error.message}`); return; }
    }
    setAdded(list => [...list, { id, name: newProduct.name }]);
    if (addAnother) { setForm(f => ({ ...EMPTY_FORM, unit: f.unit, category: f.category })); nameRef.current?.focus(); }
    else closeForm();
  }

  function requestSave(addAnother: boolean) {
    if (!canSave) return;
    if (needsOwnerConfirm) { setConfirmAction(() => () => { void doSave(addAnother); }); return; }
    void doSave(addAnother);
  }

  function requestDelete() {
    if (!editId) return;
    const id = editId;
    const target = products.find(p => p.id === id);
    if (!confirm(`Hapus produk ${target?.name ?? "ini"}?`)) return;
    const apply = () => {
      deleteProduct(id);
      void logEvent("product.delete", `Hapus produk: ${target?.name ?? id}`);
      if (storeId && !isDemoMode) supabase.from("products").update({ active: false }).eq("id", id);
      if (inSessionEdit) { setAdded(list => list.filter(a => a.id !== id)); backToAdd(); }
      else closeForm();
    };
    if (needsOwnerConfirm) { setConfirmAction(() => apply); return; }
    apply();
  }

  // Category pills = the defaults + any custom categories already used by products
  // (+ the current form value), so a custom category keeps showing up next time.
  const knownIds = new Set(CATEGORY_OPTIONS.map(c => c.id));
  const customCats = Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c && !knownIds.has(c))));
  const catList = [...CATEGORY_OPTIONS.map(c => ({ id: c.id, label: c.label })), ...customCats.map(c => ({ id: c, label: getCatLabel(c) }))];
  if (form.category && !catList.some(c => c.id === form.category)) catList.push({ id: form.category, label: getCatLabel(form.category) });

  const catPills = (
    <div className="flex flex-wrap gap-2 items-center">
      {catList.map(c => (
        <button key={c.id} type="button" onClick={() => setForm(f => ({ ...f, category: c.id }))}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${form.category === c.id ? "bg-navy text-cream-text border-navy" : "bg-cream-bg text-navy border-warm-border hover:border-navy/40"}`}>
          {c.label}
        </button>
      ))}
      {addingCat ? (
        <input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitCat(); } if (e.key === "Escape") { setAddingCat(false); setNewCat(""); } }}
          onBlur={commitCat} placeholder="Kategori baru"
          className="px-3 h-[30px] w-[130px] rounded-full text-[12px] text-navy border border-navy bg-white outline-none" />
      ) : (
        <button type="button" onClick={() => { setAddingCat(true); setNewCat(""); }}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-dashed cursor-pointer" style={{ borderColor: "#d8cfae", color: "#b8934a" }}>
          + Tambah
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="produk" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-start px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0 gap-3">
          <div className="min-w-0">
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">
              KATALOG · {products.length} ITEM
            </p>
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Produk toko</h1>
            <p className="text-[12px] text-text-mute mt-0.5 hidden lg:block">{canStock ? "Kelola produk, harga, dan stok" : "Kelola produk dan harga"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {canStock && (
              <button onClick={toggleInventory} title="Aktif / nonaktifkan inventori"
                className="flex items-center gap-1.5 lg:gap-2 h-[32px] px-2.5 lg:px-3 rounded-full border cursor-pointer"
                style={{ borderColor: inventoryEnabled ? "rgba(92,158,126,0.4)" : "rgba(122,119,111,0.28)", background: inventoryEnabled ? "rgba(92,158,126,0.08)" : "rgba(122,119,111,0.06)" }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 600, textTransform: "uppercase" as const, color: "#7A776F" }}>Inventori</span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: inventoryEnabled ? "#4E8C6E" : "#A8A39B" }}>{inventoryEnabled ? "ON" : "OFF"}</span>
              </button>
            )}
            <span style={{ background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.3)", color: "#A6843F", fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 600, padding: "3px 9px", borderRadius: 9999, textTransform: "uppercase" as const }} className="hidden lg:inline">{effectiveTier}</span>
            <button onClick={openAdd} className="bg-navy border-0 rounded-card h-[36px] lg:h-[38px] px-3 lg:px-4 flex items-center gap-2 text-[12px] text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden lg:inline">Produk baru</span>
            </button>
          </div>
        </div>

        {/* Low-stock banner — Premium + inventory ON only */}
        {lowStockItems.length > 0 && inventoryOn && (
          <div className="mx-5 lg:mx-10 mt-4 shrink-0 relative border border-dashed rounded-card px-4 py-3 flex items-center gap-3"
            style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <div>
              <p className="text-[12.5px] font-semibold text-navy">
                {lowStockItems.length} produk hampir habis
                <span className="font-normal text-text-mute"> — {lowStockItems.map(p => p.name.split(" ")[0]).join(", ")}</span>
              </p>
              <p className="text-[11px] text-text-mute mt-0.5">Segera lakukan pemesanan ulang untuk menjaga stok.</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 lg:px-10 pt-4 pb-0 shrink-0">
          <div className="bg-white border border-warm-border rounded-button h-[44px] flex items-center gap-3 px-4">
            <Search size={15} className="text-text-mute shrink-0" strokeWidth={2} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 border-0 outline-none text-[13.5px] text-navy bg-transparent placeholder:text-text-mute"
              placeholder="Cari produk atau SKU…" />
          </div>
        </div>

        {/* Desktop table / Mobile list — tap a product to edit */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-4 lg:pb-6">

          {/* Desktop: table */}
          <div className="hidden lg:block bg-white border border-warm-border rounded-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Produk</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">SKU</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Kategori</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Satuan</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Harga</th>
                  {canStock && <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Stok</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => openEdit(p)} className="border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 rounded-[8px] overflow-hidden w-9 h-9">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-9 h-9 object-cover block" />
                          ) : (
                            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                              <span className="font-serif text-[13px] font-semibold text-navy/60">{p.monogram}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[13px] font-medium text-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-sans text-[11px] text-text-mute tracking-[0.06em]" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {p.sku || SKU_MAP[p.id] || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-medium text-text-mute bg-cream-bg border border-warm-border px-2.5 py-1 rounded-full">{getCatLabel(p.category)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-text-mute">{p.unit}</td>
                    <td className="px-4 py-3.5 text-right num text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</td>
                    {canStock && (
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="text-[13px] font-medium" style={{ fontVariantNumeric: "tabular-nums", color: showStockValue && p.stock <= threshold ? "#A6843F" : "#1B2A4A" }}>{showStockValue ? p.stock : "—"}</span>
                        {inventoryOn && (
                          <button onClick={() => { setTambahTarget(p); setTambahQty(""); }} title="Tambah stok"
                            className="w-6 h-6 rounded-[6px] flex items-center justify-center border cursor-pointer"
                            style={{ borderColor: "rgba(92,158,126,0.4)", color: "#4E8C6E", background: "rgba(92,158,126,0.06)" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: list */}
          <div className="lg:hidden flex flex-col gap-2">
            {filtered.map(p => (
              <div key={p.id} onClick={() => openEdit(p)} className="bg-white border border-warm-border rounded-card px-4 py-3 flex items-center gap-3 cursor-pointer">
                <div className="shrink-0 rounded-[10px] overflow-hidden w-10 h-10">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} className="w-10 h-10 object-cover block" />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                      <span className="font-serif text-[15px] font-semibold text-navy/60">{p.monogram}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-navy">{p.name}</div>
                  <div className="text-[11px] text-text-mute">{getCatLabel(p.category)}{(p.sku || SKU_MAP[p.id]) ? ` · ${p.sku || SKU_MAP[p.id]}` : ""}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</div>
                  {canStock && (
                  <div className="flex items-center justify-end gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                    <span className="text-[11px] font-medium" style={{ fontVariantNumeric: "tabular-nums", color: showStockValue && p.stock <= threshold ? "#A6843F" : "#7A7360" }}>Stok {showStockValue ? p.stock : "—"}</span>
                    {inventoryOn && (
                      <button onClick={() => { setTambahTarget(p); setTambahQty(""); }} title="Tambah stok"
                        className="w-5 h-5 rounded-[5px] flex items-center justify-center border-0" style={{ color: "#4E8C6E", background: "rgba(92,158,126,0.12)" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file inputs for the product photo */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      <OwnerConfirm
        open={!!confirmAction}
        message="Perubahan ini perlu izin pemilik. Masukkan kata sandi akun pemilik"
        onClose={() => setConfirmAction(null)}
        onConfirmed={() => { const a = confirmAction; setConfirmAction(null); a?.(); }}
      />

      {/* Tambah Stok Modal (inventory) */}
      {tambahTarget && (() => {
        const p = tambahTarget;
        const awal = p.stockAwal ?? p.stock ?? 0;
        const tambahan = p.stockTambahan ?? 0;
        const terjual = p.stockTerjual ?? 0;
        const n = parseInt(tambahQty, 10) || 0;
        return (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setTambahTarget(null)} />
            <div className="relative bg-white w-full lg:max-w-[380px] lg:mx-4 rounded-t-[20px] lg:rounded-card flex flex-col shadow-xl">
              <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                <div>
                  <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">Inventori · Tambah Stok</p>
                  <h3 className="font-serif text-[19px] font-medium text-navy leading-tight mt-1">{p.name}</h3>
                </div>
                <button onClick={() => setTambahTarget(null)} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
              </div>
              <div className="px-5 pb-2">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[{ l: "Awal", v: awal }, { l: "Tambahan", v: tambahan }, { l: "Terjual", v: terjual }, { l: "Sisa", v: p.stock ?? 0, accent: true }].map(c => (
                    <div key={c.l} className="rounded-card border border-warm-border px-2 py-2 text-center" style={{ background: c.accent ? "rgba(92,158,126,0.06)" : "#FAFAF7" }}>
                      <div style={{ fontSize: 8.5, letterSpacing: "0.12em" }} className="font-sans uppercase text-text-mute">{c.l}</div>
                      <div className="num text-[17px] font-semibold mt-0.5" style={{ fontVariantNumeric: "tabular-nums", color: c.accent ? "#4E8C6E" : "#1B2A4A" }}>{c.v}</div>
                    </div>
                  ))}
                </div>
                <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">Tambah berapa?</label>
                <input autoFocus type="number" inputMode="numeric" min={1} value={tambahQty}
                  onChange={e => setTambahQty(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddStock()}
                  placeholder="mis. 24"
                  className="w-full bg-white border rounded-button h-[46px] px-4 text-[15px] text-navy outline-none"
                  style={{ borderColor: n > 0 ? "#5C9E7E" : "#ECE7DD", fontVariantNumeric: "tabular-nums" }} />
                {n > 0 && <p className="text-[11.5px] text-text-mute mt-2">Sisa menjadi <b className="text-navy">{(p.stock ?? 0) + n}</b></p>}
              </div>
              <div className="px-5 py-4 flex gap-2">
                <button onClick={() => setTambahTarget(null)} className="flex-1 h-[46px] rounded-button border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">Batal</button>
                <button onClick={handleAddStock} disabled={n <= 0} className="flex-[2] h-[46px] rounded-button border-0 bg-navy text-cream-text text-[13px] font-semibold cursor-pointer disabled:opacity-50">Tambah Stok</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unified Add / Edit Product Modal — same fields as Back Office */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white w-full lg:max-w-[480px] lg:mx-4 rounded-t-[20px] lg:rounded-card max-h-[92vh] flex flex-col shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-warm-border shrink-0">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-gold mb-0.5">{editId ? "EDIT PRODUK" : "PRODUK BARU"}</p>
                <h3 className="font-serif text-[20px] font-medium text-navy leading-tight">{editId ? (form.name || "Produk") : "Tambah produk baru"}</h3>
              </div>
              <button onClick={closeForm} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg transition-colors border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
              {/* Photo */}
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-2.5">FOTO PRODUK <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span></p>
                {form.photo ? (
                  <div className="flex items-center gap-4">
                    <img src={form.photo} alt="Preview" className="w-[72px] h-[72px] rounded-[10px] object-cover border border-warm-border shrink-0" />
                    <div className="flex flex-col gap-2">
                      <button onClick={() => galleryRef.current?.click()} className="text-[12px] text-navy font-medium underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left">Ganti foto</button>
                      <button onClick={() => setForm(f => ({ ...f, photo: "" }))} className="text-[12px] text-text-mute hover:text-navy bg-transparent border-0 p-0 cursor-pointer text-left">Hapus foto</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2.5 bg-cream-bg border border-warm-border rounded-card h-[48px] text-[12.5px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <Camera size={16} strokeWidth={1.8} className="text-text-mute" /> Kamera
                    </button>
                    <button onClick={() => galleryRef.current?.click()} className="flex items-center justify-center gap-2.5 bg-cream-bg border border-warm-border rounded-card h-[48px] text-[12.5px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <ImageIcon size={16} strokeWidth={1.8} className="text-text-mute" /> Galeri
                    </button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">NAMA PRODUK <span className="text-warning">*</span></label>
                <input ref={nameRef} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="mis. Beras Pandan 5kg"
                  className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] text-[13.5px] text-navy outline-none placeholder:text-text-mute transition-colors"
                  style={{ borderColor: form.name.trim() ? "#0D1117" : undefined }} />
              </div>

              {/* SKU + Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">SKU</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="mis. BRS001"
                    className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] text-[13.5px] text-navy outline-none placeholder:text-text-mute" />
                </div>
                <div>
                  <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">SATUAN</label>
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="mis. karung"
                    className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] text-[13.5px] text-navy outline-none placeholder:text-text-mute" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2.5">KATEGORI <span className="text-warning">*</span></label>
                {catPills}
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">HARGA JUAL <span className="text-warning">*</span></label>
                  <div className="flex items-center bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] gap-2" style={{ borderColor: form.price.trim() ? "#0D1117" : undefined }}>
                    <span className="num text-[15px] text-text-mute font-medium shrink-0">Rp</span>
                    <input type="text" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: formatIDRInput(e.target.value) }))} placeholder="0"
                      className="flex-1 bg-transparent border-0 outline-none num text-[16px] text-navy" style={{ fontVariantNumeric: "tabular-nums" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">STOK TOKO</label>
                  <input type="number" inputMode="numeric" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0"
                    className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] num text-[16px] text-navy outline-none placeholder:text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }} />
                </div>
              </div>

              {(form.name || form.price) && !canSave && (
                <p className="text-[11px] text-text-mute -mt-1">Nama produk dan harga wajib diisi untuk menyimpan.</p>
              )}
              {needsOwnerConfirm && <p className="text-[11px] text-text-mute -mt-1">Menyimpan perlu konfirmasi kata sandi pemilik.</p>}
            </div>

            {/* Saved this session — pinned so it stays visible; tap a chip to fix it */}
            {added.length > 0 && (
              <div className="px-6 py-2.5 border-t border-warm-border shrink-0 max-h-[112px] overflow-auto" style={{ background: "#FBFAF5" }}>
                <p style={{ fontSize: 9.5, letterSpacing: "0.16em" }} className="font-sans uppercase text-text-mute mb-2">Sudah ditambahkan · {added.length} — ketuk untuk ubah</p>
                <div className="flex flex-wrap gap-2">
                  {added.map(a => {
                    const editing = editId === a.id;
                    return (
                      <button key={a.id} onClick={() => { const p = products.find(x => x.id === a.id); if (p) openEdit(p); }} title="Ketuk untuk ubah"
                        className={`inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full text-[12px] font-medium border cursor-pointer max-w-full ${editing ? "bg-navy text-cream-text border-navy" : "bg-gold-soft text-navy border-gold/40"}`}>
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 pb-7 pt-3 border-t border-warm-border shrink-0 flex items-center gap-2.5 flex-wrap">
              {editId && (
                <button onClick={requestDelete} className="text-[12.5px] font-medium bg-transparent border-0 cursor-pointer flex items-center gap-1.5" style={{ color: "#B0492F" }}>
                  <Trash2 size={13} /> Hapus produk
                </button>
              )}
              <div className="flex-1 min-w-[8px]" />
              {editId ? (
                <div className="flex gap-2.5 flex-wrap justify-end">
                  <button onClick={inSessionEdit ? backToAdd : closeForm} className="h-[44px] px-5 rounded-card border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">{inSessionEdit ? "Kembali" : "Batal"}</button>
                  <button disabled={!canSave} onClick={() => requestSave(false)}
                    className={`h-[44px] px-5 rounded-card text-[13px] font-semibold border-0 ${canSave ? "bg-navy text-cream-text hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                    {inSessionEdit ? "Simpan perubahan →" : "Simpan →"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5 flex-wrap justify-end">
                  <button onClick={closeForm} className="h-[44px] px-4 rounded-card border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">{added.length > 0 ? "Selesai" : "Batal"}</button>
                  <button disabled={!canSave} onClick={() => requestSave(true)}
                    className={`h-[44px] px-4 rounded-card text-[13px] font-semibold border ${canSave ? "bg-white border-navy/40 text-navy hover:bg-cream-bg cursor-pointer" : "bg-cream-bg border-warm-border text-navy/30 cursor-not-allowed"}`}>
                    Simpan & tambah lagi
                  </button>
                  <button disabled={!canSave} onClick={() => requestSave(false)}
                    className={`h-[44px] px-5 rounded-card text-[13px] font-semibold border-0 ${canSave ? "bg-navy text-cream-text hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                    Simpan →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
