import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, Download } from "lucide-react";
import { useStore, isAtLeast } from "../store";
import { AppSidebar } from "../components/AppSidebar";
import { getLog, verifyLog, type AuditEntry } from "../lib/auditlog";
import type { Screen } from "../types";

const TYPE_LABEL: Record<string, string> = {
  "product.add": "Produk baru",
  "product.edit": "Ubah produk",
  "product.price": "Ubah harga",
  "product.delete": "Hapus produk",
  "stock.add": "Tambah stok",
  "settings.update": "Ubah pengaturan",
};

const PERIODS = [
  { label: "Hari ini", days: 0, tier: null as string | null },
  { label: "Kemarin", days: 1, tier: null },
  { label: "7 hari", days: 7, tier: "STD" },
  { label: "30 hari", days: 30, tier: "STD" },
];

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Same period semantics as Riwayat (today / yesterday / last N days, WITA-local).
function filterByDays(list: AuditEntry[], days: number) {
  if (days === 0) { const t = new Date(); t.setHours(0, 0, 0, 0); return list.filter(e => new Date(e.time) >= t); }
  if (days === 1) { const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0); const t = new Date(); t.setHours(0, 0, 0, 0); return list.filter(e => { const d = new Date(e.time); return d >= y && d < t; }); }
  const from = new Date(); from.setDate(from.getDate() - (days - 1)); from.setHours(0, 0, 0, 0);
  return list.filter(e => new Date(e.time) >= from);
}

export default function LogAktivitas() {
  const { setScreen, cashierInitials, signOut, storeId, storeTier } = useStore();
  const effectiveTier = storeId ? storeTier : "premium";
  const canExtended = isAtLeast(effectiveTier, "standard");
  const canExport = isAtLeast(effectiveTier, "standard");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [tamperAt, setTamperAt] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState(0);

  useEffect(() => {
    setEntries(getLog().slice().reverse()); // newest first
    verifyLog().then(setTamperAt);
  }, []);

  const intact = tamperAt === -1;
  const shown = useMemo(() => filterByDays(entries, PERIODS[activeFilter].days), [entries, activeFilter]);

  function exportCSV() {
    if (!canExport) return;
    const period = PERIODS[activeFilter].label;
    const rows = [["#", "Waktu", "Jenis", "Detail", "Oleh"], ...shown.map(e => [String(e.seq), fmt(e.time), TYPE_LABEL[e.type] ?? e.type, e.detail, e.actor])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sterith-log-${period.toLowerCase().replace(/ /g, "-")}.csv`;
    a.click();
  }

  const tab = (label: string, screen: Screen, active = false) => (
    <button onClick={active ? undefined : () => setScreen(screen)}
      className={`px-3 lg:px-4 py-2 rounded-[8px] text-[12px] transition-colors border-0 ${active ? "font-semibold bg-navy text-cream-text" : "font-medium text-text-mute hover:text-navy bg-transparent cursor-pointer"}`}>
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN</p>
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight">Performa toko</h1>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5">
              {tab("Riwayat", "riwayat")}
              {tab("Kas", "kas")}
              {tab("Hutang", "hutang")}
              {tab("Log", "log", true)}
            </div>
          </div>
        </div>

        {/* Period chips + export */}
        <div className="flex items-center gap-2 px-5 lg:px-10 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {PERIODS.map((f, i) => {
            const locked = !!f.tier && !canExtended;
            return (
              <div key={f.label} className="relative shrink-0">
                <button onClick={() => { if (!locked) setActiveFilter(i); }}
                  className={`px-3.5 py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${activeFilter === i ? "bg-navy text-cream-text border-navy" : "bg-white text-navy border-warm-border hover:border-navy/40"} ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                  {f.label}
                </button>
                {f.tier && (
                  <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" }}>
                    {f.tier}
                  </span>
                )}
              </div>
            );
          })}
          <div className="relative ml-auto shrink-0">
            <button onClick={exportCSV} disabled={!canExport} title={canExport ? "Export CSV" : "Export tersedia mulai Standard"}
              className={`flex items-center gap-1.5 h-[30px] px-3 rounded-full text-[12px] font-semibold border transition-colors ${canExport ? "bg-white text-[#A6843F] border-[#e2d4ad] hover:bg-cream-bg cursor-pointer" : "bg-cream-bg text-text-mute/50 border-warm-border cursor-not-allowed"}`}>
              <Download size={13} /> Export
            </button>
            {!canExport && <span style={{ position: "absolute", top: -6, right: -2, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7, letterSpacing: "0.12em", fontWeight: 600, padding: "1px 4px", borderRadius: 3, textTransform: "uppercase" }}>STD</span>}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-10 py-5">
          <div style={{ maxWidth: 760 }}>
            {/* Integrity banner */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, padding: "11px 14px", marginBottom: 16, background: intact ? "rgba(78,140,110,0.07)" : "rgba(194,94,61,0.08)", border: `1px solid ${intact ? "rgba(78,140,110,0.3)" : "rgba(194,94,61,0.4)"}` }}>
              {intact ? <ShieldCheck size={18} color="#4E8C6E" /> : <ShieldAlert size={18} color="#C25E3D" />}
              <div style={{ fontSize: 12.5, color: "#0D1117", lineHeight: 1.5 }}>
                {intact
                  ? <>Log utuh &amp; tidak diubah. Catatan bersifat <b>permanen</b> — tidak bisa dihapus atau diedit.</>
                  : <><b style={{ color: "#C25E3D" }}>Log terdeteksi diubah!</b> Rantai tidak konsisten. Hubungi admin.</>}
              </div>
            </div>

            <p style={{ fontSize: 11.5, color: "#7A776F", margin: "0 0 12px" }}>{shown.length} aktivitas · {PERIODS[activeFilter].label}</p>

            {shown.length === 0 ? (
              <p style={{ textAlign: "center", color: "#B8B0A8", fontSize: 13, paddingTop: 32 }}>Belum ada aktivitas di periode ini.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {shown.map((e) => (
                  <div key={e.hash} style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "#A6843F", background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 5, padding: "3px 7px", whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase" }}>
                      {TYPE_LABEL[e.type] ?? e.type}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#0D1117", lineHeight: 1.4 }}>{e.detail}</div>
                      <div style={{ fontSize: 11, color: "#7A776F", marginTop: 3 }}>{fmt(e.time)} · oleh <b style={{ color: "#0D1117" }}>{e.actor}</b></div>
                    </div>
                    <span style={{ fontSize: 10, color: "#C4C0B8", fontFamily: "monospace", flexShrink: 0 }}>#{e.seq}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
