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

// Only methods the shown tier can actually take. Free is tunai/qris/transfer;
// hutang is Standard+; debit and e-wallet are Premium (see methodLock in
// Payment.tsx). A Free demo listing Debit advertises a method the product refuses.
export function demoMethods(tier: string): string[] {
  const t = (tier || "free").toLowerCase();
  const base = ["tunai", "tunai", "tunai", "qris", "qris", "transfer"];
  if (t === "free") return base;
  if (t === "standard") return [...base, "hutang"];
  return [...base, "hutang", "debit"];
}

export function makeDemoSales(tier: string): SaleRecord[] {
  const cashiers = ["Mr Bah", "Mr Pra"];
  const methods = demoMethods(tier);
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
