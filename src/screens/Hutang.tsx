import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useStore, isAtLeast } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";

interface HutangRow {
  id: string; trx_id?: string | null; customer_name: string; phone?: string | null;
  amount: number; paid_amount: number; status: "open" | "partial" | "lunas";
  cashier_name?: string | null; created_at: string;
  settled_at?: string | null; settled_method?: string | null;
}

const DEMO_HUTANG: HutangRow[] = [
  { id: "d1", trx_id: "TRX-0412", customer_name: "Bu Sari (warung sebelah)", phone: "0812-3456-7890", amount: 185000, paid_amount: 0, status: "open", cashier_name: "Aerith", created_at: new Date(Date.now() - 2 * 864e5).toISOString() },
  { id: "d3", trx_id: "TRX-0431", customer_name: "Ibu Ratna", phone: null, amount: 32000, paid_amount: 0, status: "open", cashier_name: "Stevany", created_at: new Date(Date.now() - 1 * 864e5).toISOString() },
  { id: "d5", trx_id: "TRX-0388", customer_name: "Pak Budi", phone: "0813-1111-2222", amount: 90000, paid_amount: 90000, status: "lunas", cashier_name: "Aerith", created_at: new Date(Date.now() - 6 * 864e5).toISOString(), settled_at: new Date(Date.now() - 1 * 864e5).toISOString(), settled_method: "tunai" },
  { id: "d6", trx_id: "TRX-0295", customer_name: "Mbak Yanti", phone: "0857-9090-1212", amount: 47000, paid_amount: 47000, status: "lunas", cashier_name: "Stevany", created_at: new Date(Date.now() - 9 * 864e5).toISOString(), settled_at: new Date(Date.now() - 3 * 864e5).toISOString(), settled_method: "qris" },
];

const METHODS = [
  { id: "tunai", label: "Tunai" },
  { id: "qris", label: "QRIS" },
  { id: "transfer", label: "Transfer" },
];
const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer" };

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function Hutang() {
  const { cashierInitials, storeId, storeName, storeTier, isDemoMode, demoHutang, setDemoHutang, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : "free";
  const canHutang = isAtLeast(effectiveTier, "standard");

  const [rows, setRows] = useState<HutangRow[]>(isDemoMode
    ? [...demoHutang, ...DEMO_HUTANG] as HutangRow[]
    : []);
  const [loading, setLoading] = useState(!isDemoMode && canHutang);
  const [view, setView] = useState<"belum" | "lunas">("belum");
  const [target, setTarget] = useState<HutangRow | null>(null);
  const [method, setMethod] = useState("tunai");
  const [saving, setSaving] = useState(false);
  const [lunasReceipt, setLunasReceipt] = useState<HutangRow | null>(null);

  async function load() {
    if (!storeId || isDemoMode) return;
    setLoading(true);
    const { data } = await supabase.from("hutang")
      .select("*").eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as HutangRow[]);
    setLoading(false);
  }
  useEffect(() => { if (canHutang) void load(); /* eslint-disable-next-line */ }, [storeId, isDemoMode]);

  const belum = rows.filter(r => r.status !== "lunas");
  const lunas = rows.filter(r => r.status === "lunas");
  const outstanding = belum.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
  const shown = view === "belum" ? belum : lunas;

  function openSettle(r: HutangRow) { setTarget(r); setMethod("tunai"); }
  function closeSettle() { setTarget(null); setSaving(false); }

  async function confirmSettle() {
    if (!target) return;
    setSaving(true);
    const settledAt = new Date().toISOString();
    const settled: HutangRow = { ...target, paid_amount: target.amount, status: "lunas", settled_at: settledAt, settled_method: method };

    // NOTE: settling a debt does NOT create income on today's report. The full
    // amount is credited back to the ORIGINAL sale's day (via hutang.created_at);
    // today's kas/omset stays unchanged — so no kas_entries insert here.
    setRows(prev => prev.map(r => r.id === target.id ? settled : r));

    if (isDemoMode) {
      setDemoHutang(demoHutang.map(h => h.id === target.id ? { ...h, paid_amount: target.amount, status: "lunas", settled_at: settledAt, settled_method: method } : h));
    } else if (storeId) {
      try {
        await supabase.from("hutang").update({
          paid_amount: target.amount, status: "lunas", settled_at: settledAt, settled_method: method,
        }).eq("id", target.id);
        void logEvent("hutang.lunas", `Hutang LUNAS ${target.customer_name} ${formatRp(target.amount)} · ${METHOD_LABEL[method]}${target.trx_id ? ` (${target.trx_id})` : ""}`);
      } catch { /* keep optimistic */ }
    }
    setSaving(false);
    setTarget(null);
    setLunasReceipt(settled);   // show tanda lunas
  }

  function shareLunasWA(r: HutangRow) {
    const lines = [
      `*TANDA LUNAS* — ${storeName || "Toko"}`,
      `Pelanggan: ${r.customer_name}`,
      r.trx_id ? `No. transaksi: ${r.trx_id}` : "",
      `Jumlah: ${formatRp(r.amount)}`,
      `Metode: ${METHOD_LABEL[r.settled_method ?? "tunai"]}`,
      `Tanggal lunas: ${new Date(r.settled_at ?? Date.now()).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      ``,
      `Terima kasih, hutang Anda sudah LUNAS. 🙏`,
    ].filter(Boolean).join("\n");
    const phone = (r.phone ?? "").replace(/\D/g, "").replace(/^0/, "62");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(lines)}` : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN · HUTANG</p>
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Buku Hutang</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5">
              <button onClick={() => setScreen("riwayat")} className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy bg-transparent border-0 cursor-pointer">Riwayat</button>
              <button onClick={() => setScreen("kas")} className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy bg-transparent border-0 cursor-pointer">Kas</button>
              <button className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text border-0">Hutang</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-6">
          {!canHutang ? (
            <div className="bg-white border border-dashed border-warm-border rounded-card px-5 py-4 flex items-center gap-3 max-w-[460px]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4C9B8" strokeWidth="1.5" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <p className="text-[12px] text-text-mute">Buku hutang (bon pelanggan) tersedia mulai paket <b className="text-navy">Standard</b>.</p>
            </div>
          ) : (
            <>
              {/* Outstanding summary */}
              <div className="bg-navy rounded-card px-6 py-5 mb-4 max-w-[460px]">
                <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-1.5">TOTAL PIUTANG (BELUM LUNAS)</p>
                <p className="font-serif text-[32px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(outstanding)}</p>
                <p className="text-[11px] text-white/40 mt-1.5">{belum.length} pelanggan berhutang</p>
              </div>

              {/* Belum / Sudah filter */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setView("belum")}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${view === "belum" ? "bg-[#C25E3D] text-white border-[#C25E3D]" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
                  Belum Lunas · {belum.length}
                </button>
                <button onClick={() => setView("lunas")}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${view === "lunas" ? "bg-[#3D7A5E] text-white border-[#3D7A5E]" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
                  Sudah Lunas · {lunas.length}
                </button>
              </div>

              {loading ? (
                <p className="text-[13px] text-text-mute py-8">Memuat…</p>
              ) : shown.length === 0 ? (
                <div className="bg-white border border-warm-border rounded-card px-6 py-10 text-center">
                  <p className="text-[14px] font-medium text-navy mb-1">{view === "belum" ? "Tidak ada hutang" : "Belum ada yang lunas"}</p>
                  <p className="text-[12px] text-text-mute">{view === "belum" ? "Semua pelanggan sudah lunas. 🎉" : "Hutang yang sudah dibayar akan muncul di sini."}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-w-[720px]">
                  {shown.map(r => {
                    const isLunas = r.status === "lunas";
                    const accent = isLunas ? "#3D7A5E" : "#C25E3D";
                    const accentBg = isLunas ? "rgba(61,122,94,0.10)" : "rgba(194,94,61,0.10)";
                    return (
                      <div key={r.id} className="bg-white border rounded-card px-4 lg:px-5 py-4 flex items-center gap-3" style={{ borderColor: `${accent}33`, borderLeft: `3px solid ${accent}` }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-semibold text-navy truncate">{r.customer_name}</span>
                            <span style={{ fontSize: 8.5, letterSpacing: "0.1em", color: accent, background: accentBg, border: `1px solid ${accent}44` }} className="uppercase font-bold rounded px-1.5 py-0.5">{isLunas ? "Lunas" : "Belum bayar"}</span>
                          </div>
                          <div className="text-[11px] text-text-mute mt-0.5">
                            {r.trx_id ? `${r.trx_id} · ` : ""}Bon {fmtDate(r.created_at)}
                            {r.phone ? ` · ${r.phone}` : ""}
                          </div>
                          {isLunas && (
                            <div className="text-[11px] font-medium mt-1" style={{ color: accent }}>
                              ✓ Lunas {fmtDate(r.settled_at)} · {METHOD_LABEL[r.settled_method ?? "tunai"]}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-serif text-[16px] font-semibold" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>{formatRp(r.amount)}</div>
                        </div>
                        {isLunas ? (
                          <button onClick={() => setLunasReceipt(r)}
                            className="shrink-0 bg-cream-bg border border-warm-border text-navy rounded-card h-[38px] px-3.5 text-[12px] font-medium hover:border-navy/40 transition-colors cursor-pointer">
                            Tanda Lunas
                          </button>
                        ) : (
                          <button onClick={() => openSettle(r)}
                            className="shrink-0 bg-[#5C9E7E14] border border-[#5C9E7E40] text-[#3D7A5E] rounded-card h-[38px] px-3.5 text-[12.5px] font-semibold hover:bg-[#5C9E7E20] transition-colors cursor-pointer">
                            Lunasi
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Settle modal — full amount, choose method */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeSettle} />
          <div className="relative bg-white w-full lg:max-w-[400px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-warm-border">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">LUNASI HUTANG</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight">{target.customer_name}</h3>
              </div>
              <button onClick={closeSettle} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="bg-cream-bg border border-warm-border rounded-card px-4 py-3 flex justify-between items-center">
                <span className="text-[12px] text-text-mute">Jumlah dilunasi {target.trx_id ? `· ${target.trx_id}` : ""}</span>
                <b className="font-serif text-[20px] text-[#C25E3D]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(target.amount)}</b>
              </div>
              <p className="text-[11px] text-text-mute -mt-1">Dibayar sekaligus penuh. Jumlah ini masuk ke omzet <b className="text-navy">hari bon dibuat</b> ({fmtDate(target.created_at)}), bukan hari ini.</p>
              <div>
                <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">DIBAYAR PAKAI</span></label>
                <div className="flex gap-2">
                  {METHODS.map(m => (
                    <button key={m.id} onClick={() => setMethod(m.id)}
                      className={`flex-1 h-[42px] rounded-button text-[12.5px] font-semibold border transition-colors cursor-pointer ${method === m.id ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-7 pt-3 border-t border-warm-border flex gap-2.5">
              <button onClick={closeSettle} className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 cursor-pointer">Batal</button>
              <button disabled={saving} onClick={confirmSettle}
                className={`flex-1 rounded-card h-[46px] text-[13px] font-semibold border-0 ${!saving ? "bg-[#3D7A5E] text-white hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                {saving ? "Menyimpan…" : "Tandai Lunas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tanda Lunas receipt */}
      {lunasReceipt && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLunasReceipt(null)} />
          <div className="relative bg-white w-full lg:max-w-[360px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl overflow-hidden">
            <div className="bg-[#3D7A5E] px-6 py-5 text-center">
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-white/70">TANDA LUNAS</p>
              <h3 className="font-serif text-[22px] font-semibold text-white mt-0.5">{storeName || "Toko"}</h3>
            </div>
            <div className="px-6 py-5 flex flex-col gap-2.5 text-[12.5px]">
              <div className="flex justify-between"><span className="text-text-mute">Pelanggan</span><b className="text-navy">{lunasReceipt.customer_name}</b></div>
              {lunasReceipt.trx_id && <div className="flex justify-between"><span className="text-text-mute">No. transaksi</span><span className="text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{lunasReceipt.trx_id}</span></div>}
              <div className="flex justify-between"><span className="text-text-mute">Tanggal bon</span><span className="text-navy">{fmtDate(lunasReceipt.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-text-mute">Metode</span><span className="text-navy">{METHOD_LABEL[lunasReceipt.settled_method ?? "tunai"]}</span></div>
              <div className="flex justify-between"><span className="text-text-mute">Tanggal lunas</span><span className="text-navy">{fmtDate(lunasReceipt.settled_at)}</span></div>
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-dashed border-warm-dashed">
                <span className="text-[13px] font-semibold text-navy">Jumlah</span>
                <span className="font-serif text-[22px] font-bold text-[#3D7A5E]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(lunasReceipt.amount)}</span>
              </div>
            </div>
            <div className="px-6 pb-7 pt-1 flex gap-2.5">
              <button onClick={() => shareLunasWA(lunasReceipt)} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-card h-[46px] text-[13px] font-semibold border-0 hover:opacity-90 cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.406A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                Kirim
              </button>
              <button onClick={() => setLunasReceipt(null)} className="flex-1 bg-navy text-cream-text rounded-card h-[46px] text-[13px] font-semibold border-0 hover:opacity-90 cursor-pointer">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
