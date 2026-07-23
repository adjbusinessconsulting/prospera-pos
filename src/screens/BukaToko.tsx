import { useState } from "react";
import { Sun, ArrowRight, XCircle } from "lucide-react";
import { useStore } from "../store";
import { saveDayOpen } from "../lib/dayopen";

const QUICK = [50000, 100000, 200000, 500000];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

// Daily "Buka Toko" gate — captures the opening cash float (modal awal) once per
// calendar day before selling. Reached from the first Sales mount of the day.
export default function BukaToko() {
  const { storeId, storeName, cashierName, settings, setScreen } = useStore();
  const [modal, setModal] = useState(0);
  const [saving, setSaving] = useState(false);
  const quick = settings.quickCash?.length ? settings.quickCash : QUICK;
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function open(amount: number) {
    if (saving) return;
    setSaving(true);
    try { if (storeId) await saveDayOpen(storeId, amount, cashierName); } catch { /* non-fatal */ }
    setScreen("sales");
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-cream-bg px-6 py-8 overflow-y-auto animate-screen-in">
      <div className="w-full" style={{ maxWidth: 420 }}>
        {/* Mark */}
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(201,165,95,0.14)", border: "1px solid rgba(201,165,95,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Sun size={24} color="#A6843F" strokeWidth={1.8} />
        </div>

        <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">BUKA TOKO</p>
        <h1 className="font-serif text-[28px] font-medium text-navy leading-tight">
          {greeting()}{storeName ? `, ${storeName}` : ""}
        </h1>
        <p className="text-[13px] text-text-mute mt-1.5 mb-6">{today}</p>

        {/* Modal awal input */}
        <label style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">Modal awal / uang di laci</label>
        <div className="bg-white border-[1.5px] border-navy rounded-button px-4 py-3 flex items-center gap-2 mt-2 mb-3">
          <span className="font-serif text-[18px] text-text-mute font-medium leading-none shrink-0">Rp</span>
          <input
            inputMode="numeric"
            autoFocus
            value={modal ? modal.toLocaleString("id-ID") : ""}
            onChange={e => setModal(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
            onFocus={e => e.target.select()}
            placeholder="0"
            style={{ fontVariantNumeric: "tabular-nums" }}
            className="font-serif text-[24px] font-semibold text-navy leading-none flex-1 min-w-0 w-full bg-transparent border-0 outline-none placeholder:text-text-mute" />
          {modal > 0 && (
            <button onClick={() => setModal(0)} title="Kosongkan" className="shrink-0 text-text-mute hover:text-navy bg-transparent border-0 cursor-pointer p-0 flex">
              <XCircle size={18} />
            </button>
          )}
        </div>

        {/* Quick amounts (add) */}
        <div className="grid grid-cols-4 gap-2 mb-7">
          {quick.map(a => (
            <button key={a} onClick={() => setModal(modal + a)}
              className="rounded-chip py-2 text-[12px] font-medium border transition-colors bg-white text-navy border-warm-border hover:border-navy/40 cursor-pointer">
              +{a >= 1000 ? a / 1000 + "rb" : a}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button onClick={() => open(modal)} disabled={saving}
          className="w-full rounded-card py-4 flex items-center justify-center gap-2.5 text-[14px] font-semibold tracking-[0.06em] bg-navy text-cream-text hover:bg-navy-soft transition-colors border-0 cursor-pointer disabled:opacity-60">
          Mulai jualan <ArrowRight size={16} strokeWidth={2} />
        </button>
        <button onClick={() => open(0)} disabled={saving}
          className="w-full mt-2.5 py-3 text-[13px] font-medium text-text-mute hover:text-navy bg-transparent border-0 cursor-pointer">
          Lewati — buka tanpa modal awal
        </button>
      </div>
    </div>
  );
}
