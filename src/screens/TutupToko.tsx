import { useState, useEffect } from "react";
import { useStore, isAtLeast } from "../store";
import { formatRp, formatIDRInput } from "../data";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";
import { saveShiftClosing } from "../lib/shift";
import { modalAwalToday } from "../lib/dayopen";

const RETENTION: Record<string, number> = { free: 1, standard: 30, premium: 90, business: 1095, enterprise: 1825 };
const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", debit: "Debit", ewallet: "E-Wallet" };
const METHOD_ORDER = ["tunai", "qris", "transfer", "debit", "ewallet"];

export default function TutupToko() {
  const { signOut, setScreen, storeId, storeTier, isDemoMode, settings, cashierName } = useStore();
  const effectiveTier = storeId ? storeTier : "free";
  const isStd = isAtLeast(effectiveTier, "standard");
  const recOn = isStd && settings.rekonsiliasi;   // owner can hide the reconciliation tool
  const retentionDays = RETENTION[effectiveTier] ?? 1;

  // Omzet = money actually received for TODAY's activity. Credit sales (hutang)
  // are NOT counted until settled, and a debt settled today belongs to the day
  // its bon was made — so it never lands in today's omzet here.
  const [omzet, setOmzet] = useState(isDemoMode ? 7_950_000 : 0);
  const [trx, setTrx] = useState(isDemoMode ? 54 : 0);
  const [shiftCount, setShiftCount] = useState(isDemoMode ? 3 : 1);
  const [cash, setCash] = useState(isDemoMode ? 6_120_000 : 0);   // tunai + transfer (drawer)
  const [modalAwal, setModalAwal] = useState(isDemoMode ? 500_000 : 0);
  const [kasMasuk, setKasMasuk] = useState(0);
  const [kasKeluar, setKasKeluar] = useState(isDemoMode ? 115_000 : 0);
  const [hutangSettle, setHutangSettle] = useState(isDemoMode ? 185_000 : 0); // pelunasan tunai hari ini → masuk laci
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [showRecon, setShowRecon] = useState(false);
  const [counted, setCounted] = useState("");
  const [piutangBaru, setPiutangBaru] = useState(isDemoMode ? 217_000 : 0); // hutang baru hari ini, belum lunas
  const [breakdown, setBreakdown] = useState<Record<string, number>>(isDemoMode
    ? { tunai: 5_120_000, qris: 1_830_000, transfer: 1_000_000 } : {});

  useEffect(() => {
    if (!storeId || isDemoMode) return;
    let cancelled = false;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0); const startISO = start.toISOString();
      const { data: sales } = await supabase.from("sales").select("total,payment_method,shift,created_at").eq("store_id", storeId).gte("created_at", startISO);
      const { data: kas } = await supabase.from("kas_entries").select("type,amount,created_at").eq("store_id", storeId).gte("created_at", startISO);
      const { data: hut } = await supabase.from("hutang").select("amount,status,settled_method,created_at").eq("store_id", storeId).gte("created_at", startISO);
      if (cancelled) return;
      const S = (sales ?? []) as { total: number; payment_method: string; shift: number }[];
      const H = (hut ?? []) as { amount: number; status: string; settled_method?: string | null }[];
      // OMZET (income, cash-basis): non-credit sales today by method…
      const bd: Record<string, number> = {};
      S.filter(s => s.payment_method !== "hutang").forEach(s => { bd[s.payment_method] = (bd[s.payment_method] ?? 0) + (s.total ?? 0); });
      // …plus any hutang whose bon is TODAY and already lunas (folded by settle method).
      H.filter(h => h.status === "lunas").forEach(h => { const m = h.settled_method ?? "tunai"; bd[m] = (bd[m] ?? 0) + h.amount; });
      setBreakdown(bd);
      setOmzet(Object.values(bd).reduce((a, v) => a + v, 0));
      setPiutangBaru(H.filter(h => h.status !== "lunas").reduce((a, h) => a + h.amount, 0));
      setTrx(S.length);
      setShiftCount(Math.max(1, new Set(S.map(s => s.shift)).size));
      // DRAWER (physical cash today): direct tunai+transfer SALES only. Hutang
      // settlements come in via the separate hutang_settle kas type below — folding
      // them into bd is for omzet display, not the drawer, so we don't double-count.
      setCash(S.filter(s => s.payment_method === "tunai" || s.payment_method === "transfer").reduce((a, s) => a + (s.total ?? 0), 0));
      setModalAwal(modalAwalToday(storeId)); setShiftId(null);
      const K = (kas ?? []) as { type: string; amount: number }[];
      setKasMasuk(K.filter(k => k.type === "masuk").reduce((a, k) => a + k.amount, 0));
      setKasKeluar(K.filter(k => k.type === "keluar").reduce((a, k) => a + k.amount, 0));
      setHutangSettle(K.filter(k => k.type === "hutang_settle").reduce((a, k) => a + k.amount, 0));
    })();
    return () => { cancelled = true; };
  }, [storeId, isDemoMode]);

  const expected = modalAwal + cash + kasMasuk + hutangSettle - kasKeluar;   // drawer seharusnya
  const countedNum = parseInt(counted.replace(/\D/g, "") || "0");
  const selisih = counted ? countedNum - expected : 0;
  const selType: "cocok" | "lebih" | "kurang" = selisih === 0 ? "cocok" : selisih > 0 ? "lebih" : "kurang";
  const rataRata = trx ? Math.round(omzet / trx) : 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function closeAndLogout() {
    const reconciled = recOn && counted !== "";
    if (storeId && !isDemoMode) {
      try {
        if (shiftId) {
          const patch: Record<string, unknown> = { closed_at: new Date().toISOString(), modal_akhir: reconciled ? countedNum : null };
          if (reconciled) { patch.selisih_type = selType; patch.selisih_amount = Math.abs(selisih); }
          await supabase.from("shifts").update(patch).eq("id", shiftId);
        }
        // Save the closing nota (viewable later in Laporan → Tutup Shift).
        await saveShiftClosing(storeId, {
          cashierName: cashierName || null, omzet, trx, shiftCount,
          cash, kasMasuk, kasKeluar, hutangSettle,
          expected: cash + kasMasuk + hutangSettle - kasKeluar, breakdown,
          modalAwal, counted: reconciled ? countedNum : null, selisih: reconciled ? selisih : null, reconciled,
        });
        if (reconciled) void logEvent("shift.rekonsiliasi", `Rekonsiliasi ${selType.toUpperCase()} · dihitung ${formatRp(countedNum)} vs seharusnya ${formatRp(expected)} (selisih ${selisih >= 0 ? "+" : ""}${formatRp(selisih)})`);
        else void logEvent("shift.close", "Tutup shift · tanpa hitung kas");
      } catch { /* still let them log out */ }
    }
    signOut();
  }

  const sel = selType === "cocok"
    ? { label: "Cocok ✓", color: "#3D7A5E", bg: "rgba(92,158,126,0.10)" }
    : selType === "lebih"
    ? { label: "Lebih", color: "#A6843F", bg: "rgba(201,165,95,0.12)" }
    : { label: "Kurang", color: "#C25E3D", bg: "rgba(194,94,61,0.10)" };

  const reconRow = (label: string, value: string, sign?: "+" | "-", strong?: boolean) => (
    <div className="flex justify-between items-center py-[9px] border-b border-[#F2EDE3] last:border-0">
      <span className={`text-[12.5px] ${strong ? "font-semibold text-navy" : "text-text-mute"}`}>{label}</span>
      <span className={`${strong ? "font-serif text-[15px] font-semibold text-navy" : "text-[13px] text-navy"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {sign === "-" ? "− " : sign === "+" ? "+ " : ""}{value}
      </span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-cream-bg animate-screen-in overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 lg:px-8 py-3.5 lg:py-4 border-b border-warm-border shrink-0">
        <button onClick={() => setScreen("kas")} className="flex items-center gap-1.5 text-[12px] text-text-mute hover:text-navy transition-colors bg-transparent border-0 p-0 cursor-pointer shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          Batal
        </button>
        <div className="flex-1 text-center min-w-0">
          <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-gold leading-tight">TUTUP TOKO · END OF DAY</p>
          <p className="text-[11px] text-text-mute hidden lg:block mt-0.5">{dateStr}</p>
        </div>
        <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9, letterSpacing: "0.16em", fontWeight: 600, padding: "3px 8px", borderRadius: 9999, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>{effectiveTier}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:gap-6 px-6 lg:px-8 py-6 lg:py-8 overflow-auto min-h-0">
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <div>
            <h1 className="font-serif text-[28px] lg:text-[32px] font-medium text-navy mb-1">Tutup Toko</h1>
            <p className="text-[13px] text-text-mute">Ringkasan hari ini sebelum logout. Data tersimpan di Riwayat ({retentionDays} hari).</p>
          </div>

          {/* Navy omzet card */}
          <div className="bg-navy rounded-card px-7 py-7">
            <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-3">TOTAL OMZET HARI INI</p>
            <p className="font-serif text-[34px] lg:text-[52px] font-semibold text-cream-text leading-none mb-6" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(omzet)}</p>
            <div className="flex gap-8 pt-5 border-t border-white/10">
              <div><p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TRANSAKSI</p><p className="font-serif text-[24px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{trx}</p></div>
              <div><p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">SHIFT</p><p className="font-serif text-[24px] font-semibold text-cream-text">{shiftCount}</p></div>
              <div><p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">RATA-RATA</p><p className="font-serif text-[24px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>Rp {Math.round(rataRata / 1000)}k</p></div>
            </div>
          </div>

          {/* Breakdown: modal awal + penjualan per metode (all tiers) */}
          <div className="bg-white border border-warm-border rounded-card px-6 py-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#F2EDE3]">
              <span className="text-[12.5px] text-text-mute">Modal awal</span>
              <span className="font-serif text-[15px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(modalAwal)}</span>
            </div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mt-4 mb-1.5">PENJUALAN PER METODE</p>
            <div className="flex flex-col">
              {METHOD_ORDER.filter(m => (breakdown[m] ?? 0) > 0).map(m => (
                <div key={m} className="flex justify-between items-center py-[7px] border-b border-[#F2EDE3] text-[12.5px]">
                  <span className={m === "hutang" ? "text-[#C25E3D]" : "text-navy"}>{METHOD_LABEL[m] ?? m}{m === "hutang" ? " · belum diterima" : ""}</span>
                  <span className="font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(breakdown[m] ?? 0)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-dashed border-warm-dashed">
                <span className="text-[13px] font-semibold text-navy">Total omset</span>
                <span className="font-serif text-[17px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(omzet)}</span>
              </div>
            </div>
            {piutangBaru > 0 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#F2EDE3]">
                <span className="text-[12px] text-[#C25E3D]">Hutang baru hari ini · belum diterima</span>
                <span className="font-medium text-[#C25E3D] text-[13px]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(piutangBaru)}</span>
              </div>
            )}
          </div>

          {/* Reconciliation — Standard+ only, optional, owner-toggleable */}
          {recOn && (
            <div className="bg-white border border-warm-border rounded-card px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute">REKONSILIASI KAS · OPSIONAL</p>
                  <p className="text-[11.5px] text-text-mute mt-0.5">Hitung uang di laci untuk cek selisih. Boleh tutup tanpa hitung.</p>
                </div>
                <button onClick={() => setShowRecon(v => !v)}
                  className="shrink-0 h-[38px] px-4 rounded-card text-[12.5px] font-semibold border border-navy/20 text-navy hover:border-navy/40 bg-cream-bg cursor-pointer">
                  {showRecon ? "Sembunyikan" : "Hitung Kas"}
                </button>
              </div>

              {showRecon && (
                <div className="mt-4">
                  <div className="flex flex-col">
                    {reconRow("Modal awal", formatRp(modalAwal))}
                    {reconRow("Penjualan tunai + transfer", formatRp(cash), "+")}
                    {hutangSettle > 0 && reconRow("Pelunasan hutang (tunai)", formatRp(hutangSettle), "+")}
                    {kasMasuk > 0 && reconRow("Kas masuk", formatRp(kasMasuk), "+")}
                    {kasKeluar > 0 && reconRow("Kas keluar", formatRp(kasKeluar), "-")}
                    {reconRow("Kas seharusnya", formatRp(expected), undefined, true)}
                  </div>
                  <div className="mt-4">
                    <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">KAS DIHITUNG (UANG DI LACI)</span></label>
                    <div className="flex items-center bg-cream-bg border rounded-button px-4 h-[50px] gap-2" style={{ borderColor: counted ? "#0D1117" : "#ECE7DD" }}>
                      <span className="font-serif text-[16px] text-text-mute font-medium">Rp</span>
                      <input type="text" inputMode="numeric" value={counted} onChange={e => setCounted(formatIDRInput(e.target.value))} placeholder="0"
                        className="flex-1 bg-transparent border-0 outline-none font-serif text-[20px] text-navy" style={{ fontVariantNumeric: "tabular-nums" }} />
                    </div>
                  </div>
                  {counted && (
                    <div className="mt-3 flex items-center justify-between rounded-card px-4 py-3" style={{ background: sel.bg, border: `1px solid ${sel.color}44` }}>
                      <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.06em", color: sel.color }}>Kas · {sel.label}</span>
                      {selType !== "cocok" && <span className="font-serif text-[18px] font-bold" style={{ color: sel.color, fontVariantNumeric: "tabular-nums" }}>{selisih > 0 ? "+" : "−"}{formatRp(Math.abs(selisih))}</span>}
                    </div>
                  )}
                  <p className="text-[10.5px] text-text-mute mt-2">Selisih dicatat pada nota tutup &amp; tersimpan di data shift.</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <button className={`w-full bg-white border border-warm-border rounded-card h-[54px] flex items-center justify-center gap-2 text-[13px] font-semibold text-navy transition-colors ${isStd ? "hover:border-navy/30 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                CETAK / EXPORT LAPORAN
              </button>
              {!isStd && <span style={{ position: "absolute", top: -8, right: 10, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>STANDARD</span>}
            </div>
            <button onClick={closeAndLogout} className="flex-1 bg-navy rounded-card h-[54px] flex items-center justify-center gap-2.5 text-[13px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              TUTUP &amp; LOGOUT
            </button>
          </div>
          <p className="text-[11px] text-text-mute">Setelah ditutup, shift ditutup{isStd ? " (beserta hasil rekonsiliasi jika diisi)" : ""} &amp; layar kembali ke login.</p>
        </div>

        {/* Right: Standard upsell (Free only) */}
        {!isStd && (
          <div className="lg:w-[320px] shrink-0">
            <div className="bg-white border border-warm-border rounded-card px-6 py-6 relative">
              <span style={{ position: "absolute", top: 12, right: 14, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>STANDARD</span>
              <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-2">LAPORAN LENGKAP</p>
              <p className="text-[12.5px] text-text-mute mb-5 leading-relaxed">Tier Free menampilkan total omzet. <span className="text-navy font-medium">Standard</span> membuka:</p>
              <div className="flex flex-col gap-2.5 mb-6">
                {["Rincian omzet per shift & kasir", "Rekonsiliasi kas (hitung laci → selisih)", "Export laporan (PDF / CSV)", "Riwayat 30 hari (bukan 1 hari)", "Uang kas, hutang & WhatsApp struk"].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-[12px] text-navy leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
              <button className="w-full bg-navy rounded-card h-[46px] flex items-center justify-center gap-2 text-[12.5px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0 mb-2">
                UPGRADE · MULAI Rp 50.000/BLN
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
              </button>
              <p className="text-center text-[10px] text-text-mute">Premium Rp 100.000/bln</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
