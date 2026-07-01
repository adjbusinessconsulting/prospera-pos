import { useStore, getTrxId } from "../store";
import { formatRp } from "../data";
import { AppSidebar, MobileBottomNav } from "../components/AppSidebar";

const MOCK_TRX = [
  { trxId: "#TRX-0042", time: "14:32", cashier: "AE", cashierName: "Aerith D.", items: 3, total: 89000,  method: "Tunai",  change: 11000 },
  { trxId: "#TRX-0041", time: "13:15", cashier: "ST", cashierName: "Stevany C.", items: 1, total: 38000,  method: "QRIS",   change: 0 },
  { trxId: "#TRX-0040", time: "12:47", cashier: "AE", cashierName: "Aerith D.", items: 5, total: 152500, method: "Tunai",  change: 47500 },
  { trxId: "#TRX-0039", time: "11:30", cashier: "AN", cashierName: "Anthony D.", items: 2, total: 43000,  method: "Debit",  change: 0 },
  { trxId: "#TRX-0038", time: "10:52", cashier: "ST", cashierName: "Stevany C.", items: 4, total: 67000,  method: "Tunai",  change: 33000 },
  { trxId: "#TRX-0037", time: "10:21", cashier: "AE", cashierName: "Aerith D.", items: 2, total: 11000,  method: "QRIS",   change: 0 },
  { trxId: "#TRX-0036", time: "09:44", cashier: "AN", cashierName: "Anthony D.", items: 7, total: 228500, method: "Tunai",  change: 71500 },
  { trxId: "#TRX-0035", time: "09:10", cashier: "AE", cashierName: "Aerith D.", items: 1, total: 75000,  method: "Transfer", change: 0 },
];

const METHOD_COLOR: Record<string, string> = {
  Tunai: "#5C9E7E",
  QRIS: "#0B1129",
  Debit: "#7A776F",
  Transfer: "#7A776F",
  "E-Wallet": "#C9A55F",
};

const FILTERS = ["Hari ini", "Kemarin", "7 hari", "30 hari"];

export default function Riwayat() {
  const { cashierInitials, setScreen, signOut } = useStore();

  const dayTotal = MOCK_TRX.reduce((s, t) => s + t.total, 0);

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
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">TOTAL HARI INI</p>
            <p className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(dayTotal)}</p>
          </div>
          <div className="bg-white border border-warm-border rounded-card px-5 py-3.5 flex-1">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">TRANSAKSI</p>
            <p className="font-serif text-[22px] font-semibold text-navy">{MOCK_TRX.length} trx</p>
          </div>
          <div className="bg-white border border-warm-border rounded-card px-5 py-3.5 flex-1 hidden lg:block">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">RATA-RATA</p>
            <p className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(Math.round(dayTotal / MOCK_TRX.length))}</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 lg:px-10 pt-4 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f, i) => (
            <button key={f}
              className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${i === 0 ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Desktop table / Mobile cards */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-4 pb-[70px] lg:pb-6">

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
                {MOCK_TRX.map((t, i) => (
                  <tr key={t.trxId} className={`border-b border-[#F2EDE3] hover:bg-cream-bg transition-colors cursor-pointer ${i === 0 ? "bg-gold-soft" : ""}`}>
                    <td className="px-5 py-3.5 text-[12.5px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{t.time}</td>
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
            {MOCK_TRX.map((t, i) => (
              <div key={t.trxId} className="bg-white border border-warm-border rounded-card px-4 py-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-sans text-[13px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{t.trxId}</span>
                    <p className="text-[11px] text-text-mute mt-0.5">{t.time} · {t.cashierName} · {t.items} item</p>
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

      <MobileBottomNav active="riwayat" setScreen={setScreen} />
    </div>
  );
}
