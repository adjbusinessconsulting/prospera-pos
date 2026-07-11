import { useState, useEffect, useRef } from "react";
import { ChevronLeft, QrCode, CheckCircle2, XCircle, Loader2, Clock, Lock } from "lucide-react";
import { useStore, getTotal, getItemCount, getTrxId, isAtLeast } from "../store";
import { formatRp } from "../data";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../lib/supabase";
import { logEvent } from "../lib/auditlog";

const METHODS = [
  {
    id: "tunai", label: "Tunai", sub: "Cash di laci",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>,
  },
  {
    id: "qris", label: "QRIS", sub: "Scan & bayar",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3v1M17 17v4"/></svg>,
  },
  {
    id: "debit", label: "Debit / Kartu", sub: "EDC mesin",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>,
  },
  {
    id: "ewallet", label: "E-Wallet", sub: "GoPay · OVO · DANA",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg>,
  },
  {
    id: "hutang", label: "Hutang / Bon", sub: "Bayar nanti",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/></svg>,
  },
  {
    id: "transfer", label: "Transfer Bank", sub: "BCA · BRI · Mandiri",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>,
  },
];

const QUICK = [50000, 100000, 200000, 500000];

type QrisState = "idle" | "loading" | "show" | "confirmed" | "error";

export default function Payment() {
  const {
    cart, paymentMethod, cashReceived, cashierName, cashierInitials,
    trxCounter, storeId, storeTier, isDemoMode, qrisImageUrl, midtransClientKey,
    setPaymentMethod, setCashReceived, setScreen, signOut, setHutangCustomer, addDemoHutang,
  } = useStore();

  // Hutang customer capture
  const [showHutangModal, setShowHutangModal] = useState(false);
  const [hutangName, setHutangName] = useState("");
  const [hutangPhone, setHutangPhone] = useState("");
  const [recentCustomers, setRecentCustomers] = useState<{ name: string; phone: string | null }[]>([]);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    supabase.from("customers").select("name,phone").eq("store_id", storeId).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => { if (!cancelled) setRecentCustomers((data ?? []) as { name: string; phone: string | null }[]); });
    return () => { cancelled = true; };
  }, [storeId]);
  function confirmHutang() {
    const name = hutangName.trim();
    if (!name) return;
    const phone = hutangPhone.trim();
    // Hutang is all-or-nothing: the full cart amount is owed and later settled
    // in ONE full pelunasan (no down-payment, no installments).
    setHutangCustomer({ name, phone, paidNow: 0 });
    // Record the debt NOW (so Buku Hutang reflects it) — not tied to tapping
    // "Transaksi Baru" later. Demo keeps it in memory; real store writes to DB.
    if (isDemoMode) {
      addDemoHutang({ id: `dh-${Date.now()}`, customer_name: name, phone: phone || null, amount: total, paid_amount: 0, status: "open", cashier_name: cashierName, created_at: new Date().toISOString(), trx_id: trxId });
    } else if (storeId) {
      void recordHutangDB(name, phone, total, trxId);
    }
    setShowHutangModal(false);
    setScreen("receipt");
  }

  async function recordHutangDB(name: string, phone: string, amount: number, trx_id: string) {
    try {
      let customer_id: string | null = null;
      if (phone) {
        const { data } = await supabase.from("customers").select("id").eq("store_id", storeId).eq("phone", phone).limit(1).maybeSingle();
        customer_id = (data as { id?: string } | null)?.id ?? null;
      }
      if (!customer_id) {
        const { data } = await supabase.from("customers").insert({ store_id: storeId, name, phone: phone || null }).select("id").single();
        customer_id = (data as { id?: string } | null)?.id ?? null;
      }
      await supabase.from("hutang").insert({
        store_id: storeId, sale_id: null, trx_id, customer_id, customer_name: name, phone: phone || null,
        amount, paid_amount: 0, status: "open", settled_at: null, cashier_name: cashierName,
      });
      void logEvent("hutang.add", `Hutang baru ${name} ${formatRp(amount)} (${trx_id})`);
    } catch { /* non-fatal */ }
  }

  // Demo mode shows all features (no storeId = demo)
  const effectiveTier = storeId ? storeTier : 'free';

  function methodLock(id: string): { locked: boolean; badge?: string; tierLabel?: string } {
    if (id === 'debit' || id === 'ewallet') {
      return isAtLeast(effectiveTier, 'premium')
        ? { locked: false }
        : { locked: true, badge: 'PRE', tierLabel: 'Premium' };
    }
    if (id === 'hutang') {
      return isAtLeast(effectiveTier, 'standard')
        ? { locked: false }
        : { locked: true, badge: 'STD', tierLabel: 'Standard' };
    }
    return { locked: false };
  }

  const total = getTotal(cart);
  const itemCount = getItemCount(cart);
  const change = cashReceived - total;
  const trxId = getTrxId(trxCounter);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // QRIS overlay state
  const [qrisState, setQrisState] = useState<QrisState>("idle");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrisError, setQrisError] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect QRIS mode. Dynamic Midtrans (auto-confirm, needs a Midtrans account)
  // is PREMIUM-only; Free/Standard use the static QRIS image uploaded in settings.
  const hasMidtrans = Boolean(midtransClientKey) && isAtLeast(effectiveTier, "premium");
  const hasStatic = Boolean(qrisImageUrl);
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const qrisMode: "midtrans" | "static" | "none" = (hasMidtrans && !useStaticFallback)
    ? "midtrans"
    : hasStatic
    ? "static"
    : "none";

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // Countdown timer for Midtrans QR
  useEffect(() => {
    if (qrisState !== "show" || !expiresAt || qrisMode !== "midtrans") return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        stopPolling();
        setQrisState("error");
        setQrisError("QR sudah kadaluarsa. Coba lagi.");
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrisState, expiresAt, qrisMode]);

  // Poll qris_payments table every 4s for Midtrans mode
  function startPolling(orderId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("qris_payments")
          .select("status")
          .eq("order_id", orderId)
          .single();
        if (data?.status === "paid") {
          stopPolling();
          setQrisState("confirmed");
          setTimeout(() => setScreen("receipt"), 1200);
        }
      } catch {
        // silent fail, keep polling
      }
    }, 4000);
  }

  async function handleSelesaikan() {
    if (paymentMethod === "hutang") {
      setShowHutangModal(true);   // capture who owes before finishing
      return;
    }
    if (paymentMethod !== "qris") {
      setScreen("receipt");
      return;
    }

    if (qrisMode === "none") {
      setQrisState("show"); // will show "not configured" message
      return;
    }

    if (qrisMode === "static") {
      setQrisState("show");
      return;
    }

    // Midtrans: generate dynamic QR
    setQrisState("loading");
    setQrisError("");
    const orderId = `QRIS-${storeId.slice(0, 8)}-${Date.now()}`;
    try {
      const { data, error } = await supabase.functions.invoke("create-qris", {
        body: { store_id: storeId, amount: total, order_id: orderId },
      });

      if (error || !data?.ok) {
        setQrisError(data?.error || "Gagal membuat QR. Coba lagi atau gunakan QRIS statis.");
        setQrisState("error");
        return;
      }

      setQrImageUrl(data.qr_url ?? null);
      setExpiresAt(new Date(data.expires_at));
      setTimeLeft(15 * 60);
      setQrisState("show");
      startPolling(orderId);
    } catch {
      setQrisError("Koneksi bermasalah. Coba lagi.");
      setQrisState("error");
    }
  }

  function handleCancelQris() {
    stopPolling();
    setQrisState("idle");
    setQrImageUrl(null);
    setQrisError("");
    setExpiresAt(null);
    setUseStaticFallback(false);
  }

  function handleManualConfirm() {
    stopPolling();
    setQrisState("confirmed");
    setTimeout(() => setScreen("receipt"), 800);
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="w-full h-full flex flex-col animate-screen-in bg-cream-bg">
      {/* Top bar */}
      <AppSidebar active="sales" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} />

      {/* Content row: order summary + payment area */}
      <div className="flex-1 flex min-h-0">

      {/* Desktop: order summary left panel */}
      <div className="hidden lg:flex w-[400px] bg-white border-r border-warm-border flex-col shrink-0">
        <div className="px-7 pt-7 pb-5 border-b border-warm-border shrink-0">
          <button onClick={() => setScreen("sales")}
            className="flex items-center gap-1.5 text-[12px] text-text-mute mb-5 bg-transparent border-0 p-0 hover:text-navy transition-colors">
            <ChevronLeft size={14} strokeWidth={2} />
            Kembali ke keranjang
          </button>
          <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute mb-1">RINGKASAN PESANAN</p>
          <h2 className="font-serif text-[24px] font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{trxId}</h2>
          <p className="text-[12px] text-text-mute mt-0.5">Kasir: {cashierName} · {timeStr}</p>
        </div>

        <div className="flex-1 overflow-auto px-7 py-5">
          {cart.length === 0 && <p className="text-center text-text-mute text-[13px] py-8">Keranjang kosong</p>}
          {cart.map(item => (
            <div key={item.product.id} className="flex gap-3 py-3 border-b border-[#F2EDE3]">
              <div className="w-10 h-10 rounded-thumb flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #F2EDE3 0%, #E8DFC9 100%)" }}>
                <span className="text-[20px] leading-none">{item.product.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-navy">{item.product.name}</div>
                <div className="text-[11px] text-text-mute mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.qty} × Rp {item.product.price.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="font-serif text-[15px] font-semibold text-navy shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                {(item.product.price * item.qty).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>

        <div className="px-7 py-5 border-t border-warm-border bg-cream-bg shrink-0">
          <div className="flex justify-between text-[12.5px] text-text-mute mb-1.5">
            <span>{itemCount} item</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-text-mute mb-3">
            <span>Diskon</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>− Rp 0</span>
          </div>
          <div className="flex justify-between items-end pt-3 border-t border-dashed border-warm-dashed">
            <span style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-text-mute">TOTAL TAGIHAN</span>
            <span className="font-serif text-[26px] font-semibold text-navy leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
          </div>
        </div>
      </div>

      {/* Right: payment method + math */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile: back button + header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0 lg:px-10 lg:pt-8">
          <div>
            <button onClick={() => setScreen("sales")}
              className="lg:hidden flex items-center gap-1.5 text-[12px] text-text-mute mb-3 bg-transparent border-0 p-0 hover:text-navy transition-colors">
              <ChevronLeft size={14} strokeWidth={2} />
              Kembali ke keranjang
            </button>
            <p style={{ fontSize: 10, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold mb-1">LANGKAH 2 · BAYAR</p>
            <h1 className="font-serif text-display-l font-medium text-navy">Bagaimana pelanggan bayar?</h1>
          </div>
        </div>

        {/* Method tiles — 3-col desktop, 2-col mobile */}
        <div className="flex-1 overflow-auto px-5 lg:px-10 pt-5 pb-5">
          <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-3">METODE PEMBAYARAN</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {METHODS.map(m => {
              const { locked, badge, tierLabel } = methodLock(m.id);
              const active = !locked && paymentMethod === m.id;
              return (
                <div key={m.id}
                  onClick={() => { if (!locked) setPaymentMethod(m.id); }}
                  className={`bg-white rounded-method p-4 relative border transition-all ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${active ? "border-navy border-[1.5px] shadow-method" : "border-warm-border"} ${!locked && !active ? "hover:border-navy/30" : ""}`}>
                  {badge && (
                    <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(201,165,95,0.10)", border: "1px solid rgba(201,165,95,0.30)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.12em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>
                      {badge}
                    </span>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center ${active ? "bg-navy text-gold" : "bg-cream-pill text-navy"}`}>
                      {locked ? <Lock size={18} className="text-text-mute" /> : m.icon}
                    </div>
                    <div className={`w-[17px] h-[17px] rounded-full border flex items-center justify-center shrink-0 ${badge ? "mt-4" : ""} ${active ? "bg-navy border-navy" : "border-warm-dashed"}`}>
                      {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                  </div>
                  <div className="text-[13.5px] font-semibold text-navy mb-0.5">{m.label}</div>
                  <div className="text-[11px] text-text-mute">{locked && tierLabel ? `Upgrade ke ${tierLabel}` : m.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Math card — in-flow at the bottom of the payment column (scrolls above it) */}
        <div className="relative bg-white border-t border-warm-border px-5 lg:px-10 pt-4 shrink-0"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>

          {paymentMethod === "tunai" && (
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-2">
                <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">TUNAI DITERIMA</p>
                <button onClick={() => setCashReceived(total)} className="text-[11px] text-text-mute underline underline-offset-[3px] bg-transparent border-0 p-0">PAS</button>
              </div>
              <div className="bg-cream-bg border-[1.5px] border-navy rounded-button px-4 py-3 flex items-center gap-2 mb-2.5">
                <span className="font-serif text-[18px] text-text-mute font-medium leading-none shrink-0">Rp</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-serif text-[22px] font-semibold text-navy leading-none flex-1">{cashReceived.toLocaleString("id-ID")}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {QUICK.map(a => (
                  <button key={a} onClick={() => setCashReceived(a)}
                    className={`rounded-chip py-1.5 text-[11px] font-medium border transition-colors ${cashReceived === a ? "bg-navy text-cream-text border-navy" : "bg-cream-bg text-navy border-warm-border"}`}>
                    {cashReceived === a ? `${a >= 1000 ? a/1000 + "rb" : a}` : `+${a >= 1000 ? a/1000 + "rb" : a}`}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p style={{ fontSize: 10, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">KEMBALIAN</p>
                <span className={`font-serif text-[20px] font-semibold leading-none ${change >= 0 ? "text-success" : "text-warning"}`}>
                  {change >= 0 ? formatRp(change) : `−${formatRp(-change)}`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">TOTAL</p>
              <span className="font-serif text-[22px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
            </div>
            <button
              onClick={handleSelesaikan}
              disabled={qrisState === "loading"}
              className="flex-1 bg-navy rounded-card h-[50px] flex items-center justify-center gap-3 text-cream-text text-[14px] font-semibold tracking-[0.02em] hover:opacity-90 transition-opacity disabled:opacity-60">
              {qrisState === "loading" ? (
                <><Loader2 size={16} className="animate-spin" /> Membuat QR…</>
              ) : (
                <><span>SELESAIKAN · {formatRp(total)}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      </div>{/* end content row */}

      {/* ═══════════════════════════════════════════════════════════
          QRIS OVERLAY
          Shown when paymentMethod === "qris" and user taps SELESAIKAN
      ═══════════════════════════════════════════════════════════ */}
      {(qrisState === "show" || qrisState === "confirmed" || qrisState === "error") && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(11,17,41,0.80)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelQris(); }}
        >
          <div style={{
            background: "white", borderRadius: 24,
            width: "100%", maxWidth: 420,
            boxShadow: "0 24px 80px rgba(11,17,41,0.24)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ background: "#0B1129", padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#C9A55F", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                  {qrisMode === "midtrans" ? "QRIS · AUTO KONFIRMASI" : "QRIS · KONFIRMASI MANUAL"}
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 500, color: "#f8f6ef" }}>
                  {formatRp(total)}
                </div>
              </div>
              <button
                onClick={handleCancelQris}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8f9cb3" }}>
                <XCircle size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px" }}>

              {/* Not configured */}
              {qrisMode === "none" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <QrCode size={40} color="#c8c0b0" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#14203a", marginBottom: 6 }}>QRIS belum dikonfigurasi</p>
                  <p style={{ fontSize: 12.5, color: "#8f897a", lineHeight: 1.6 }}>
                    Minta pemilik toko untuk mengatur QRIS di Backoffice → Pengaturan.
                  </p>
                </div>
              )}

              {/* Static mode: show image */}
              {qrisMode === "static" && qrisState === "show" && (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ width: 240, height: 240, background: "#f6f3ea", borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e8e3d5" }}>
                      <img
                        src={qrisImageUrl}
                        alt="QRIS"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={e => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = "none";
                          t.parentElement!.innerHTML = '<div style="text-align:center;padding:20px;color:#8f897a;font-size:12px">Gambar tidak dapat dimuat</div>';
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ textAlign: "center", fontSize: 12, color: "#8f897a", marginBottom: 20, lineHeight: 1.6 }}>
                    Minta pelanggan scan QR ini lalu konfirmasi setelah pembayaran berhasil.
                  </p>
                  <button
                    onClick={handleManualConfirm}
                    style={{
                      width: "100%", height: 52, background: "#14203a", color: "#f8f6ef",
                      border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
                      letterSpacing: "0.04em", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", gap: 10,
                    }}>
                    <CheckCircle2 size={17} color="#C9A55F" />
                    Sudah Dibayar ✓
                  </button>
                </>
              )}

              {/* Midtrans mode: dynamic QR */}
              {qrisMode === "midtrans" && qrisState === "show" && (
                <>
                  {/* Countdown */}
                  {timeLeft > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      <Clock size={13} color="#8f897a" />
                      <span style={{ fontSize: 12, color: "#8f897a" }}>QR aktif selama</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: timeLeft < 60 ? "#c25e3d" : "#14203a", fontFamily: "monospace" }}>
                        {formatCountdown(timeLeft)}
                      </span>
                    </div>
                  )}

                  {/* QR Image */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ width: 240, height: 240, background: "#f6f3ea", borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e8e3d5", position: "relative" }}>
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="QRIS Dinamis"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", padding: 20 }}>
                          <Loader2 size={28} color="#b8934a" style={{ margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
                          <p style={{ fontSize: 11, color: "#8f897a" }}>Memuat QR…</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5C9E7E", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <p style={{ fontSize: 12.5, color: "#8f897a" }}>Menunggu konfirmasi pembayaran…</p>
                  </div>

                  <div style={{ padding: "10px 14px", background: "#fdf8ee", border: "1px solid #edd99a", borderRadius: 10, fontSize: 11.5, color: "#7c6430", textAlign: "center", marginBottom: 8 }}>
                    Konfirmasi otomatis saat pelanggan selesai bayar
                  </div>
                </>
              )}

              {/* Confirmed (auto or manual) */}
              {qrisState === "confirmed" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <CheckCircle2 size={52} color="#5C9E7E" style={{ margin: "0 auto 14px" }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#14203a", marginBottom: 6 }}>Pembayaran Diterima!</p>
                  <p style={{ fontSize: 12.5, color: "#8f897a" }}>Mencetak struk…</p>
                </div>
              )}

              {/* Error */}
              {qrisState === "error" && (
                <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                  <XCircle size={40} color="#c25e3d" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#14203a", marginBottom: 6 }}>Gagal</p>
                  <p style={{ fontSize: 12.5, color: "#8f897a", lineHeight: 1.6, marginBottom: 20 }}>{qrisError}</p>
                  {hasStatic && (
                    <button
                      onClick={() => { setUseStaticFallback(true); setQrisState("show"); setQrisError(""); }}
                      style={{ width: "100%", height: 46, background: "#f6f3ea", color: "#14203a", border: "1px solid #e8e3d5", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
                      Gunakan QRIS Statis
                    </button>
                  )}
                  <button
                    onClick={handleCancelQris}
                    style={{ width: "100%", height: 46, background: "transparent", color: "#8f897a", border: "1px solid #e8e3d5", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
                    Kembali
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hutang: capture customer name / WhatsApp */}
      {showHutangModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHutangModal(false)} />
          <div className="relative bg-white w-full lg:max-w-[400px] lg:mx-4 rounded-t-[20px] lg:rounded-card shadow-xl">
            <div className="px-6 pt-5 pb-4 border-b border-warm-border">
              <p style={{ fontSize: 9.5, letterSpacing: "0.2em" }} className="font-sans uppercase text-text-mute mb-0.5">HUTANG / BON</p>
              <h3 className="font-serif text-[20px] font-medium text-navy leading-tight">Siapa yang berhutang?</h3>
              <p className="text-[12px] text-text-mute mt-1">Rp {new Intl.NumberFormat("id-ID").format(total)} akan dicatat di Buku Hutang.</p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {recentCustomers.length > 0 && (
                <div>
                  <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">PELANGGAN TERAKHIR</span></label>
                  <div className="flex flex-wrap gap-2">
                    {recentCustomers.map((c, i) => (
                      <button key={i} type="button" onClick={() => { setHutangName(c.name); setHutangPhone(c.phone ?? ""); }}
                        className="h-8 px-3 rounded-full border border-warm-border bg-cream-bg text-[12px] text-navy hover:border-navy/40 cursor-pointer whitespace-nowrap">
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">NAMA PELANGGAN <span className="text-warning">*</span></span></label>
                <input value={hutangName} onChange={e => setHutangName(e.target.value)} autoFocus placeholder="mis. Bu Sari"
                  className="w-full bg-cream-bg border rounded-button px-4 h-[48px] text-[14px] text-navy outline-none placeholder:text-text-mute"
                  style={{ borderColor: hutangName.trim() ? "#3D7A5E" : "#ECE7DD" }} />
              </div>
              <div>
                <label className="block mb-2"><span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">WHATSAPP <span style={{ fontSize: 8, color: "#B0A99A", textTransform: "none" as const, letterSpacing: 0 }}>(opsional)</span></span></label>
                <input value={hutangPhone} onChange={e => setHutangPhone(e.target.value)} inputMode="tel" placeholder="0812-xxxx-xxxx"
                  className="w-full bg-cream-bg border border-warm-border rounded-button px-4 h-[44px] text-[13.5px] text-navy outline-none placeholder:text-text-mute" />
              </div>

              {/* Total bon — owed in full, settled later in one pelunasan */}
              <div className="border-t border-dashed border-warm-dashed pt-4">
                <div className="flex justify-between items-baseline">
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute">TOTAL BON</span>
                  <span className="font-serif text-[22px] font-bold text-[#C25E3D]" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
                </div>
                <p className="text-[11px] text-text-mute mt-2 leading-relaxed">Seluruh jumlah dicatat sebagai hutang. Dilunasi sekaligus nanti di <b className="text-navy">Buku Hutang</b>.</p>
              </div>
            </div>
            <div className="px-6 pb-7 pt-3 border-t border-warm-border flex gap-2.5">
              <button onClick={() => setShowHutangModal(false)} className="flex-1 bg-cream-bg border border-warm-border rounded-card h-[46px] text-[13px] font-medium text-navy hover:border-navy/40 cursor-pointer">Batal</button>
              <button disabled={!hutangName.trim()} onClick={confirmHutang}
                className={`flex-1 rounded-card h-[46px] text-[13px] font-semibold border-0 ${hutangName.trim() ? "bg-navy text-cream-text hover:opacity-90 cursor-pointer" : "bg-navy/20 text-navy/40 cursor-not-allowed"}`}>
                Catat Hutang
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
