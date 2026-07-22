import { useState, useRef, useEffect } from "react";
import { X, Camera, Image as ImageIcon } from "lucide-react";
import { useStore, isAtLeast } from "../store";
import { formatRp, formatIDRInput } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";

type KasIcon = "masuk" | "keluar" | "auto" | "hutang_settle";
interface KasMove { time: string; label: string; desc: string; amount: number; icon: KasIcon; photo: boolean }

// Demo-only seed (real stores load from kas_entries / sales).
const DEMO_MANUAL: KasMove[] = [
  { time: "16:10", label: "Pelunasan bon TRX-0042 — Budi", desc: "Aerith D. · pelunasan hutang", amount: 185000, icon: "hutang_settle", photo: false },
  { time: "15:30", label: "Bayar parkir & retribusi", desc: "Aerith D. · keluar", amount: -15000,  icon: "keluar", photo: true },
  { time: "14:48", label: "Beli es batu",             desc: "Aerith D. · keluar", amount: -100000, icon: "keluar", photo: true },
];
const DEMO_MODAL = 500000, DEMO_AUTO = 2680000;

function PhotoThumb({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const iconSize = size === "md" ? 14 : 11;
  return (
    <div className={`${dim} rounded-[6px] flex items-center justify-center shrink-0 border border-warm-border`}
      style={{ background: "linear-gradient(135deg, #F2EDE3, #E8DFC9)" }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#B0A99A" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

export default function Kas() {
  const { cashierInitials, cashierName, selectedShift, selectedShiftName, storeId, storeTier, isDemoMode, settings, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : 'free';
  const canKas = isAtLeast(effectiveTier, 'standard');       // tier gate (banner/upsell)
  const newKasOn = canKas && settings.kas;                    // owner can hide new-entry buttons
  // Foto bukti is optional by default; the owner can make it required (Pengaturan).
  const requiresPhoto = settings.fotoBuktiWajib;

  const [manual, setManual] = useState<KasMove[]>(isDemoMode ? DEMO_MANUAL : []);
  const [modalAwal, setModalAwal] = useState(isDemoMode ? DEMO_MODAL : 0);
  const [autoTunai, setAutoTunai] = useState(isDemoMode ? DEMO_AUTO : 0);
  const [bukaTime, setBukaTime] = useState(isDemoMode ? "14:00" : "");
  const [showMasuk, setShowMasuk] = useState(false);
  const [showKeluar, setShowKeluar] = useState(false);
  const [kasNominal, setKasNominal] = useState("");
  const [kasKet, setKasKet] = useState("");
  const [kasPhoto, setKasPhoto] = useState<string | null>(null);
  const kasCamera = useRef<HTMLInputElement>(null);
  const kasGallery = useRef<HTMLInputElement>(null);

  // Load today's real kas + modal awal + cash-in from sales (skips demo).
  useEffect(() => {
    if (!storeId || isDemoMode) return;
    let cancelled = false;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const startISO = start.toISOString();
      const { data: shiftRow } = await supabase.from("shifts")
        .select("modal_awal, opened_at").eq("store_id", storeId).is("closed_at", null)
        .order("opened_at", { ascending: false }).limit(1).maybeSingle();
      const { data: salesRows } = await supabase.from("sales")
        .select("total, payment_method, created_at").eq("store_id", storeId).gte("created_at", startISO);
      const { data: kasRows } = await supabase.from("kas_entries")
        .select("*").eq("store_id", storeId).gte("created_at", startISO)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const sr = shiftRow as { modal_awal?: number; opened_at?: string } | null;
      setModalAwal(sr?.modal_awal ?? 0);
      setBukaTime(sr?.opened_at ? new Date(sr.opened_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "");
      setAutoTunai((salesRows ?? [])
        .filter(s => (s as { payment_method: string }).payment_method === "tunai")
        .reduce((a, s) => a + ((s as { total: number }).total ?? 0), 0));
      setManual((kasRows ?? []).map(k => {
        const kk = k as { type: KasIcon; amount: number; label: string; cashier_name?: string; photo_url?: string; created_at: string };
        const typeLabel = kk.type === "hutang_settle" ? "pelunasan hutang" : kk.type;
        return {
          time: new Date(kk.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          label: kk.label,
          desc: [kk.cashier_name, typeLabel].filter(Boolean).join(" · "),
          amount: kk.type === "keluar" ? -kk.amount : kk.amount,
          icon: kk.type, photo: !!kk.photo_url,
        };
      }));
    })();
    return () => { cancelled = true; };
  }, [storeId, isDemoMode]);

  const kasKeluar  = manual.filter(p => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);
  const kasMasuk   = manual.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const totalMasuk = modalAwal + autoTunai + kasMasuk;
  const saldo      = totalMasuk - kasKeluar;

  // Display: manual entries first, then synthetic auto cash-in + modal awal rows.
  const pergerakan: KasMove[] = [
    ...manual,
    ...(autoTunai > 0 ? [{ time: "", label: "Penjualan tunai", desc: "otomatis dari penjualan", amount: autoTunai, icon: "auto" as KasIcon, photo: false }] : []),
    ...(modalAwal > 0 ? [{ time: "", label: "Modal awal shift", desc: "saat buka toko", amount: modalAwal, icon: "masuk" as KasIcon, photo: false }] : []),
  ];

  const isModalOpen = showMasuk || showKeluar;
  const modalType: "masuk" | "keluar" = showMasuk ? "masuk" : "keluar";

  function handleKasFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setKasPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function closeKasModal() {
    setShowMasuk(false);
    setShowKeluar(false);
    setKasNominal("");
    setKasKet("");
    setKasPhoto(null);
  }

  function handleKasConfirm() {
    const amount = parseInt(kasNominal.replace(/\D/g, "") || "0");
    if (!amount) return;
    const type = modalType;                 // capture before closeKasModal resets state
    const photo = kasPhoto;
    const ket = kasKet.trim();
    const label = ket || (type === "masuk" ? "Kas Masuk" : "Kas Keluar");
    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    // Optimistic UI
    setManual(prev => [{
      time: timeStr, label, desc: `${cashierName} · ${type}`,
      amount: type === "masuk" ? +amount : -amount, icon: type, photo: photo !== null,
    }, ...prev]);
    if (storeId && !isDemoMode) void persistKas({ amount, type, label, ket, photo });
    closeKasModal();
  }

  async function persistKas({ amount, type, label, ket, photo }:
    { amount: number; type: "masuk" | "keluar"; label: string; ket: string; photo: string | null }) {
    try {
      let photo_url: string | null = null;
      if (photo) {
        const blob = await (await fetch(photo)).blob();
        const path = `${storeId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("kas-photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (!error) photo_url = supabase.storage.from("kas-photos").getPublicUrl(path).data.publicUrl;
      }
      await supabase.from("kas_entries").insert({
        store_id: storeId, cashier_name: cashierName, shift: selectedShift,
        type, amount, label, description: ket || null, photo_url,
      });
      void logEvent(`kas.${type}`, `${type === "masuk" ? "Kas masuk" : "Kas keluar"} ${formatRp(amount)} — ${label}`);
    } catch { /* stays in optimistic UI; owner can re-add if it failed */ }
  }

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      <AppSidebar active="riwayat" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} showDemoBack />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Header + tabs */}
        <div className="px-5 lg:px-10 pt-5 lg:pt-7 pb-0 shrink-0">
          <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-0.5">LAPORAN · UANG KAS</p>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-serif text-[24px] lg:text-display-l font-medium text-navy leading-tight truncate">Uang Kas · {cashierName}</h1>
              <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#C9A55F" }} className="font-sans uppercase font-semibold mt-0.5">
                {selectedShiftName}{bukaTime ? ` · DIBUKA ${bukaTime}` : ""}
              </p>
            </div>
            <div className="flex gap-0.5 bg-cream-bg border border-warm-border rounded-[10px] p-0.5 shrink-0 mt-0.5">
              <button onClick={() => setScreen("riwayat")}
                className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Riwayat
              </button>
              <button className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-navy text-cream-text border-0">
                Kas
              </button>
              {/* Hutang tab stays reachable even when new bons are off — existing debts must stay visible. */}
              <button onClick={() => setScreen("hutang")}
                className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Hutang
              </button>
              <button onClick={() => setScreen("log")}
                className="px-3 lg:px-4 py-2 rounded-[8px] text-[12px] font-medium text-text-mute hover:text-navy transition-colors bg-transparent border-0 cursor-pointer">
                Log
              </button>
            </div>
          </div>
        </div>

        {/* Main content: two columns on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden">

          {/* Left column */}
          <div className="flex-1 lg:flex-none lg:w-[340px] flex flex-col gap-4 px-5 lg:px-10 pt-4 pb-4 lg:pb-0 overflow-auto">

            {/* Saldo card */}
            <div className="bg-navy rounded-card px-6 py-6">
              <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold/70 mb-2">SALDO LACI KAS</p>
              <p className="font-serif text-[38px] font-semibold text-cream-text leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatRp(saldo)}
              </p>
              <p className="text-[11px] text-white/40 mt-1.5">Modal awal {formatRp(modalAwal)} + omzet tunai</p>
              <div className="flex gap-5 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">MASUK</p>
                  <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>+ {formatRp(totalMasuk)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: "0.18em" }} className="font-sans uppercase text-white/40 mb-0.5">KELUAR</p>
                  <p className="text-[13px] font-medium text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>− {formatRp(kasKeluar)}</p>
                </div>
              </div>
            </div>

            {/* Kas Masuk / Kas Keluar — hidden entirely when the owner turns Kas off (Std+) */}
            {(!canKas || settings.kas) && (
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <button onClick={() => newKasOn && setShowMasuk(true)}
                  className={`w-full bg-[#5C9E7E14] border border-[#5C9E7E40] rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#3D7A5E] transition-colors ${newKasOn ? "hover:bg-[#5C9E7E20] cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                  Kas Masuk
                </button>
                {!canKas && <span style={{ position: "absolute", top: -7, right: 6, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>STD</span>}
              </div>
              <div className="relative flex-1">
                <button onClick={() => newKasOn && setShowKeluar(true)}
                  className={`w-full bg-[#C25E3D14] border border-[#C25E3D40] rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#C25E3D] transition-colors ${newKasOn ? "hover:bg-[#C25E3D20] cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                  Kas Keluar
                </button>
                {!canKas && <span style={{ position: "absolute", top: -7, right: 6, background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>STD</span>}
              </div>
            </div>
            )}

            {/* Mobile: tier banner + pergerakan */}
            <div className="lg:hidden">
              {!canKas && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed mb-3"
                  style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
                  <p className="text-[12px] text-navy">
                    <span className="font-semibold">Uang Kas</span>
                    <span className="text-text-mute"> tidak tersedia di Free · Upgrade Standard</span>
                  </p>
                  <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                    STANDARD
                  </span>
                </div>
              )}

              <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-2.5">PERGERAKAN HARI INI</p>
              <div className="bg-white border border-warm-border rounded-card overflow-hidden">
                {pergerakan.map((p, i) => {
                  const settle = p.icon === "hutang_settle";
                  const accent = settle ? "#A6843F" : p.amount > 0 ? "#5C9E7E" : "#C25E3D";
                  return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < pergerakan.length - 1 ? "border-b border-[#F2EDE3]" : ""}`}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}1F` }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                        {p.amount > 0 ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-navy flex items-center gap-1.5">
                        <span className="truncate">{p.label}</span>
                        {settle && <span className="shrink-0 uppercase font-bold rounded px-1 py-0.5" style={{ fontSize: 7.5, letterSpacing: "0.08em", color: "#A6843F", background: "rgba(201,165,95,0.14)" }}>Bukan omzet</span>}
                      </div>
                      <div className="text-[10.5px] text-text-mute mt-0.5">{p.time} · {p.desc}</div>
                    </div>
                    {p.photo && <PhotoThumb size="sm" />}
                    <span className="font-serif text-[13px] font-semibold shrink-0" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>
                      {p.amount > 0 ? "+" : "−"}{formatRp(Math.abs(p.amount))}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: pergerakan (desktop only) */}
          <div className="hidden lg:flex flex-1 flex-col min-w-0 overflow-hidden pt-4 pb-0 pr-10">

            {/* Tier banner: Free locked / Premium mandatory photo */}
            {!canKas ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-card border border-dashed mb-4 shrink-0"
                style={{ borderColor: "rgba(201,165,95,0.45)", background: "rgba(201,165,95,0.06)" }}>
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M18.36 6.64A9 9 0 115.64 19.36M2 12h2M20 12h2M12 2v2M12 20v2" /></svg>
                  <p className="text-[12.5px] text-navy">
                    <span className="font-semibold">Uang Kas</span>
                    <span className="text-text-mute"> tidak tersedia di Free · Upgrade Standard untuk mencatat kas masuk/keluar.</span>
                  </p>
                </div>
                <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>STANDARD</span>
              </div>
            ) : requiresPhoto ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-dashed mb-4 shrink-0"
                style={{ borderColor: "rgba(92,158,126,0.4)", background: "rgba(92,158,126,0.06)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C9E7E" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <p className="text-[12.5px] text-navy">
                  <span className="font-semibold">Foto bukti wajib</span>
                  <span className="text-text-mute"> · Setiap kas masuk/keluar harus disertai foto bukti.</span>
                </p>
              </div>
            ) : null}

            <p style={{ fontSize: 10, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-3 shrink-0">PERGERAKAN HARI INI</p>

            <div className="flex-1 overflow-auto">
              <div className="bg-white border border-warm-border rounded-card overflow-hidden">
                {pergerakan.map((p, i) => {
                  const settle = p.icon === "hutang_settle";
                  const accent = settle ? "#A6843F" : p.amount > 0 ? "#5C9E7E" : "#C25E3D";
                  return (
                  <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i < pergerakan.length - 1 ? "border-b border-[#F2EDE3]" : ""}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}14` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                        {p.amount > 0 ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-navy flex items-center gap-2">
                        <span className="truncate">{p.label}</span>
                        {settle && <span className="shrink-0 uppercase font-bold rounded px-1.5 py-0.5" style={{ fontSize: 8, letterSpacing: "0.08em", color: "#A6843F", background: "rgba(201,165,95,0.14)" }}>Bukan omzet</span>}
                      </div>
                      <div className="text-[11px] text-text-mute mt-0.5">{p.time} · {p.desc}</div>
                    </div>
                    {p.photo && <PhotoThumb size="md" />}
                    <span className="font-serif text-[15px] font-semibold shrink-0" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>
                      {p.amount > 0 ? "+" : "−"}{formatRp(Math.abs(p.amount))}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Pindah Shift + Tutup Toko */}
        <div className="flex gap-2.5 px-5 lg:px-10 py-4 shrink-0 border-t border-warm-border bg-cream-bg">
          {settings.gantiShift && (
          <button onClick={() => setScreen("pindah-shift")}
            className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-navy hover:border-navy/40 transition-colors cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6" /></svg>
            Pindah Shift
          </button>
          )}
          <button onClick={() => setScreen("tutup-toko")}
            className="flex-1 bg-navy border-0 rounded-card h-[46px] flex items-center justify-center gap-2 text-[13px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2"><path d="M18.36 6.64A9 9 0 115.64 19.36M2 12h2M20 12h2M12 2v2M12 20v2" /></svg>
            Tutup Toko
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={kasCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleKasFile} />
      <input ref={kasGallery} type="file" accept="image/*" className="hidden" onChange={handleKasFile} />

      {/* Kas Masuk / Kas Keluar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeKasModal} />
          <div className="relative bg-white w-full lg:max-w-[420px] lg:mx-4 rounded-t-[20px] lg:rounded-card flex flex-col shadow-xl">

            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-warm-border">
              <div>
                <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">UANG KAS</p>
                <h3 className={`font-serif text-[20px] font-medium leading-tight ${modalType === "masuk" ? "text-[#3D7A5E]" : "text-[#C25E3D]"}`}>
                  {modalType === "masuk" ? "Kas Masuk" : "Kas Keluar"}
                </h3>
              </div>
              <button onClick={closeKasModal} className="w-8 h-8 rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-bg transition-colors border-0 bg-transparent cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Nominal */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">NOMINAL <span className="text-warning">*</span></span>
                </label>
                <div className="flex items-center bg-cream-bg border rounded-button px-4 h-[50px] gap-2 transition-colors"
                  style={{ borderColor: kasNominal ? (modalType === "masuk" ? "#3D7A5E" : "#C25E3D") : "#ECE7DD" }}>
                  <span className="font-serif text-[16px] text-text-mute font-medium shrink-0">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kasNominal}
                    onChange={e => setKasNominal(formatIDRInput(e.target.value))}
                    placeholder="0"
                    autoFocus
                    className="flex-1 bg-transparent border-0 outline-none font-serif text-[20px] text-navy"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">KETERANGAN <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span></span>
                </label>
                <input
                  value={kasKet}
                  onChange={e => setKasKet(e.target.value)}
                  placeholder={modalType === "masuk" ? "Modal tambahan, setoran..." : "Supplier, parkir, operasional..."}
                  className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[44px] text-[13.5px] text-navy outline-none placeholder:text-text-mute"
                />
              </div>

              {/* Foto bukti */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">
                    FOTO BUKTI{" "}
                    {requiresPhoto
                      ? <span style={{ fontSize: 8, color: "#C25E3D", textTransform: "none" as const, letterSpacing: 0 }}>* wajib</span>
                      : <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span>
                    }
                  </span>
                </div>
                {kasPhoto ? (
                  <div className="flex items-center gap-3">
                    <img src={kasPhoto} alt="Preview" className="w-[60px] h-[60px] rounded-[8px] object-cover border border-warm-border shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => kasGallery.current?.click()} className="text-[12px] text-navy font-medium underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-left">Ganti foto</button>
                      <button onClick={() => setKasPhoto(null)} className="text-[12px] text-text-mute hover:text-navy bg-transparent border-0 p-0 cursor-pointer text-left">Hapus foto</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => kasCamera.current?.click()}
                      className="flex items-center justify-center gap-2 bg-cream-bg border border-warm-border rounded-card h-[42px] text-[12px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <Camera size={14} strokeWidth={1.8} className="text-text-mute" />
                      Kamera
                    </button>
                    <button onClick={() => kasGallery.current?.click()}
                      className="flex items-center justify-center gap-2 bg-cream-bg border border-warm-border rounded-card h-[42px] text-[12px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                      <ImageIcon size={14} strokeWidth={1.8} className="text-text-mute" />
                      Galeri
                    </button>
                  </div>
                )}
                {requiresPhoto && !kasPhoto && <p className="text-[10.5px] text-[#C25E3D] mt-1.5">Foto bukti wajib dilampirkan untuk Premium ke atas.</p>}
              </div>
            </div>

            <div className="px-6 pb-7 pt-3 border-t border-warm-border flex gap-2.5">
              <button onClick={closeKasModal}
                className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 transition-colors cursor-pointer">
                Batal
              </button>
              <button
                disabled={!kasNominal || (requiresPhoto && !kasPhoto)}
                onClick={handleKasConfirm}
                className={`flex-1 rounded-card h-[46px] text-[13px] font-semibold border-0 transition-opacity ${kasNominal && !(requiresPhoto && !kasPhoto)
                  ? `${modalType === "masuk" ? "bg-[#3D7A5E]" : "bg-[#C25E3D]"} text-white hover:opacity-90 cursor-pointer`
                  : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                Catat {modalType === "masuk" ? "Kas Masuk" : "Kas Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
