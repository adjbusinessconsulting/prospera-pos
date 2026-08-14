import type { SaleRecord } from "../types";

// The demo's seeded sales history — the SINGLE source every demo screen counts
// from.
//
// It used to live inside Riwayat while Kas hardcoded 2.680.000 of cash sales and
// Tutup Toko hardcoded 5.120.000, so the three screens each reported a different
// "tunai" for the same day. Constants could never have agreed with this generator
// anyway, because it is random per session. Now Riwayat, Kas, Tutup Toko and the
// closing nota all derive from this one array, so the figures reconcile — which
// matters more here than anywhere, since the product is sold on its arithmetic.

// One shop, three plans. The seed is generated ONCE with every payment method,
// and each tier simply hides what that plan cannot do — rather than generating a
// different shop per tier, which made Free and Premium look like unrelated
// businesses. Free is tunai/qris/transfer; hutang is Standard+; debit and e-wallet
// are Premium (see methodLock in Payment.tsx).
const ALL_METHODS = ["tunai", "tunai", "tunai", "qris", "qris", "transfer", "hutang", "debit"];

export function methodsForTier(tier: string): Set<string> {
  const t = (tier || "free").toLowerCase();
  const ok = new Set(["tunai", "qris", "transfer"]);
  if (t === "free") return ok;
  ok.add("hutang");
  if (t !== "standard") { ok.add("debit"); ok.add("ewallet"); }
  return ok;
}

/**
 * How many shifts this plan can run. Free has a single shift slot
 * (SHIFT_SLOT_LIMITS in store.ts), so a Free demo showing three shifts would be
 * advertising a limit the product enforces.
 */
export function shiftCountForTier(tier: string): number {
  return (tier || "free").toLowerCase() === "free" ? 1 : 3;
}

/**
 * The same seeded day, showing only what this plan can actually do.
 *
 * Two adjustments, both cosmetic to the money: methods the plan cannot use are
 * dropped, and the seeded shift spread (1-3) is collapsed to shift 1 on Free.
 * Collapsing rather than filtering matters — every sale still counts, so omzet,
 * tunai and trx are identical whichever way the tier pill is set.
 */
export function salesForTier(sales: SaleRecord[], tier: string): SaleRecord[] {
  const ok = methodsForTier(tier);
  const shifts = shiftCountForTier(tier);
  return sales
    .filter(s => ok.has(s.payment_method))
    .map(s => (s.shift && s.shift > shifts ? { ...s, shift: 1 } : s));
}

// Deterministic PRNG (mulberry32) with a fixed seed, so the demo shows the SAME
// figures every time it is opened.
//
// This used to use Math.random(), which meant a prospect who came back saw
// different numbers — quietly undermining the one thing the product is sold on —
// and ad screenshots could never be re-shot to match each other. Dates are still
// relative to today, so the history always reads as "this week".
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDemoSales(): SaleRecord[] {
  const cashiers = ["Mr Bah", "Mr Pra"];
  const methods = ALL_METHODS;
  const products: [string, number][] = [
    ["Beras Pandan 5kg", 75000], ["Indomie Goreng", 3500], ["Telur Ayam", 28000],
    ["Aqua 600ml", 4000], ["Bimoli 2L", 38000], ["Gula Pasir 1kg", 16000], ["Kapal Api Sachet", 1500],
  ];
  const rand = rng(20260812);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const out: SaleRecord[] = [];
  let n = 42;
  for (let d = 0; d < 5; d++) {
    const perDay = d === 0 ? 9 : 3 + (d % 3);
    for (let i = 0; i < perDay; i++) {
      const when = new Date(); when.setDate(when.getDate() - d);
      when.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
      const items = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
        const [pn, price] = pick(products); const qty = 1 + Math.floor(rand() * 3);
        return { product_id: "", product_name: pn, price, qty, subtotal: price * qty };
      });
      const total = items.reduce((s, it) => s + it.subtotal, 0);
      const method = pick(methods);
      const rounded = Math.ceil(total / 5000) * 5000;
      out.push({
        id: `demo-${n}`, trx_id: `#TRX-${String(n).padStart(4, "0")}`, cashier_id: "",
        cashier_name: pick(cashiers), shift: 1 + Math.floor(rand() * 3), total,
        payment_method: method, cash_received: method === "tunai" ? rounded : total,
        change_amount: method === "tunai" ? rounded - total : 0,
        created_at: when.toISOString(), sale_items: items,
      });
      n++;
    }
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const isToday = (iso: string) => {
  const d = new Date(iso); const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

/**
 * Today's totals, derived from the same sales every screen shows.
 *
 * Mirrors the real logic in TutupToko: omzet is accrual (a bon counts on its own
 * day), and only TUNAI reaches the drawer — transfer and QRIS never do.
 */
export function demoTotals(sales: SaleRecord[]) {
  const today = sales.filter(s => isToday(s.created_at) && !s.voided);
  const breakdown: Record<string, number> = {};
  for (const s of today) breakdown[s.payment_method] = (breakdown[s.payment_method] ?? 0) + s.total;
  const cash = today.filter(s => s.payment_method === "tunai").reduce((a, s) => a + s.total, 0);
  const hutang = breakdown.hutang ?? 0;
  return {
    breakdown,
    omzet: Object.values(breakdown).reduce((a, v) => a + v, 0),
    cash,                       // tunai sales only — what physically enters the laci
    trx: today.length,
    hutang,                     // bons opened today, in full
    piutangBaru: Math.round(hutang * 0.55),   // some collected same day, some not
    hutangSettle: hutang - Math.round(hutang * 0.55),
  };
}

/**
 * Back Office totals over the WHOLE seeded period, not just today.
 *
 * The Back Office demo used to carry its own figures — Tunai 8.900.000 against
 * the POS demo's 847.500 — so the two halves of one demo described two different
 * shops. Anyone toggling Front/Back would see the pitch contradict itself.
 * Everything here is counted from the same sales the POS side shows.
 */
export function demoBackofficeTotals(sales: SaleRecord[]) {
  const live = sales.filter(s => !s.voided);
  const byMethod: Record<string, number> = {};
  const byCashier: Record<string, { rev: number; trx: number }> = {};
  const byProduct: Record<string, { qty: number; rev: number }> = {};

  for (const s of live) {
    byMethod[s.payment_method] = (byMethod[s.payment_method] ?? 0) + s.total;
    const c = byCashier[s.cashier_name] ?? { rev: 0, trx: 0 };
    c.rev += s.total; c.trx += 1; byCashier[s.cashier_name] = c;
    for (const it of s.sale_items ?? []) {
      const p = byProduct[it.product_name] ?? { qty: 0, rev: 0 };
      p.qty += it.qty; p.rev += it.subtotal; byProduct[it.product_name] = p;
    }
  }

  const COLOR: Record<string, string> = {
    tunai: "#4E8C6E", qris: "#0D1117", transfer: "#A6843F",
    debit: "#7A776F", ewallet: "#7A776F", hutang: "#C25E3D",
  };
  const LABEL: Record<string, string> = {
    tunai: "Tunai", qris: "QRIS", transfer: "Transfer",
    debit: "Debit", ewallet: "E-Wallet", hutang: "Hutang / Bon",
  };

  return {
    omzet: live.reduce((a, s) => a + s.total, 0),
    trx: live.length,
    // Bons are revenue on their own day (accrual) but not yet collected — the
    // same split Tutup Toko shows, so the two screens agree on what is owed.
    piutang: Math.round((byMethod.hutang ?? 0) * 0.55),
    payMix: ["tunai", "qris", "transfer", "debit", "ewallet", "hutang"]
      .filter(m => (byMethod[m] ?? 0) > 0)
      .map(m => ({ label: LABEL[m] ?? m, value: byMethod[m], color: COLOR[m] ?? "#7A776F" })),
    byCashier: Object.entries(byCashier)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.rev - a.rev),
    topProducts: Object.entries(byProduct)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5),
  };
}
