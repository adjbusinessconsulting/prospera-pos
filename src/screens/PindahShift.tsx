import { useState } from "react";
import { useStore, shiftNameFor } from "../store";
import { CASHIERS, formatRp } from "../data";

export default function PindahShift() {
  const { cashierName, selectedShift, selectedShiftName, dbShifts, setScreen, setShift, selectCashier } = useStore();
  const shiftCount = dbShifts.length > 0 ? dbShifts.length : 3;

  const modalAwal = 500000;
  const penjualanTunai = 2680000;
  const kasKeluar = 115000;
  const seharusnya = modalAwal + penjualanTunai - kasKeluar;

  const [hitungFisik, setHitungFisik] = useState(String(seharusnya));
  const [nextCashierId, setNextCashierId] = useState(CASHIERS[1].id);
  const [catatan, setCatatan] = useState("");

  const next = (selectedShift % shiftCount) + 1;
  const nextName = shiftNameFor(dbShifts, next);
  const fisikNum = parseInt(hitungFisik.replace(/\D/g, "") || "0");
  const selisih = fisikNum - seharusnya;
  const balanced = selisih === 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const nextCashier = CASHIERS.find(c => c.id === nextCashierId) || CASHIERS[1];

  function handleConfirm() {
    setShift(next);
    selectCashier(nextCashierId);
    setScreen("login");
  }

  return (
    <div className="w-full h-full flex flex-col bg-cream-bg animate-screen-in overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 lg:px-8 py-3.5 lg:py-4 border-b border-warm-border shrink-0">
        <button onClick={() => setScreen("kas")}
          className="flex items-center gap-1.5 text-[12px] text-text-mute hover:text-navy transition-colors bg-transparent border-0 p-0 cursor-pointer shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          Batal
        </button>
        <div className="flex-1 text-center min-w-0">
          <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-gold leading-tight">
            SERAH TERIMA · {selectedShiftName} → {nextName}
          </p>
          <p className="text-[11px] text-text-mute hidden lg:block mt-0.5">{cashierName} · {dateStr} · {timeStr}</p>
          <p className="text-[10.5px] text-text-mute lg:hidden mt-0.5">{cashierName} · {timeStr}</p>
        </div>
        <span style={{ background: "rgba(122,119,111,0.10)", border: "1px solid rgba(122,119,111,0.28)", color: "#7A776F", fontSize: 9, letterSpacing: "0.16em", fontWeight: 600, padding: "3px 8px", borderRadius: 9999, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>FREE</span>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:gap-6 px-6 lg:px-8 py-6 lg:py-8 overflow-auto min-h-0">

        {/* Left panel */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <div>
            <h1 className="font-serif text-[28px] lg:text-[32px] font-medium text-navy mb-1">Pindah Shift</h1>
            <p className="text-[13px] text-text-mute">Hitung uang di laci, lalu serah-terima ke kasir berikutnya.</p>
          </div>

          {/* Perhitungan sistem */}
          <div className="bg-white border border-warm-border rounded-card px-6 py-5">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-4">PERHITUNGAN SISTEM</p>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-text-mute">Modal awal shift</span>
                <span className="text-navy font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>+ {formatRp(modalAwal)}</span>
              </div>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-text-mute">Penjualan tunai · 18 trx</span>
                <span className="text-navy font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>+ {formatRp(penjualanTunai)}</span>
              </div>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-text-mute">Kas keluar · 2 trx</span>
                <span style={{ color: "#C25E3D", fontVariantNumeric: "tabular-nums" }} className="font-medium">− {formatRp(kasKeluar)}</span>
              </div>
              <div className="border-t border-dashed border-warm-dashed mt-1 pt-3 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-navy uppercase tracking-[0.08em]">SEHARUSNYA DI LACI</span>
                <span className="num text-[20px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(seharusnya)}</span>
              </div>
            </div>
          </div>

          {/* Hitung fisik */}
          <div className="bg-white border border-warm-border rounded-card px-6 py-5">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">HITUNG FISIK DI LACI</p>
            <div className="bg-cream-bg border-[1.5px] border-navy rounded-button px-4 py-3 flex items-center gap-2 mb-3">
              <span className="num text-[16px] text-text-mute font-medium shrink-0">Rp</span>
              <input
                type="number"
                value={hitungFisik}
                onChange={e => setHitungFisik(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none num text-[22px] font-semibold text-navy"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
            </div>
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] ${balanced ? "bg-[#5C9E7E14]" : "bg-[#C25E3D14]"}`}>
              <div className="flex items-center gap-2">
                {balanced
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C25E3D" strokeWidth="2.5"><path d="M12 9v4M12 17h.01" /></svg>
                }
                <span style={{ fontSize: 10, letterSpacing: "0.12em", color: balanced ? "#5C9E7E" : "#C25E3D" }} className="font-semibold uppercase">
                  SELISIH {balanced ? "· BALANCED" : "· TIDAK BALANCE"}
                </span>
              </div>
              <span className="num text-[15px] font-semibold" style={{ fontVariantNumeric: "tabular-nums", color: balanced ? "#5C9E7E" : "#C25E3D" }}>
                {selisih >= 0 ? "+" : "−"}{formatRp(Math.abs(selisih))}
              </span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:w-[340px] flex flex-col gap-4 shrink-0">

          {/* Next cashier */}
          <div className="bg-white border border-warm-border rounded-card px-6 py-5">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">KASIR BERIKUTNYA</p>
            <div className="relative mb-3">
              <select
                value={nextCashierId}
                onChange={e => setNextCashierId(e.target.value)}
                className="w-full bg-cream-bg border border-warm-border rounded-card px-4 py-3 text-[13px] text-navy font-medium appearance-none outline-none cursor-pointer"
              >
                {CASHIERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div className="flex items-center gap-3 p-3 bg-cream-bg rounded-[10px]">
              <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-[11px] font-semibold text-cream-text shrink-0">
                {nextCashier.initials}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">{nextCashier.name}</div>
                <div className="text-[11px] text-text-mute">{nextName}</div>
              </div>
            </div>
          </div>

          {/* Handover note */}
          <div className="bg-white border border-warm-border rounded-card px-6 py-5 flex flex-col">
            <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3">CATATAN SERAH-TERIMA (OPSIONAL)</p>
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Stok susu rendah, sudah pesan ke supplier. Kunci laci di laci kanan."
              className="min-h-[110px] bg-cream-bg border border-warm-border rounded-[10px] px-4 py-3 text-[12.5px] text-navy placeholder:text-text-mute outline-none resize-none"
            />
          </div>

          {/* Confirm */}
          <button onClick={handleConfirm}
            className="w-full bg-navy rounded-card h-[52px] flex items-center justify-center gap-3 text-[13.5px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0">
            KONFIRMASI & KEMBALI KE PIN
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          </button>
          <p className="text-[11px] text-text-mute text-center pb-2">
            Layar kembali ke login PIN untuk {nextCashier.name.split(" ")[0]}.
          </p>
        </div>
      </div>
    </div>
  );
}
