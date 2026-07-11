import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useStore, isAtLeast } from "../store";
import { formatRp, formatIDRInput } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";

interface HutangRow {
  id: string; customer_name: string; phone?: string | null;
  amount: number; paid_amount: number; status: "open" | "partial" | "lunas";
  cashier_name?: string | null; created_at: string;
}

const DEMO_HUTANG: HutangRow[] = [
  { id: "d1", customer_name: "Bu Sari (warung sebelah)", phone: "0812-3456-7890", amount: 185000, paid_amount: 0,      status: "open",    cashier_name: "Aerith", created_at: new Date(Date.now() - 2 * 864e5).toISOString() },
  { id: "d2", customer_name: "Pak Budi",                 phone: "0813-1111-2222", amount: 90000,  paid_amount: 40000,  status: "partial", cashier_name: "Aerith", created_at: new Date(Date.now() - 5 * 864e5).toISOString() },
  { id: "d3", customer_name: "Ibu Ratna",                phone: null,             amount: 32000,  paid_amount: 0,      status: "open",    cashier_name: "Stevany", created_at: new Date(Date.now() - 1 * 864e5).toISOString() },
];

export default function Hutang() {
  const { cashierInitials, cashierName, selectedShift, storeId, storeTier, isDemoMode, demoHutang, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : "free";
  const canHutang = isAtLeast(effectiveTier, "standard");

  // Demo: newly-added debts (from checkout) first, then the seed — open/partial only.
  const [rows, setRows] = useState<HutangRow[]>(isDemoMode
    ? [...demoHutang, ...DEMO_HUTANG].filter(h => h.status !== "lunas") as HutangRow[]
    : []);
  const [loading, setLoading] = useState(!isDemoMode && canHutang);
  const [target, setTarget] = useState<HutangRow | null>(null);
  const [bayar, setBayar] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!storeId || isDemoMode) return;
    setLoading(true);
    const { data } = await supabase.from("hutang")
      .select("*").eq("store_id", storeId).in("status", ["open", "partial"])
      .order("created_at", { ascending: false });
    setRows((data ?? []) as HutangRow[]);
    setLoading(false);
  }
  useEffect(() => { if (canHutang) void load(); /* eslint-disable-next-line */ }, [storeId, isDemoMode]);

  const outstanding = rows.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
  const sisaOf = (r: HutangRow) => r.amount - r.paid_amount;

  function openSettle(r: HutangRow) { setTarget(r); setBayar(String(sisaOf(r))); }
  function closeSettle() { setTarget(null); setBayar(""); setSaving(false); }

  async function confirmSettle() {
    if (!target) return;
    const pay = Math.min(parseInt(bayar.replace(/\D/g, "") || "0"), sisaOf(target));
    if (pay <= 0) return;
    setSaving(true);
    const newPaid = target.paid_amount + pay;
    const status: HutangRow["status"] = newPaid >= target.amount ? "lunas" : "partial";
    // Optimistic: drop from list if fully paid, else update
    setRows(prev => status === "lunas" ? prev.filter(r => r.id !== target.id)
      : prev.map(r => r.id === target.id ? { ...r, paid_amount: newPaid, status } : r));

    if (storeId && !isDemoMode) {
      try {
        await supabase.from("hutang").update({
          paid_amount: newPaid, status, settled_at: status === "lunas" ? new Date().toISOString() : null,
        }).eq("id", target.id);
        // Settlement = cash in → kas ledger
        await supabase.from("kas_entries").insert({
          store_id: storeId, cashier_name: cashierName, shift: selectedShift,
          type: "masuk", amount: pay, label: `Pelunasan hutang · ${target.customer_name}`, description: null, photo_url: null,
        });
        void logEvent("hutang.bayar", `Bayar hutang ${target.customer_name} ${formatRp(pay)} (sisa ${formatRp(target.amount - newPaid)})`);
      } catch { /* keep optimistic; owner can reload */ }
    }
    closeSettle();
  }

  const badge = (s: HutangRow["status"]) => s === "partial"
    ? { t: "Sebagian", c: "#A6843F", bg: "rgba(201,165,95,0.12)" }
    : { t: "Belum bayar", c: "#C25E3D", bg: "rgba(194,94,61,0.10)" };

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
                <p className="text-[11px] text-white/40 mt-1.5">{rows.length} pelanggan berhutang</p>
              </div>

              {loading ? (
                <p className="text-[13px] text-text-mute py-8">Memuat…</p>
              ) : rows.length === 0 ? (
                <div className="bg-white border border-warm-border rounded-card px-6 py-10 text-center">
                  <p className="text-[14px] font-medium text-navy mb-1">Tidak ada hutang</p>
                  <p className="text-[12px] text-text-mute">Semua pelanggan sudah lunas. 🎉</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-w-[720px]">
                  {rows.map(r => {
                    const b = badge(r.status);
                    return (
                      <div key={r.id} className="bg-white border border-warm-border rounded-card px-4 lg:px-5 py-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-semibold text-navy truncate">{r.customer_name}</span>
                            <span style={{ fontSize: 8.5, letterSpacing: "0.1em", color: b.c, background: b.bg, border: `1px solid ${b.c}44` }} className="uppercase font-bold rounded px-1.5 py-0.5">{b.t}</span>
                          </div>
                          <div className="text-[11px] text-text-mute mt-0.5">
                            {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            {r.phone ? ` · ${r.phone}` : ""}
                            {r.paid_amount > 0 ? ` · dibayar ${formatRp(r.paid_amount)}` : ""}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-serif text-[16px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(sisaOf(r))}</div>
                          <div className="text-[10px] text-text-mute">dari {formatRp(r.amount)}</div>
                        </div>
                        <button onClick={() => openSettle(r)}
                          className="shrink-0 bg-[#5C9E7E14] border border-[#5C9E7E40] text-[#3D7A5E] rounded-card h-[38px] px-3.5 text-[12.5px] font-semibold hover:bg-[#5C9E7E20] transition-colors cursor-pointer">
                          Bayar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Settle modal */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeSettle} />
          <div className="relative bg-white w-full lg:max-w-[400px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-warm-border">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">BAYAR HUTANG</p>
                <h3 className="font-serif text-[19px] font-medium text-navy leading-tight">{target.customer_name}</h3>
              </div>
              <button onClick={closeSettle} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg border-0 bg-transparent cursor-pointer"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex justify-between text-[13px]">
                <span className="text-text-mute">Sisa hutang</span>
                <b className="text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(sisaOf(target))}</b>
              </div>
              <div>
                <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">JUMLAH BAYAR</span></label>
                <div className="flex items-center bg-cream-bg border rounded-button px-4 h-[50px] gap-2" style={{ borderColor: bayar ? "#3D7A5E" : "#ECE7DD" }}>
                  <span className="font-serif text-[16px] text-text-mute font-medium">Rp</span>
                  <input type="text" inputMode="numeric" autoFocus value={bayar}
                    onChange={e => setBayar(formatIDRInput(e.target.value))}
                    className="flex-1 bg-transparent border-0 outline-none font-serif text-[20px] text-navy" style={{ fontVariantNumeric: "tabular-nums" }} />
                </div>
                <button onClick={() => setBayar(String(sisaOf(target)))} className="text-[11px] text-navy underline underline-offset-2 mt-2 bg-transparent border-0 p-0 cursor-pointer">Lunasi semua</button>
              </div>
            </div>
            <div className="px-6 pb-7 pt-3 border-t border-warm-border flex gap-2.5">
              <button onClick={closeSettle} className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 cursor-pointer">Batal</button>
              <button disabled={saving || !bayar} onClick={confirmSettle}
                className={`flex-1 rounded-card h-[46px] text-[13px] font-semibold border-0 ${bayar && !saving ? "bg-[#3D7A5E] text-white hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                {saving ? "Menyimpan…" : "Catat Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
