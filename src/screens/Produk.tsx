import { Search, X, Camera, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useStore, isAtLeast } from "../store";
import { supabase } from "../lib/supabase";
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
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const { cashierInitials, setScreen, signOut, storeId, storeTier, isDemoMode, products, addProduct, updateProduct } = useStore();
  const effectiveTier = storeId ? storeTier : 'premium';
  const canStock = isAtLeast(effectiveTier, 'premium');

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowStockItems = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
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

  function closeModal() {
    setShowAddModal(false);
    setAddName("");
    setAddPrice("");
    setAddDesc("");
    setAddPhoto(null);
    setAddCategory("SBK");
  }

  function handleSave() {
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
    if (storeId && !isDemoMode) {
      supabase.from("products").insert({
        id: newProduct.id, store_id: storeId,
        name: newProduct.name, monogram: newProduct.monogram,
        emoji: newProduct.emoji, category: newProduct.category,
        unit: newProduct.unit, price: newProduct.price, stock: 0,
      });
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
            <p className="text-[12px] text-text-mute mt-0.5 hidden lg:block">Kelola produk, harga, dan stok</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 600, padding: "3px 9px", borderRadius: 9999, textTransform: "uppercase" as const }} className="hidden lg:inline">FREE</span>
            <button onClick={() => setShowAddModal(true)} className="bg-navy border-0 rounded-card h-[36px] lg:h-[38px] px-3 lg:px-4 flex items-center gap-2 text-[12px] text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden lg:inline">Produk baru</span>
            </button>
          </div>
        </div>

        {/* Low-stock banner: real notification on Premium, upgrade prompt below */}
        {lowStockItems.length > 0 && (
          <div className="mx-5 lg:mx-10 mt-4 shrink-0 relative border border-dashed rounded-card px-4 py-3 flex items-center justify-between gap-3"
            style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <div>
                <p className="text-[12.5px] font-semibold text-navy">
                  {lowStockItems.length} produk hampir habis
                  <span className="font-normal text-text-mute"> — {lowStockItems.map(p => p.name.split(" ")[0]).join(", ")}</span>
                </p>
                <p className="text-[11px] text-text-mute mt-0.5">
                  {canStock ? "Segera lakukan pemesanan ulang untuk menjaga stok." : "Aktifkan notifikasi stok rendah dengan upgrade ke Premium."}
                </p>
              </div>
            </div>
            {!canStock && (
              <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                PRE
              </span>
            )}
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
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">
                    <span className="inline-flex items-center gap-1.5 justify-end">
                      Stok
                      {!canStock && <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 700, padding: "2px 5px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>PRE</span>}
                    </span>
                  </th>
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
                      <span className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {canStock ? (
                        <span className="text-[13px] font-medium" style={{ fontVariantNumeric: "tabular-nums", color: p.stock <= LOW_STOCK_THRESHOLD ? "#A6843F" : "#1B2A4A" }}>{p.stock}</span>
                      ) : (
                        <span className="text-[13px] text-text-mute/40 tracking-widest select-none">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="w-7 h-7 rounded-[6px] flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer">
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
                  <div className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {canStock ? (
                      <span className="text-[11px] font-medium" style={{ fontVariantNumeric: "tabular-nums", color: p.stock <= LOW_STOCK_THRESHOLD ? "#A6843F" : "#7A7360" }}>Stok {p.stock}</span>
                    ) : (
                      <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 700, padding: "2px 5px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>PRE</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhoto} />

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
                  style={{ borderColor: addName.trim() ? "#0B1129" : undefined }}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">HARGA JUAL <span className="text-warning">*</span></span>
                </label>
                <div className="flex items-center bg-cream-bg border border-warm-border rounded-button px-4 h-[46px] gap-2 transition-colors"
                  style={{ borderColor: addPrice.trim() ? "#0B1129" : undefined }}>
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
            </div>

            <div className="px-6 pb-7 pt-3 border-t border-warm-border shrink-0 flex gap-2.5">
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
          </div>
        </div>
      )}
    </div>
  );
}
