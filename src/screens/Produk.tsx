import { Search } from "lucide-react";
import { useState } from "react";
import { useStore } from "../store";
import { PRODUCTS, formatRp } from "../data";
import { AppSidebar, MobileBottomNav } from "../components/AppSidebar";

export default function Produk() {
  const [search, setSearch] = useState("");
  const { cashierInitials, setScreen, signOut } = useStore();

  const filtered = PRODUCTS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="produk" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-end px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">MANAJEMEN · CATALOG</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Produk</h1>
          </div>
          <div className="relative">
            <button className="bg-white border border-warm-border rounded-card h-[38px] px-4 flex items-center gap-2 text-[12px] text-text-mute"
              style={{ cursor: "not-allowed", opacity: 0.7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Produk
            </button>
            <span style={{ position: "absolute", top: -8, right: -6, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.12em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>
              STANDARD
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 lg:px-10 pt-4 pb-0 shrink-0">
          <div className="bg-white border border-warm-border rounded-button h-[44px] flex items-center gap-3 px-4">
            <Search size={15} className="text-text-mute shrink-0" strokeWidth={2} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 border-0 outline-none text-[13.5px] text-navy bg-transparent placeholder:text-text-mute"
              placeholder="Cari produk…" />
          </div>
        </div>

        {/* Desktop table / Mobile list */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-[70px] lg:pb-6">

          {/* Desktop: table */}
          <div className="hidden lg:block bg-white border border-warm-border rounded-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Produk</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Kategori</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Satuan</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Harga</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Stok</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
                          <span className="text-[18px] leading-none">{p.emoji}</span>
                        </div>
                        <span className="text-[13px] font-medium text-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-medium text-text-mute bg-cream-bg border border-warm-border px-2.5 py-1 rounded-full">{p.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-text-mute">{p.unit}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-[12.5px] font-semibold ${p.stock <= 5 ? "text-warning" : "text-navy"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {p.stock <= 5 && <span className="text-warning mr-1">⚠</span>}{p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-[11px] text-text-mute hover:text-navy underline underline-offset-[3px] bg-transparent border-0 p-0">Edit</button>
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
                  <span className="text-[22px] leading-none">{p.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-navy">{p.name}</div>
                  <div className="text-[11px] text-text-mute">{p.category} · {p.unit}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(p.price)}</div>
                  <div className={`text-[11px] ${p.stock <= 5 ? "text-warning" : "text-text-mute"}`} style={{ fontVariantNumeric: "tabular-nums" }}>Stok: {p.stock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MobileBottomNav active="produk" setScreen={setScreen} />
    </div>
  );
}
