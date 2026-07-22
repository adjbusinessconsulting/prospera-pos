import { Search, X, Camera, Image as ImageIcon } from "lucide-react";
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

export default function Produk() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addPhoto, setAddPhoto] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState("SBK");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tambahTarget, setTambahTarget] = useState<Product | null>(null);
  const [tambahQty, setTambahQty] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [priceTarget, setPriceTarget] = useState<Product | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [menuTarget, setMenuTarget] = useState<Product | null>(null);   // product action sheet
  const [renameTarget, setRenameTarget] = useState<Product | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [queue, setQueue] = useState<Product[]>([]);   // Standard+: batch-add draft list
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
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
      await supabase.from("products").update({ stock: newStock, stock_tambahan: newTambahan, stock_date: today }).eq("id", p.id);
    }
    setTambahTarget(null); setTambahQty("");
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowStockItems = products.filter(p => p.stock <= threshold);
  const canSave = addName.trim().length > 0 && addPrice.trim().length > 0;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAddPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleEditPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProduct(editingId, { photo: reader.result as string });
      setEditingId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openEditPhoto(id: string) {
    setEditingId(id);
    editPhotoRef.current?.click();
  }

  function clearForm() {
    setAddName(""); setAddPrice(""); setAddDesc(""); setAddPhoto(null); setAddCategory("SBK");
  }
  function closeModal() {
    setShowAddModal(false);
    clearForm();
    setQueue([]);
  }

  // Standard+ can queue several products and save them all in one go.
  const canBatch = isAtLeast(effectiveTier, "standard");

  // Free is trusted; Standard+ requires the owner's login password before product/price
  // edits (when the toggle is on). Shown in the demo too — OwnerConfirm accepts any
  // password there — so prospects see the anti-cheat protection.
  const needsOwnerConfirm = isAtLeast(effectiveTier, "standard") && !!storeId && settings.passwordConfirmPrice;

  // Build a Product from the current form (name + price required).
  function buildProduct(): Product | null {
    if (!canSave) return null;
    const price = parseIDRInput(addPrice);
    const words = addName.trim().split(/\s+/);
    const monogram = words.length >= 2 ? (words[0][0].toUpperCase() + words[1][0].toLowerCase()) : addName.trim().slice(0, 2);
    return { id: `u${Date.now()}${Math.floor(Math.random() * 1000)}`, name: addName.trim(), monogram, emoji: "📦", category: addCategory, unit: "pcs", price, stock: 0, ...(addPhoto ? { photo: addPhoto } : {}) };
  }

  // Add the current form entry to the draft list and reset for the next one.
  function addToQueue() {
    const p = buildProduct();
    if (!p) return;
    setQueue(q => [...q, p]);
    clearForm();
  }

  // Persist one product to store + Supabase. Returns an error message or null.
  async function persistProduct(p: Product): Promise<string | null> {
    addProduct(p);
    void logEvent("product.add", `Produk baru: ${p.name} — ${formatRp(p.price)}`);
    if (storeId && !isDemoMode) {
      const { error } = await supabase.from("products").insert({ id: p.id, store_id: storeId, name: p.name, monogram: p.monogram, emoji: p.emoji, category: p.category, unit: p.unit, price: p.price, stock: 0 });
      if (error) return error.message;
    }
    return null;
  }

  // Save everything: the queued drafts plus the current form entry if filled.
  async function saveAll() {
    const list = [...queue];
    const current = buildProduct();
    if (current) list.push(current);
    if (list.length === 0) return;
    for (const p of list) {
      const err = await persistProduct(p);
      if (err) { alert(`Sebagian produk belum tersimpan: ${err}`); return; }
    }
    closeModal();
  }
  function handleSaveAll() {
    const total = queue.length + (canSave ? 1 : 0);
    if (total === 0) return;
    if (needsOwnerConfirm) { setConfirmAction(() => saveAll); return; }
    saveAll();
  }

  function handleSave() {
    if (!canSave) return;
    if (needsOwnerConfirm) { setConfirmAction(() => doSave); return; }
    doSave();
  }

  function handleSavePrice() {
    if (!priceTarget) return;
    const p = priceTarget;
    const newPrice = parseIDRInput(priceInput);
    if (!newPrice || newPrice <= 0 || newPrice === p.price) { setPriceTarget(null); setPriceInput(""); return; }
    const apply = () => {
      updateProduct(p.id, { price: newPrice });
      void logEvent("product.price", `Ubah harga ${p.name}: ${formatRp(p.price)} → ${formatRp(newPrice)}`);
      if (storeId && !isDemoMode) supabase.from("products").update({ price: newPrice }).eq("id", p.id);
      setPriceTarget(null); setPriceInput("");
    };
    if (needsOwnerConfirm) { setConfirmAction(() => apply); return; }
    apply();
  }

  function handleSaveName() {
    if (!renameTarget) return;
    const p = renameTarget;
    const name = renameInput.trim();
    if (!name || name === p.name) { setRenameTarget(null); setRenameInput(""); return; }
    const apply = () => {
      updateProduct(p.id, { name });
      void logEvent("product.edit", `Ubah nama produk: ${p.name} → ${name}`);
      if (storeId && !isDemoMode) supabase.from("products").update({ name }).eq("id", p.id);
      setRenameTarget(null); setRenameInput("");
    };
    if (needsOwnerConfirm) { setConfirmAction(() => apply); return; }
    apply();
  }

  function handleDeleteProduct() {
    if (!deleteTarget) return;
    const p = deleteTarget;
    const apply = () => {
      deleteProduct(p.id);
      void logEvent("product.delete", `Hapus produk: ${p.name}`);
      // Soft-delete in the DB (active:false) so past sales keep referencing it.
      if (storeId && !isDemoMode) supabase.from("products").update({ active: false }).eq("id", p.id);
      setDeleteTarget(null);
    };
    if (needsOwnerConfirm) { setConfirmAction(() => apply); return; }
    apply();
  }

  async function doSave() {
    if (!canSave) return;
    const price = parseIDRInput(addPrice);
    const words = addName.trim().split(/\s+/);
    const monogram = words.length >= 2
      ? (words[0][0].toUpperCase() + words[1][0].toLowerCase())
      : addName.trim().slice(0, 2);
    const newProduct: Product = {
      id: `u${Date.now()}`,
      name: addName.trim(),
      monogram,
      emoji: "📦",
      category: addCategory,
      unit: "pcs",
      price,
      stock: 0,
      ...(addPhoto ? { photo: addPhoto } : {}),
    };
    addProduct(newProduct);
    void logEvent("product.add", `Produk baru: ${newProduct.name} — ${formatRp(newProduct.price)}`);
    if (storeId && !isDemoMode) {
      // Await + surface errors: a silent failure here means the product only lives
      // in memory and disappears on next login (RLS or a missing column).
      const { error } = await supabase.from("products").insert({
        id: newProduct.id, store_id: storeId,
        name: newProduct.name, monogram: newProduct.monogram,
        emoji: newProduct.emoji, category: newProduct.category,
        unit: newProduct.unit, price: newProduct.price, stock: 0,
      });
      if (error) { alert(`Produk belum tersimpan ke server: ${error.message}`); return; }
    }
    closeModal();
  }

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
            <button onClick={() => setShowAddModal(true)} className="bg-navy border-0 rounded-card h-[36px] lg:h-[38px] px-3 lg:px-4 flex items-center gap-2 text-[12px] text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden lg:inline">Produk baru</span>
            </button>
          </div>
        </div>

        {/* Low-stock banner — Premium + inventory ON only (inventory is Premium-only) */}
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

        {/* Desktop table / Mobile list */}
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
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditPhoto(p.id)} title="Ubah foto" className="relative group shrink-0 rounded-[8px] overflow-hidden border-0 bg-transparent p-0 cursor-pointer">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-9 h-9 object-cover block" />
                          ) : (
                            <div className="w-9 h-9 flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                              <span className="font-serif text-[13px] font-semibold text-navy/60">{p.monogram}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={12} strokeWidth={2} color="#fff" />
                          </div>
                        </button>
                        <span className="text-[13px] font-medium text-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-sans text-[11px] text-text-mute tracking-[0.06em]" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {SKU_MAP[p.id] || p.id.toUpperCase().padEnd(6, "0")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-medium text-text-mute bg-cream-bg border border-warm-border px-2.5 py-1 rounded-full">{getCatLabel(p.category)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-text-mute">{p.unit}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => { setPriceTarget(p); setPriceInput(formatIDRInput(String(p.price))); }} title="Ubah harga"
                        className="font-serif text-[14px] font-semibold text-navy inline-flex items-center gap-1.5 border-0 bg-transparent cursor-pointer hover:text-gold transition-colors" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatRp(p.price)}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-mute"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
                      </button>
                    </td>
                    {canStock && (
                    <td className="px-4 py-3.5 text-right">
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
                    <td className="px-4 py-3.5">
                      <button onClick={() => setMenuTarget(p)} title="Aksi produk" className="w-7 h-7 rounded-[6px] flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: list */}
          <div className="lg:hidden flex flex-col gap-2">
            {filtered.map(p => (
              <div key={p.id} className="bg-white border border-warm-border rounded-card px-4 py-3 flex items-center gap-3">
                <button onClick={() => openEditPhoto(p.id)} className="relative shrink-0 rounded-[10px] overflow-hidden border-0 bg-transparent p-0 cursor-pointer">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} className="w-10 h-10 object-cover block" />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                      <span className="font-serif text-[15px] font-semibold text-navy/60">{p.monogram}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Camera size={11} strokeWidth={2} color="rgba(255,255,255,0.85)" />
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-navy">{p.name}</div>
                  <div className="text-[11px] text-text-mute">{getCatLabel(p.category)} · {SKU_MAP[p.id]}</div>
                </div>
                <div className="text-right shrink-0">
                  <button onClick={() => { setPriceTarget(p); setPriceInput(formatIDRInput(String(p.price))); }} className="font-serif text-[14px] font-semibold text-navy inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatRp(p.price)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-mute"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
                  </button>
                  {canStock && (
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
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
                <button onClick={() => setMenuTarget(p)} title="Aksi produk" className="w-8 h-8 shrink-0 rounded-[8px] flex items-center justify-center text-text-mute border border-warm-border bg-white cursor-pointer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhoto} />

      {/* Product action sheet (kebab) */}
      {menuTarget && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setMenuTarget(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()} className="relative bg-white w-full lg:max-w-[340px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">Produk</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight mt-1">{menuTarget.name}</h3>
              </div>
              <button onClick={() => setMenuTarget(null)} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <button onClick={() => { const p = menuTarget; setMenuTarget(null); setRenameTarget(p); setRenameInput(p.name); }}
                className="w-full h-[46px] px-4 rounded-button border border-warm-border bg-white text-navy text-[13.5px] font-medium cursor-pointer flex items-center gap-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-mute"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
                Ubah nama
              </button>
              <button onClick={() => { const p = menuTarget; setMenuTarget(null); setPriceTarget(p); setPriceInput(formatIDRInput(String(p.price))); }}
                className="w-full h-[46px] px-4 rounded-button border border-warm-border bg-white text-navy text-[13.5px] font-medium cursor-pointer flex items-center gap-3">
                <span className="text-text-mute text-[13px] w-[15px] text-center">Rp</span>
                Ubah harga
              </button>
              <button onClick={() => { const p = menuTarget; setMenuTarget(null); openEditPhoto(p.id); }}
                className="w-full h-[46px] px-4 rounded-button border border-warm-border bg-white text-navy text-[13.5px] font-medium cursor-pointer flex items-center gap-3">
                <Camera size={15} className="text-text-mute" />
                Ubah foto
              </button>
              <button onClick={() => { const p = menuTarget; setMenuTarget(null); setDeleteTarget(p); }}
                className="w-full h-[46px] px-4 rounded-button border cursor-pointer flex items-center gap-3 text-[13.5px] font-medium"
                style={{ color: "#B0492F", borderColor: "rgba(176,73,47,0.35)", background: "rgba(176,73,47,0.04)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13h10l1-13" /></svg>
                Hapus produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ubah Nama Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setRenameTarget(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()} className="relative bg-white w-full lg:max-w-[360px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">Ubah Nama</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight mt-1">{renameTarget.name}</h3>
              </div>
              <button onClick={() => setRenameTarget(null)} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">Nama baru</label>
            <div className="bg-cream-bg border rounded-button h-[46px] flex items-center px-4" style={{ borderColor: renameInput.trim() ? "#5C9E7E" : "#ECE7DD" }}>
              <input autoFocus value={renameInput} onChange={e => setRenameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveName()}
                placeholder="Nama produk" className="flex-1 border-0 outline-none bg-transparent text-[15px] font-medium text-navy" />
            </div>
            {needsOwnerConfirm && <p className="text-[11px] text-text-mute mt-2">Perubahan perlu konfirmasi kata sandi pemilik.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRenameTarget(null)} className="flex-1 h-[46px] rounded-button border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">Batal</button>
              <button onClick={handleSaveName} className="flex-[2] h-[46px] rounded-button border-0 bg-navy text-cream-text text-[13px] font-semibold cursor-pointer">Simpan Nama</button>
            </div>
          </div>
        </div>
      )}

      {/* Hapus Produk Konfirmasi */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()} className="relative bg-white w-full lg:max-w-[360px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">Hapus Produk</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight mt-1">{deleteTarget.name}</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-[12.5px] text-text-mute leading-relaxed">Produk ini akan dihapus dari katalog. Riwayat penjualan yang lama tetap tersimpan.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-[46px] rounded-button border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">Batal</button>
              <button onClick={handleDeleteProduct} className="flex-[2] h-[46px] rounded-button border-0 text-white text-[13px] font-semibold cursor-pointer" style={{ background: "#B0492F" }}>Ya, Hapus Produk</button>
            </div>
          </div>
        </div>
      )}

      {/* Ubah Harga Modal */}
      {priceTarget && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setPriceTarget(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()} className="relative bg-white w-full lg:max-w-[360px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">Ubah Harga</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight mt-1">{priceTarget.name}</h3>
              </div>
              <button onClick={() => setPriceTarget(null)} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-text-mute mb-2">Harga sekarang: <b className="text-navy">{formatRp(priceTarget.price)}</b></p>
            <label style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute block mb-2">Harga baru</label>
            <div className="bg-cream-bg border rounded-button h-[46px] flex items-center gap-2 px-4" style={{ borderColor: parseIDRInput(priceInput) > 0 ? "#5C9E7E" : "#ECE7DD" }}>
              <span className="text-[13px] text-text-mute">Rp</span>
              <input autoFocus inputMode="numeric" value={priceInput} onChange={e => setPriceInput(formatIDRInput(e.target.value))} onKeyDown={e => e.key === "Enter" && handleSavePrice()}
                placeholder="0" className="flex-1 border-0 outline-none bg-transparent text-[15px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }} />
            </div>
            {needsOwnerConfirm && <p className="text-[11px] text-text-mute mt-2">Perubahan harga perlu konfirmasi kata sandi pemilik.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPriceTarget(null)} className="flex-1 h-[46px] rounded-button border border-warm-border bg-white text-navy text-[13px] font-medium cursor-pointer">Batal</button>
              <button onClick={handleSavePrice} className="flex-[2] h-[46px] rounded-button border-0 bg-navy text-cream-text text-[13px] font-semibold cursor-pointer">Simpan Harga</button>
            </div>
          </div>
        </div>
      )}

      <OwnerConfirm
        open={!!confirmAction}
        message="Perubahan ini perlu izin pemilik. Masukkan kata sandi akun pemilik"
        onClose={() => setConfirmAction(null)}
        onConfirmed={() => { const a = confirmAction; setConfirmAction(null); a?.(); }}
      />

      {/* Tambah Stok Modal */}
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
                {/* Ledger */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[{ l: "Awal", v: awal }, { l: "Tambahan", v: tambahan }, { l: "Terjual", v: terjual }, { l: "Sisa", v: p.stock ?? 0, accent: true }].map(c => (
                    <div key={c.l} className="rounded-card border border-warm-border px-2 py-2 text-center" style={{ background: c.accent ? "rgba(92,158,126,0.06)" : "#FAFAF7" }}>
                      <div style={{ fontSize: 8.5, letterSpacing: "0.12em" }} className="font-sans uppercase text-text-mute">{c.l}</div>
                      <div className="font-serif text-[17px] font-semibold mt-0.5" style={{ fontVariantNumeric: "tabular-nums", color: c.accent ? "#4E8C6E" : "#1B2A4A" }}>{c.v}</div>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white w-full lg:max-w-[460px] lg:mx-4 rounded-t-[20px] lg:rounded-card max-h-[92vh] flex flex-col shadow-xl">

            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-warm-border shrink-0">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">KATALOG</p>
                <h3 className="font-serif text-[20px] font-medium text-navy leading-tight">Produk Baru</h3>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg transition-colors border-0 bg-transparent cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">

              {/* Photo */}
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-2.5">
                  FOTO PRODUK <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span>
                </p>
                {addPhoto ? (
                  <div className="flex items-center gap-4">
                    <img src={addPhoto} alt="Preview" className="w-[72px] h-[72px] rounded-[10px] object-cover border border-warm-border shrink-0" />
                    <div className="flex flex-col gap-2">
                      <button onClick={() => galleryRef.current?.click()} className="text-[12px] text-navy font-medium underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left">Ganti foto</button>
                      <button onClick={() => setAddPhoto(null)} className="text-[12px] text-text-mute hover:text-navy bg-transparent border-0 p-0 cursor-pointer text-left">Hapus foto</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => cameraRef.current?.click()}
                      className="flex items-center justify-center gap-2.5 bg-cream-bg border border-warm-border rounded-card h-[48px] text-[12.5px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <Camera size={16} strokeWidth={1.8} className="text-text-mute" />
                      Kamera
                    </button>
                    <button onClick={() => galleryRef.current?.click()}
                      className="flex items-center justify-center gap-2.5 bg-cream-bg border border-warm-border rounded-card h-[48px] text-[12.5px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <ImageIcon size={16} strokeWidth={1.8} className="text-text-mute" />
                      Galeri
                    </button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">NAMA PRODUK <span className="text-warning">*</span></span>
                </label>
                <input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Contoh: Beras Pandan 5kg"
                  className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] text-[13.5px] text-navy outline-none placeholder:text-text-mute transition-colors"
                  style={{ borderColor: addName.trim() ? "#0D1117" : undefined }}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">HARGA JUAL <span className="text-warning">*</span></span>
                </label>
                <div className="flex items-center bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] gap-2 transition-colors"
                  style={{ borderColor: addPrice.trim() ? "#0D1117" : undefined }}>
                  <span className="font-serif text-[15px] text-text-mute font-medium shrink-0">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addPrice}
                    onChange={e => setAddPrice(formatIDRInput(e.target.value))}
                    placeholder="0"
                    className="flex-1 bg-transparent border-0 outline-none font-serif text-[16px] text-navy"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block mb-2.5">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">KATEGORI <span className="text-warning">*</span></span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAddCategory(c.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${addCategory === c.id ? "bg-navy text-cream-text border-navy" : "bg-cream-bg text-navy border-warm-border hover:border-navy/40"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">DESKRIPSI <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span></span>
                </label>
                <textarea
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  placeholder="Satuan, berat, catatan stok, variasi..."
                  rows={3}
                  className="w-full bg-cream-bg border border-warm-border rounded-button px-4 py-3 text-[13.5px] text-navy outline-none placeholder:text-text-mute transition-colors resize-none"
                />
              </div>

              {(addName || addPrice) && !canSave && (
                <p className="text-[11px] text-text-mute -mt-2">Nama produk dan harga wajib diisi untuk menyimpan.</p>
              )}

              {/* Standard+: draft list of products queued to save together */}
              {canBatch && queue.length > 0 && (
                <div className="border border-warm-border rounded-card overflow-hidden">
                  <div className="px-3.5 py-2 bg-cream-bg text-[9.5px] tracking-[0.16em] uppercase text-text-mute font-semibold">Daftar Produk · {queue.length}</div>
                  <div className="max-h-[140px] overflow-auto divide-y divide-[#F2EDE3]">
                    {queue.map(p => (
                      <div key={p.id} className="flex items-center gap-2.5 px-3.5 py-2">
                        <span className="flex-1 min-w-0 truncate text-[13px] text-navy font-medium">{p.name}</span>
                        <span className="font-serif text-[13px] text-navy shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</span>
                        <button onClick={() => setQueue(q => q.filter(x => x.id !== p.id))} title="Hapus dari daftar"
                          className="w-6 h-6 rounded-[6px] flex items-center justify-center bg-transparent border-0 text-text-mute hover:text-[#C0392B] cursor-pointer shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-7 pt-3 border-t border-warm-border shrink-0 flex flex-col gap-2.5">
              {canBatch ? (
                <>
                  <button onClick={addToQueue} disabled={!canSave}
                    className={`w-full rounded-card h-[44px] text-[13px] font-semibold border transition-opacity ${canSave ? "bg-white border-navy/40 text-navy hover:bg-cream-bg cursor-pointer" : "bg-cream-bg border-warm-border text-navy/30 cursor-not-allowed"}`}>
                    + Tambah ke Daftar
                  </button>
                  <div className="flex gap-2.5">
                    <button onClick={closeModal}
                      className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      Batal
                    </button>
                    <button
                      disabled={queue.length === 0 && !canSave}
                      onClick={handleSaveAll}
                      className={`flex-[1.4] rounded-card h-[46px] text-[13px] font-semibold border-0 transition-opacity ${(queue.length > 0 || canSave) ? "bg-navy text-cream-text hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                      Simpan Semua{(() => { const n = queue.length + (canSave ? 1 : 0); return n > 0 ? ` (${n})` : ""; })()}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2.5">
                  <button onClick={closeModal}
                    className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                    Batal
                  </button>
                  <button
                    disabled={!canSave}
                    onClick={handleSave}
                    className={`flex-1 rounded-card h-[46px] text-[13px] font-semibold border-0 transition-opacity ${canSave ? "bg-navy text-cream-text hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                    Simpan Produk
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
