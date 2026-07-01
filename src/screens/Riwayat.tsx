import { useState } from "react";
import { useStore } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";

const TODAY = [
  { trxId: "#TRX-0042", date: "Hari ini", time: "14:32", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 89000,  method: "Tunai",    change: 11000 },
  { trxId: "#TRX-0041", date: "Hari ini", time: "13:15", cashier: "ST", cashierName: "Stevany C.",  items: 1, total: 38000,  method: "QRIS",     change: 0 },
  { trxId: "#TRX-0040", date: "Hari ini", time: "12:47", cashier: "AE", cashierName: "Aerith D.",   items: 5, total: 152500, method: "Tunai",    change: 47500 },
  { trxId: "#TRX-0039", date: "Hari ini", time: "11:30", cashier: "AN", cashierName: "Anthony D.",  items: 2, total: 43000,  method: "Debit",    change: 0 },
  { trxId: "#TRX-0038", date: "Hari ini", time: "10:52", cashier: "ST", cashierName: "Stevany C.",  items: 4, total: 67000,  method: "Tunai",    change: 33000 },
  { trxId: "#TRX-0037", date: "Hari ini", time: "10:21", cashier: "AE", cashierName: "Aerith D.",   items: 2, total: 11000,  method: "QRIS",     change: 0 },
  { trxId: "#TRX-0036", date: "Hari ini", time: "09:44", cashier: "AN", cashierName: "Anthony D.",  items: 7, total: 228500, method: "Tunai",    change: 71500 },
  { trxId: "#TRX-0035", date: "Hari ini", time: "09:10", cashier: "AE", cashierName: "Aerith D.",   items: 1, total: 75000,  method: "Transfer", change: 0 },
];

const YESTERDAY = [
  { trxId: "#TRX-0034", date: "Kemarin", time: "16:05", cashier: "ST", cashierName: "Stevany C.",  items: 3, total: 54000,  method: "QRIS",  change: 0 },
  { trxId: "#TRX-0033", date: "Kemarin", time: "14:20", cashier: "AE", cashierName: "Aerith D.",   items: 6, total: 187000, method: "Tunai", change: 13000 },
  { trxId: "#TRX-0032", date: "Kemarin", time: "12:08", cashier: "AN", cashierName: "Anthony D.",  items: 2, total: 29000,  method: "Debit", change: 0 },
  { trxId: "#TRX-0031", date: "Kemarin", time: "10:44", cashier: "AE", cashierName: "Aerith D.",   items: 4, total: 96500,  method: "Tunai", change: 3500 },
  { trxId: "#TRX-0030", date: "Kemarin", time: "09:30", cashier: "ST", cashierName: "Stevany C.",  items: 1, total: 38000,  method: "QRIS",  change: 0 },
];

const WEEK_EXTRA = [
  { trxId: "#TRX-0029", date: "2 hari lalu", time: "15:11", cashier: "AN", cashierName: "Anthony D.",  items: 5, total: 143000, method: "Tunai",    change: 7000 },
  { trxId: "#TRX-0028", date: "2 hari lalu", time: "11:33", cashier: "AE", cashierName: "Aerith D.",   items: 2, total: 47000,  method: "Transfer", change: 0 },
  { trxId: "#TRX-0027", date: "3 hari lalu", time: "13:45", cashier: "ST", cashierName: "Stevany C.",  items: 8, total: 312000, method: "Tunai",    change: 88000 },
  { trxId: "#TRX-0026", date: "4 hari lalu", time: "10:20", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 67500,  method: "QRIS",     change: 0 },
  { trxId: "#TRX-0025", date: "5 hari lalu", time: "09:55", cashier: "AN", cashierName: "Anthony D.",  items: 1, total: 75000,  method: "Debit",    change: 0 },
];

const MONTH_EXTRA = [
  { trxId: "#TRX-0024", date: "8 hari lalu",  time: "14:00", cashier: "AE", cashierName: "Aerith D.",   items: 4, total: 128000, method: "Tunai", change: 22000 },
  { trxId: "#TRX-0023", date: "10 hari lalu", time: "11:20", cashier: "ST", cashierName: "Stevany C.",  items: 2, total: 59000,  method: "QRIS",  change: 0 },
  { trxId: "#TRX-0022", date: "14 hari lalu", time: "10:05", cashier: "AN", cashierName: "Anthony D.",  items: 6, total: 215500, method: "Tunai", change: 84500 },
  { trxId: "#TRX-0021", date: "20 hari lalu", time: "15:30", cashier: "AE", cashierName: "Aerith D.",   items: 3, total: 91000,  method: "Debit", change: 0 },
  { trxId: "#TRX-0020", date: "25 hari lalu", time: "09:15", cashier: "ST", cashierName: "Stevany C.",  items: 5, total: 176000, method: "Tunai", change: 24000 },
];

const FILTER_DATA = [
  TODAY,
  YESTERDAY,
  [...TODAY, ...YESTERDAY, ...WEEK_EXTRA],
  [...TODAY, ...YESTERDAY, ...WEEK_EXTRA, ...MONTH_EXTRA],
];

const FILTER_LABELS = ["Hari ini", "Kemarin", "7 hari", "30 hari"];
const SUMMARY_LABELS = ["TOTAL HARI INI", "TOTAL KEMARIN", "TOTAL 7 HARI", "TOTAL 30 HARI"];

const METHOD_COLOR: Record<string, string> = {
  Tunai: "#5C9E7E",
  QRIS: "#0B1129",
  Debit: "#7A776F",
  Transfer: "#7A776F",
  "E-Wallet": "#C9A55F",
};

export default function Riwayat() {
  const { cashierInitials, setScreen, signOut } = useStore();
  const [activeFilter, setActiveFilter] = useState(0);

  const trxList = FILTER_DATA[activeFilter];
  const total = trxList.reduce((s, t) => s + t.total, 0);

  return (
    <div className="w-full h-full flex animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-8 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">LAPORAN · HISTORY</p>
          <h1 className="font-serif text-display-l font-medium text-navy">Riwayat Transaksi</h1>
        </div>

        {/* Summary strip */}
        <div className="flex gap-4 px-5 lg:px-10 pt-4 pb-0 shrink-0">
          <div className="bg-white border border-warm-border rounded-card px-5 py-3.5 flex-1">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">{SUMMARY_LABELS[activeFilter]}</p>
            <p className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</p>
          </div>
          <div className="bg-white border border-warm-border rounded-card px-5 py-3.5 flex-1">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">TRANSAKSI</p>
            <p className="font-serif text-[22px] font-semibold text-navy">{trxList.length} trx</p>
          </div>
          <div className="bg-white border border-warm-border rounded-card px-5 py-3.5 flex-1 hidden lg:block">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">RATA-RATA</p>
            <p className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(Math.round(total / trxList.length))}</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 lg:px-10 pt-4 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTER_LABELS.map((f, i) => (
            <button key={f} onClick={() => setActiveFilter(i)}
              className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Desktop table / Mobile cards */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-4 lg:pb-6">

          {/* Desktop: table */}
          <div className="hidden lg:block bg-white border border-warm-border rounded-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Waktu</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">TRX</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Kasir</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Item</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Total</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-mute">Metode</th>
                </tr>
              </thead>
              <tbody>
                {trxList.map((t, i) => (
                  <tr key={t.trxId} className={`border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors cursor-pointer ${i === 0 ? "bg-gold-soft" : ""}`}>
                    <td className="px-5 py-3.5 text-[12.5px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <div>{t.time}</div>
                      {activeFilter > 0 && <div style={{ fontSize: 10, color: "#B0A99A" }}>{t.date}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-sans text-[12.5px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trxId}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cream-pill border border-warm-border flex items-center justify-center text-[9px] font-semibold text-navy">{t.cashier}</span>
                        <span className="text-[12.5px] text-navy">{t.cashierName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-text-mute">{t.items} item</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-serif text-[14px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${METHOD_COLOR[t.method]}14`, color: METHOD_COLOR[t.method] }}>{t.method}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="lg:hidden flex flex-col gap-2.5">
            {trxList.map((t) => (
              <div key={t.trxId} className="bg-white border border-warm-border rounded-card px-4 py-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-sans text-[13px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trxId}</span>
                    <p className="text-[11px] text-text-mute mt-0.5">
                      {activeFilter > 0 && <span>{t.date} · </span>}{t.time} · {t.cashierName} · {t.items} item
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-[16px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(t.total)}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${METHOD_COLOR[t.method]}14`, color: METHOD_COLOR[t.method] }}>{t.method}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
