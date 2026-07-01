import { Search } from "lucide-react";
import { useState } from "react";
import { useStore } from "../store";
import { PRODUCTS, getCatLabel, formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const SKU_MAP: Record<string, string> = {
  bp: "BRS001", bm: "MNY008", ig: "IDM012", is: "IDM013",
  gp: "GLP004", tl: "TLR002", aq: "AQU006", tp: "TEH009",
  ka: "KAP001", sb: "SSU010", ry: "RYC003", lb: "LBY011",
  ps: "PPS007", mm: "RKK005",
};

const LOW_STOCK_THRESHOLD = 5;

export default function Produk() {
  const [search, setSearch] = useState("");
  const { cashierInitials, setScreen, signOut } = useStore();

  const filtered = PRODUCTS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = PRODUCTS.filter(p => p.stock <= LOW_STOCK_THRESHOLD);

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="produk" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-end px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">
              KATALOG · {PRODUCTS.length} ITEM
            </p>
            <h1 className="font-serif text-display-l font-medium text-navy">Produk toko</h1>
            <p className="text-[12px] text-text-mute mt-0.5">Kelola produk, harga, dan stok</p>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 600, padding: "3px 9px", borderRadius: 9999, textTransform: "uppercase" as const }}>FREE</span>
            <button className="bg-navy border-0 rounded-card h-[38px] px-4 flex items-center gap-2 text-[12px] text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Produk baru
            </button>
          </div>
        </div>

        {/* PREMIUM low-stock banner */}
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
                <p className="text-[11px] text-text-mute mt-0.5">Aktifkan notifikasi stok rendah dengan upgrade ke Premium.</p>
              </div>
            </div>
            <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
              PREMIUM
            </span>
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
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Stok</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                          <span className="font-serif text-[13px] font-semibold text-navy/60">{p.monogram}</span>
                        </div>
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
                      <span className={`text-[12.5px] font-semibold ${p.stock <= LOW_STOCK_THRESHOLD ? "text-warning" : "text-navy"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {p.stock <= LOW_STOCK_THRESHOLD && <span className="text-warning mr-1">⚠</span>}{p.stock}
                      </span>
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
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                  <span className="font-serif text-[15px] font-semibold text-navy/60">{p.monogram}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-navy">{p.name}</div>
                  <div className="text-[11px] text-text-mute">{getCatLabel(p.category)} · {SKU_MAP[p.id]}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</div>
                  <div className={`text-[11px] ${p.stock <= LOW_STOCK_THRESHOLD ? "text-warning" : "text-text-mute"}`} style={{ fontVariantNumeric: "tabular-nums" }}>Stok: {p.stock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
