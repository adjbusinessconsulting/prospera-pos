import { useState, useEffect, useMemo } from "react";
import { useStore, isAtLeast, localDateISO } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { withRetry } from "../lib/retry";
import { readRiwayatCache, saveRiwayatCache } from "../lib/snapshot";
import { logEvent } from "../lib/auditlog";
import { ManagerApproval } from "../components/ManagerApproval";
import { OwnerConfirm } from "../components/OwnerConfirm";
import type { SaleRecord } from "../types";

const FILTER_LABELS = [
  { label: "Hari ini",  days: 0,  tier: null as string | null },
  { label: "Kemarin",   days: 1,  tier: null },
  { label: "7 hari",    days: 7,  tier: "STD" },
  { label: "30 hari",   days: 30, tier: "STD" },
];

const METHOD_COLOR: Record<string, string> = {
  tunai: "#5C9E7E", Tunai: "#5C9E7E",
  qris: "#0D1117",  QRIS: "#0D1117",
  debit: "#7A776F", Debit: "#7A776F",
  transfer: "#C9A55F", Transfer: "#C9A55F",
  hutang: "#C25E3D", Hutang: "#C25E3D",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const day = new Date(d); day.setHours(0,0,0,0);
  if (day.getTime() === today.getTime()) return "Hari ini";
  if (day.getTime() === yest.getTime()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function methodLabel(m: string) {
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

// Demo-only seeded transaction history (real stores load from Supabase).

// Device-local YYYY-MM-DD for a stored timestamp — same basis as localDateISO(),
// so "is this sale from today?" compares like with like.
function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seedDemoSales(): SaleRecord[] {
  const cashiers = ["Aerith", "Stevany"];
  const methods = ["tunai", "tunai", "tunai", "qris", "qris", "transfer", "debit", "hutang"];
  const products: [string, number][] = [
    ["Beras Pandan 5kg", 75000], ["Indomie Goreng", 3500], ["Telur Ayam", 28000],
    ["Aqua 600ml", 4000], ["Bimoli 2L", 38000], ["Gula Pasir 1kg", 16000], ["Kapal Api Sachet", 1500],
  ];
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const out: SaleRecord[] = [];
  let n = 42;
  for (let d = 0; d < 5; d++) {
    const perDay = d === 0 ? 9 : 3 + (d % 3);
    for (let i = 0; i < perDay; i++) {
      const when = new Date(); when.setDate(when.getDate() - d);
      when.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
        const [pn, price] = pick(products); const qty = 1 + Math.floor(Math.random() * 3);
        return { product_id: "", product_name: pn, price, qty, subtotal: price * qty };
      });
      const total = items.reduce((s, it) => s + it.subtotal, 0);
      const method = pick(methods);
      const rounded = Math.ceil(total / 5000) * 5000;
      out.push({
        id: `demo-${n}`, trx_id: `#TRX-${String(n).padStart(4, "0")}`, cashier_id: "",
        cashier_name: pick(cashiers), shift: 1 + Math.floor(Math.random() * 3), total,
        payment_method: method, cash_received: method === "tunai" ? rounded : total,
        change_amount: method === "tunai" ? rounded - total : 0,
        created_at: when.toISOString(), sale_items: items,
      });
      n++;
    }
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export default function Riwayat() {
  const { cashierInitials, selectedShiftName, storeId, storePhone, storeTier, isDemoMode, settings, inventoryEnabled, updateProduct, products, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : 'free';
  const canExport = isAtLeast(effectiveTier, 'standard');
  const canExtendedHistory = isAtLeast(effectiveTier, 'standard');
  const isPremium = isAtLeast(effectiveTier, 'premium');
  const inventoryOn = isPremium && inventoryEnabled;

  // ── Void (batalkan transaksi) — always needs the owner's password; on Premium the
  // owner may also let a manager void (the "void" permission). Voided sales keep the
  // record with a DIBATALKAN badge and drop out of every total. ──
  const [voidSale, setVoidSale] = useState<SaleRecord | null>(null);
  const [voidGate, setVoidGate] = useState<null | "owner" | "manager">(null);
  const managerCanVoid = isPremium && !isDemoMode && !!(settings.managerPerms ?? {}).void;

  // A closed shift has been counted and reconciled, and a past day has already
  // been reported. Voiding into either would silently rewrite figures the owner
  // has signed off on, so a sale can only be cancelled on the day it was rung
  // up and before that day is closed. Fix it with kas/retur after that.
  const [dayClosed, setDayClosed] = useState(false);
  useEffect(() => {
    if (!storeId || isDemoMode) { setDayClosed(false); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("shift_closings")
        .select("id").eq("store_id", storeId).eq("business_date", localDateISO()).limit(1);
      if (!cancel) setDayClosed(!!data?.length);
    })();
    return () => { cancel = true; };
  }, [storeId, isDemoMode]);

  function voidBlockReason(sale: SaleRecord): string | null {
    if (sale.voided) return null;                                   // already cancelled
    if (dateKey(sale.created_at) !== localDateISO()) return "Transaksi hari sebelumnya tidak bisa dibatalkan.";
    if (dayClosed) return "Shift sudah ditutup — transaksi tidak bisa dibatalkan lagi.";
    return null;
  }
  const canVoid = (sale: SaleRecord) => !sale.voided && !voidBlockReason(sale);

  function requestVoid(sale: SaleRecord) {
    if (sale.voided) return;
    const blocked = voidBlockReason(sale);
    if (blocked) { alert(blocked); return; }
    setVoidSale(sale);
    setVoidGate(managerCanVoid ? "manager" : "owner");
  }

  async function doVoid() {
    const sale = voidSale;
    setVoidGate(null); setVoidSale(null);
    if (!sale || !storeId || isDemoMode) { if (isDemoMode && sale) setSales(prev => prev.map(s => s.id === sale.id ? { ...s, voided: true } : s)); return; }
    try {
      await supabase.from("sales").update({ voided: true, voided_at: new Date().toISOString() }).eq("id", sale.id);
      // A credit sale's debt is cancelled with it — otherwise the bon lingers in Buku Hutang.
      if (sale.payment_method === "hutang" && sale.trx_id) {
        try { await supabase.from("hutang").update({ voided: true }).eq("store_id", storeId).eq("trx_id", sale.trx_id); } catch { /* column not migrated yet */ }
      }
      // Return stock (best-effort) — the goods weren't sold after all.
      if (inventoryOn) {
        for (const it of sale.sale_items ?? []) {
          const p = products.find(x => x.id === it.product_id);
          if (p) updateProduct(it.product_id, { stock: (p.stock ?? 0) + it.qty, stockTerjual: Math.max(0, (p.stockTerjual ?? 0) - it.qty) });
          const { data } = await supabase.from("products").select("stock, stock_terjual").eq("id", it.product_id).maybeSingle();
          if (data) await supabase.from("products").update({ stock: ((data as { stock: number }).stock ?? 0) + it.qty, stock_terjual: Math.max(0, ((data as { stock_terjual: number }).stock_terjual ?? 0) - it.qty) }).eq("id", it.product_id);
        }
      }
      void logEvent("sale.void", `Batalkan ${sale.trx_id} — ${formatRp(sale.total)}`);
    } catch { /* still reflect locally */ }
    setSales(prev => {
      const next = prev.map(s => s.id === sale.id ? { ...s, voided: true } : s);
      saveRiwayatCache(storeId, next);
      return next;
    });
  }
  const [sales, setSales]           = useState<SaleRecord[]>([]);
  const [hutangByTrx, setHutangByTrx] = useState<Record<string, { status: string; settled_method: string | null }>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);
  const [methodFilter, setMethodFilter] = useState("Semua");
  const [shiftFilter, setShiftFilter]   = useState("Semua");
  const [kasirFilter, setKasirFilter]   = useState("Semua");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (isDemoMode) { setSales(seedDemoSales()); setLoadingData(false); return; }
    if (!storeId) { setLoadingData(false); return; }
    // Paint the last-cached history instantly so the screen is never blank while
    // the network catches up (esp. on a cold open after the app was closed a while).
    const cached = readRiwayatCache(storeId);
    if (cached && cached.length) { setSales(cached as SaleRecord[]); setLoadingData(false); }
    // Tier-bounded window: Standard+ keep 30 days; Free only pulls/caches its
    // allowed window (today + kemarin) so the on-device cache never holds more
    // history than the Free tier is entitled to see.
    const historyDays = canExtendedHistory ? 30 : 2;
    const from = new Date();
    from.setDate(from.getDate() - historyDays);
    from.setHours(0, 0, 0, 0);
    // Retry the fetch so a slow/dropped first attempt self-heals instead of
    // leaving an empty list that the cashier has to refresh by hand.
    withRetry(
      async () => await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("store_id", storeId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      ({ error, data }) => !error && !!data,
    ).then(({ data }) => {
      if (data) { setSales(data as SaleRecord[]); saveRiwayatCache(storeId, data); }
      setLoadingData(false);
    });
    supabase
      .from("hutang")
      .select("trx_id,status,settled_method,voided")
      .eq("store_id", storeId)
      .gte("created_at", from.toISOString())
      .then(({ data }) => {
        const m: Record<string, { status: string; settled_method: string | null }> = {};
        (data as { trx_id?: string | null; status: string; settled_method?: string | null; voided?: boolean }[] ?? []).filter(h => !h.voided).forEach(h => {
          if (h.trx_id) m[h.trx_id] = { status: h.status, settled_method: h.settled_method ?? null };
        });
        setHutangByTrx(m);
      });
  }, [storeId, isDemoMode, canExtendedHistory]);

  // Cash-basis: a credit (hutang) sale only counts once its bon is settled (lunas);
  // the money lands on the bon's own date (this row's date), never on payment day.
  // Demo has no hutang table — mark even-numbered bon as already lunas for realism.
  const hutangStatusOf = useMemo(() => (s: SaleRecord): { paid: boolean; method: string | null } | null => {
    if (s.payment_method !== "hutang") return null;
    if (isDemoMode) {
      const num = parseInt((s.trx_id ?? "").replace(/\D/g, "") || "0");
      return num % 2 === 0 ? { paid: true, method: "tunai" } : { paid: false, method: null };
    }
    const h = s.trx_id ? hutangByTrx[s.trx_id] : undefined;
    return { paid: h?.status === "lunas", method: h?.settled_method ?? null };
  }, [hutangByTrx, isDemoMode]);
  const receivedTotal = (s: SaleRecord) => {
    const h = hutangStatusOf(s);
    if (!h) return s.total;         // non-credit sale
    return h.paid ? s.total : 0;    // credit: only if settled
  };

  function filterByDays(list: SaleRecord[], days: number) {
    if (days === 0) {
      const today = new Date(); today.setHours(0,0,0,0);
      return list.filter(s => new Date(s.created_at) >= today);
    }
    if (days === 1) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1); yest.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return list.filter(s => { const d = new Date(s.created_at); return d >= yest && d < today; });
    }
    const from = new Date(); from.setDate(from.getDate() - (days - 1)); from.setHours(0,0,0,0);
    return list.filter(s => new Date(s.created_at) >= from);
  }

  const periodSales = filterByDays(sales, FILTER_LABELS[activeFilter].days);

  const filtered = periodSales.filter(s => {
    const m = methodLabel(s.payment_method);
    const matchMethod = methodFilter === "Semua" || m === methodFilter;
    const matchShift  = shiftFilter === "Semua" || s.shift === parseInt(shiftFilter);
    const matchKasir  = kasirFilter === "Semua" || s.cashier_name === kasirFilter;
    return matchMethod && matchShift && matchKasir;
  });

  // Voided sales stay visible (with a badge) but never count toward money.
  const settled = filtered.filter(t => !t.voided);
  const voidedRows = filtered.filter(t => t.voided);
  const voidedTotal = voidedRows.reduce((s, t) => s + t.total, 0);
  // Omzet = money actually received (cash-basis). Credit sales count only once lunas.
  const total = settled.reduce((s, t) => s + receivedTotal(t), 0);
  const paidCount = settled.filter(t => receivedTotal(t) > 0).length;
  const avg = paidCount > 0 ? Math.round(total / paidCount) : 0;
  // Outstanding credit in this period (piutang) — shown separately, not in omzet.
  const piutang = settled.reduce((s, t) => { const h = hutangStatusOf(t); return s + (h && !h.paid ? t.total : 0); }, 0);

  // Per-method received money: non-credit by method; settled credit by settle method.
  const methodTotals = settled.reduce<Record<string, number>>((acc, t) => {
    const h = hutangStatusOf(t);
    if (!h) { const m = t.payment_method.toLowerCase(); acc[m] = (acc[m] ?? 0) + t.total; }
    else if (h.paid) { const m = (h.method ?? "tunai").toLowerCase(); acc[m] = (acc[m] ?? 0) + t.total; }
    return acc;
  }, {});
  const BREAKDOWN_ORDER = ["tunai", "qris", "transfer", "debit"];
  const BREAKDOWN_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", debit: "Debit" };

  const uniqueCashiers = [...new Set(sales.map(s => s.cashier_name).filter(Boolean))];

  function exportCSV() {
    const period = FILTER_LABELS[activeFilter].label;
    const header = ["No", "TRX ID", "Tanggal", "Jam", "Kasir", "Item", "Total (Rp)", "Metode", "Shift"];
    const rows = filtered.map((t, i) => [
      i + 1, t.trx_id, fmtDate(t.created_at), fmtTime(t.created_at), t.cashier_name,
      t.sale_items?.length ?? 0, t.total, methodLabel(t.payment_method), `Shift ${t.shift}`,
    ]);
    const BOM = "﻿";
    const csv = BOM + [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sterith-riwayat-${period.toLowerCase().replace(/ /g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportWhatsApp() {
    const period = FILTER_LABELS[activeFilter].label;
    const lines = [
      `*Laporan Riwayat — ${period}*`,
      `Sterith POS`,
      ``,
      `Total Omzet: ${formatRp(total)}`,
      `Transaksi: ${settled.length}  |  Rata-rata: ${formatRp(avg)}`,
      ``,
      `*Detail Transaksi:*`,
      ...filtered.map(t => `• ${t.trx_id}  ${fmtTime(t.created_at)}  ${t.cashier_name}  ${methodLabel(t.payment_method)}  ${formatRp(t.total)}`),
    ];
    const text = encodeURIComponent(lines.join("\n"));
    const phone = storePhone.replace(/\D/g, "").replace(/^0/, "62");
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function exportPDF() {
    const period = FILTER_LABELS[activeFilter].label;
    const rows = filtered.map((t, i) => `
      <tr>
        <td>${i + 1}</td><td>${t.trx_id}</td><td>${fmtDate(t.created_at)}</td><td>${fmtTime(t.created_at)}</td>
        <td>${t.cashier_name}</td><td style="text-align:center">${t.sale_items?.length ?? 0}</td>
        <td style="text-align:right">${formatRp(t.total)}</td><td>${methodLabel(t.payment_method)}</td><td>Shift ${t.shift}</td>
      </tr>`).join("");
    const printed = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"/>
<title>Riwayat Transaksi – ${period}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#0D1117;padding:32px}
  .brand{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A776F;margin-bottom:4px}
  h1{font-size:22px;font-weight:700;margin-bottom:3px}
  .meta{font-size:11px;color:#7A776F;margin-bottom:22px}
  .summary{display:flex;gap:28px;margin-bottom:22px;padding:14px 18px;background:#F8F5EF;border-radius:8px}
  .s-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#7A776F;margin-bottom:2px}
  .s-value{font-size:18px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0D1117;color:#F8F5EF}
  th{text-align:left;padding:9px 11px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
  td{padding:8px 11px;border-bottom:1px solid #ECE7DD}
  tr:nth-child(even) td{background:#FAF8F4}
  .footer{margin-top:18px;font-size:9px;color:#B0A99A;text-align:right}
  @media print{body{padding:20px}}
</style></head><body>
<div class="brand">Sterith POS · Laporan</div>
<h1>Riwayat Transaksi</h1>
<div class="meta">Periode: ${period} · Dicetak ${printed}</div>
<div class="summary">
  <div><div class="s-label">Total Omzet</div><div class="s-value">${formatRp(total)}</div></div>
  <div><div class="s-label">Transaksi</div><div class="s-value">${filtered.length}</div></div>
  <div><div class="s-label">Rata-rata</div><div class="s-value">${formatRp(avg)}</div></div>
</div>
<table><thead><tr>
  <th>No</th><th>TRX ID</th><th>Tanggal</th><th>Jam</th><th>Kasir</th>
  <th style="text-align:center">Item</th><th style="text-align:right">Total</th><th>Metode</th><th>Shift</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Sterith POS — digenerate otomatis · ${new Date().toLocaleString("id-ID")}</div>
<script>setTimeout(()=>{window.print();},250);</script>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  const selectStyle: React.CSSProperties = {
    background: "white", border: "1px solid #ECE7DD", borderRadius: 8,
    padding: "6px 32px 6px 10px", fontSize: 12, color: "#0D1117",
    appearance: "none" as const, outline: "none", cursor: "pointer",
  };

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Header */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Performa toko</h1>
            {/* On mobile the tab group sits below the title and scrolls sideways so
                "Tutup Shift" is never clipped; inline on the right from lg up. */}
            <div className="-mx-5 px-5 overflow-x-auto lg:mx-0 lg:px-0 lg:overflow-visible" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 w-max lg:w-auto mt-0.5">
                <button className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text transition-colors border-0 whitespace-nowrap">
                  Riwayat
                </button>
                <button onClick={() => setScreen("kas")}
                  className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap">
                  Kas
                </button>
                <button onClick={() => setScreen("hutang")}
                  className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap">
                  Hutang
                </button>
                <button onClick={() => setScreen("log")}
                  className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap">
                  Log
                </button>
                <button onClick={() => setScreen("shift-riwayat")}
                  className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap">
                  Tutup Shift
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Date filter chips */}
        <div className="flex items-center gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTER_LABELS.map((f, i) => {
            const locked = !!f.tier && !canExtendedHistory;
            return (
              <div key={f.label} className="relative shrink-0">
                <button
                  onClick={() => { if (!locked) setActiveFilter(i); }}
                  className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"} ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                  {f.label}
                </button>
                {f.tier && (
                  <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>
                    {f.tier}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex gap-2 px-5 lg:px-10 pt-2 pb-0 shrink-0">
          <div style={{ position: "relative" }}>
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} style={selectStyle}>
              <option value="Semua">Shift: Semua</option>
              <option value="1">Shift 1 · Pagi</option>
              <option value="2">Shift 2 · Siang</option>
              <option value="3">Shift 3 · Malam</option>
            </select>
            <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div style={{ position: "relative" }}>
            <select value={kasirFilter} onChange={e => setKasirFilter(e.target.value)} style={selectStyle}>
              <option value="Semua">Kasir: Semua</option>
              {uniqueCashiers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        {/* Free expiry banner — Free tier only */}
        {activeFilter === 0 && !canExtendedHistory && (
          <div className="mx-5 lg:mx-10 mt-3 shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed"
            style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <p className="text-[12px] text-navy">
                <span className="font-semibold">Free tier</span> — riwayat tampil 1 hari.
                <span className="text-text-mute"> Data lama tetap tersimpan aman; upgrade Standard untuk lihat riwayat 7/30 hari.</span>
              </p>
            </div>
            <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
              STANDARD
            </span>
          </div>
        )}

        {/* Navy omzet strip */}
        <div className="mx-5 lg:mx-10 mt-3 shrink-0 bg-navy rounded-card px-5 lg:px-7 py-4 flex gap-5 lg:gap-8">
          <div>
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TOTAL OMZET</p>
            <p className="num text-[18px] lg:text-[20px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</p>
          </div>
          <div>
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">TRANSAKSI</p>
            <p className="num text-[18px] lg:text-[20px] font-semibold text-cream-text">{settled.length}</p>
          </div>
          <div className="hidden lg:block">
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">RATA-RATA</p>
            <p className="num text-[18px] lg:text-[20px] font-semibold text-cream-text" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(avg)}</p>
          </div>
          {voidedRows.length > 0 && (
            <div>
              <p className="font-sans uppercase mb-1" style={{ color: "rgba(217,138,106,0.75)", fontSize: 8.5, letterSpacing: "0.18em" }}>DIBATALKAN</p>
              <p className="num text-[18px] lg:text-[20px] font-semibold" style={{ color: "#d98a6a", fontVariantNumeric: "tabular-nums" }}>{voidedRows.length} · {formatRp(voidedTotal)}</p>
            </div>
          )}
          <div className="hidden lg:block">
            <p style={{ fontSize: 8.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-1">SHIFT AKTIF</p>
            <p className="font-serif text-[18px] lg:text-[20px] font-semibold text-cream-text">{selectedShiftName}</p>
          </div>
          <div className="ml-auto relative">
            <button onClick={() => canExport && setShowExportMenu(v => !v)}
              className={`flex items-center gap-2 bg-white/10 transition-colors border-0 rounded-[8px] px-3 py-2 ${canExport ? "hover:bg-white/20 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              <span className="text-[11.5px] font-medium text-white">Export</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <span style={{ position: "absolute", top: -7, right: -2, background: "rgba(201,165,95,0.20)", border: "1px solid rgba(201,165,95,0.5)", color: "#C9A55F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" as const }}>STD</span>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white border border-warm-border rounded-card shadow-xl py-1.5 min-w-[168px]">
                  {settings.whatsappShare && (
                  <button onClick={() => { exportWhatsApp(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.406A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                    WhatsApp
                  </button>
                  )}
                  <button onClick={() => { exportPDF(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E5534B" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                    PDF
                  </button>
                  <div style={{ height: 1, background: "#ECE7DD", margin: "4px 0" }} />
                  <button onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12.5px] text-navy hover:bg-cream-bg transition-colors bg-transparent border-0 cursor-pointer text-left">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rincian per metode (uang diterima) */}
        {total > 0 && (
          <div className="mx-5 lg:mx-10 mt-3 shrink-0 bg-white border border-warm-border rounded-card px-5 lg:px-7 py-3.5">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {BREAKDOWN_ORDER.filter(m => (methodTotals[m] ?? 0) > 0).map(m => (
                <div key={m} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: METHOD_COLOR[m] ?? "#7A776F" }} />
                  <span className="text-[11.5px] text-text-mute">{BREAKDOWN_LABEL[m]}</span>
                  <span className="text-[12.5px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(methodTotals[m] ?? 0)}</span>
                </div>
              ))}
              {piutang > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#C25E3D" }} />
                  <span className="text-[11.5px] text-[#C25E3D]">Hutang belum lunas</span>
                  <span className="text-[12.5px] font-semibold text-[#C25E3D]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(piutang)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Method pills */}
        <div className="flex gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {[
            { key: "Semua",    count: periodSales.length },
            { key: "Tunai",    count: periodSales.filter(t => t.payment_method.toLowerCase() === "tunai").length },
            { key: "QRIS",     count: periodSales.filter(t => t.payment_method.toLowerCase() === "qris").length },
            { key: "Debit",    count: periodSales.filter(t => t.payment_method.toLowerCase() === "debit").length },
            { key: "Transfer", count: periodSales.filter(t => t.payment_method.toLowerCase() === "transfer").length },
            { key: "Hutang",   count: periodSales.filter(t => t.payment_method.toLowerCase() === "hutang").length },
          ].filter(m => m.key === "Semua" || m.count > 0).map(m => (
            <button key={m.key} onClick={() => setMethodFilter(m.key)}
              className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors cursor-pointer ${methodFilter === m.key ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
              {m.key} · {m.count}
            </button>
          ))}
        </div>

        {/* Table / Cards */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-3 pb-4 lg:pb-6">

          {loadingData && (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#B8B0A8", fontSize: 13 }}>Memuat data…</div>
          )}

          {!loadingData && filtered.length === 0 && (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p className="font-serif text-[20px] font-medium text-navy mb-2">Belum ada transaksi</p>
              <p style={{ fontSize: 13, color: "#7A776F" }}>Transaksi yang diselesaikan akan muncul di sini.</p>
            </div>
          )}

          {/* Desktop table */}
          {!loadingData && filtered.length > 0 && (
            <div className="hidden lg:block bg-white border border-warm-border rounded-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-border">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">NO. TRX</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Waktu</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Kasir</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Item</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Metode</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Total</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const m = methodLabel(t.payment_method);
                    const initials = (t.cashier_name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <tr key={t.id} className={`border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors ${i === 0 && !t.voided ? "bg-gold-soft" : ""} ${t.voided ? "opacity-55" : ""}`}>
                        <td className="px-5 py-3.5">
                          <span className="font-sans text-[12.5px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trx_id}</span>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>
                          <div>{fmtTime(t.created_at)}</div>
                          {activeFilter > 0 && <div style={{ fontSize: 10, color: "#B0A99A" }}>{fmtDate(t.created_at)}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cream-pill border border-warm-border flex items-center justify-center text-[9px] font-semibold text-navy">{initials}</span>
                            <div className="min-w-0">
                              <div className="text-[12.5px] text-navy truncate">{t.cashier_name}</div>
                              {t.customer_name && <div className="text-[10px] text-[#A6843F] truncate">a.n. {t.customer_name}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-text-mute">{t.sale_items?.length ?? 0} item</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${METHOD_COLOR[m] || "#7A776F"}14`, color: METHOD_COLOR[m] || "#7A776F" }}>{m}</span>
                            {(() => { const h = hutangStatusOf(t); return h ? (
                              <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: h.paid ? "rgba(61,122,94,0.10)" : "rgba(194,94,61,0.10)", color: h.paid ? "#3D7A5E" : "#C25E3D" }}>{h.paid ? "Lunas" : "Belum"}</span>
                            ) : null; })()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {(() => { const h = hutangStatusOf(t); return (
                            <span className="num text-[14px] font-semibold" style={{ color: h && !h.paid ? "#C25E3D" : "#0D1117", fontVariantNumeric: "tabular-nums", textDecoration: t.voided ? "line-through" : "none" }}>{formatRp(t.total)}</span>
                          ); })()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {t.voided
                            ? <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(194,94,61,0.10)", color: "#C25E3D" }}>Dibatalkan</span>
                            : <button onClick={() => requestVoid(t)} title={voidBlockReason(t) ?? "Batalkan transaksi ini"}
                                className={canVoid(t) ? "text-[11.5px] font-semibold text-[#C25E3D] hover:underline" : "text-[11.5px] font-semibold text-[#B3ADA0] cursor-default"}>Batalkan</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          {!loadingData && filtered.length > 0 && (
            <div className="lg:hidden flex flex-col gap-2.5">
              {filtered.map(t => {
                const m = methodLabel(t.payment_method);
                const h = hutangStatusOf(t);
                return (
                  <div key={t.id} className={`bg-white border rounded-card px-4 py-3.5 ${t.voided ? "opacity-55" : ""}`} style={{ borderColor: h && !h.paid ? "rgba(194,94,61,0.30)" : "#ECE7DD" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-sans text-[13px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trx_id}</span>
                        <p className="text-[11px] text-text-mute mt-0.5">
                          {activeFilter > 0 && <span>{fmtDate(t.created_at)} · </span>}{fmtTime(t.created_at)} · {t.cashier_name} · {t.sale_items?.length ?? 0} item
                          {t.customer_name ? <span className="text-[#A6843F]"> · a.n. {t.customer_name}</span> : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="num text-[16px] font-semibold" style={{ color: h && !h.paid ? "#C25E3D" : "#0D1117", fontVariantNumeric: "tabular-nums", textDecoration: t.voided ? "line-through" : "none" }}>{formatRp(t.total)}</p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${METHOD_COLOR[m] || "#7A776F"}14`, color: METHOD_COLOR[m] || "#7A776F" }}>{m}</span>
                          {h && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: h.paid ? "rgba(61,122,94,0.10)" : "rgba(194,94,61,0.10)", color: h.paid ? "#3D7A5E" : "#C25E3D" }}>{h.paid ? "Lunas" : "Belum"}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-[#F2EDE3]">
                      {t.voided
                        ? <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(194,94,61,0.10)", color: "#C25E3D" }}>Dibatalkan</span>
                        : <button onClick={() => requestVoid(t)} title={voidBlockReason(t) ?? "Batalkan transaksi ini"}
                            className={canVoid(t) ? "text-[11.5px] font-semibold text-[#C25E3D]" : "text-[11.5px] font-semibold text-[#B3ADA0]"}>Batalkan transaksi</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Void approval — owner password (all tiers) or manager (Premium, if allowed) */}
      <OwnerConfirm
        open={voidGate === "owner"}
        title="Batalkan transaksi"
        message={voidSale ? `Masukkan kata sandi pemilik untuk membatalkan ${voidSale.trx_id} (${formatRp(voidSale.total)}).` : undefined}
        onClose={() => { setVoidGate(null); setVoidSale(null); }}
        onConfirmed={() => void doVoid()}
      />
      <ManagerApproval
        open={voidGate === "manager"}
        action="void"
        onClose={() => { setVoidGate(null); setVoidSale(null); }}
        onApproved={() => void doVoid()}
      />
    </div>
  );
}
