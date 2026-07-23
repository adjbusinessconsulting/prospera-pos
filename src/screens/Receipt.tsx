import { useState } from "react";
import { useStore, getTotal, getTrxId, isAtLeast, localDateISO } from "../store";
import { formatRp } from "../data";
import { Printer, Check, ChevronLeft } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { recordSale } from "../lib/sync";
import { logEvent } from "../lib/auditlog";
import { printReceipt as sendToPrinter, loadPrinterConfig } from "../lib/printer";

function SterithWatermark({ tier }: { tier: string }) {
  // Branding ladder (July 11):
  //  Free     → store name (shown above) + "powered by Sterith Business Consulting", no logo
  //  Standard → own logo + "Powered by Sterith Business Consulting POS"
  //  Premium  → own logo, NO Sterith branding (full white-label)
  if (isAtLeast(tier, 'premium')) return null;
  const isStandard = isAtLeast(tier, 'standard');
  return (
    <div style={{ background: "#FAFAF7", border: "1px solid #ECE7DD", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mark-gold-512.png" alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0, opacity: 0.85 }} />
      <div style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif", fontSize: 8.5, letterSpacing: "0.09em", color: "#A6843F", textTransform: "uppercase", lineHeight: 1.3 }}>
        {isStandard ? "Powered by Sterith Business Consulting POS" : "Powered by Sterith Business Consulting"}
      </div>
    </div>
  );
}

export default function Receipt() {
  const { cart, cashReceived, cashierName, cashierInitials, selectedShift, selectedShiftName, trxCounter, paymentMethod, selectedCashier, storeId, storeName, storeAddress, storePhone, storeTier, isDemoMode, inventoryEnabled, receiptLogo, products, hutangCustomer, settings, updateProduct, setHutangCustomer, restart, setScreen, signOut } = useStore();
  const effectiveTier = storeId ? storeTier : 'free';
  const inventoryOn = isAtLeast(effectiveTier, 'premium') && inventoryEnabled;
  const waTierOk = isAtLeast(effectiveTier, 'standard');
  const canWhatsApp = waTierOk;                              // clickable when tier allows
  const showWhatsApp = !waTierOk || settings.whatsappShare;  // Free sees upsell; Std+ only if enabled
  const canBranding = isAtLeast(effectiveTier, 'standard') && settings.receiptLogo;
  const canPrint = settings.printReceipt;

  const [printMsg, setPrintMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function handlePrint() {
    setPrintMsg(null);
    const paper = loadPrinterConfig()?.paper ?? 58;
    try {
      await sendToPrinter({
        storeName: storeName || "Toko", storeAddress, storePhone,
        trxId, dateStr, timeStr, cashierName,
        items: cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
        total, method: paymentMethod, cashReceived, change,
        hutangName: hutangCustomer?.name, footer: "Terima kasih, sampai jumpa lagi",
      }, paper);
      setPrintMsg({ ok: true, text: "Struk tercetak." });
    } catch {
      // Never block the sale — the on-screen struk is the fallback.
      setPrintMsg({ ok: false, text: "Printer tidak terhubung. Struk tampil di layar. Atur printer di Pengaturan." });
    }
  }
  const total = getTotal(cart);
  const change = cashReceived - total;
  const trxId = getTrxId(trxCounter);
  const nextTrxId = getTrxId(trxCounter + 1);

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  function handleNewTrx() {
    // Queue the sale — works offline; the sync engine replays it (sales, sale_items,
    // and stock deltas) to Supabase on reconnect. Demo doesn't persist.
    if (storeId && !isDemoMode) {
      recordSale({
        id: crypto.randomUUID(),
        store_id: storeId,
        trx_id: trxId,
        cashier_id: selectedCashier,
        cashier_name: cashierName,
        shift: selectedShift,
        total,
        payment_method: paymentMethod,
        cash_received: cashReceived,
        change_amount: change,
        created_at: new Date().toISOString(),
        items: cart.map(i => ({
          id: crypto.randomUUID(),
          product_id: i.product.id,
          product_name: i.product.name,
          price: i.product.price,
          qty: i.qty,
          subtotal: i.product.price * i.qty,
        })),
        stock: inventoryOn ? cart.map(i => ({ id: i.product.id, qty: i.qty })) : [],
      });
      // Log the sale on-device (mirror=false — sales already live in the sales
      // table + Backoffice analytics; mirroring each would flood the server log).
      const mLabel: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", hutang: "Hutang/Bon" };
      const itemCount = cart.reduce((n, i) => n + i.qty, 0);
      void logEvent("sale", `Penjualan ${trxId} — ${formatRp(total)} · ${mLabel[paymentMethod] ?? paymentMethod} · ${itemCount} item`, false);
    }
    // Basic Inventori: reflect terjual/sisa locally right away (immediate UI).
    if (inventoryOn) {
      const today = localDateISO();
      cart.forEach(i => {
        const p = products.find(x => x.id === i.product.id);
        if (!p) return;
        updateProduct(i.product.id, { stock: (p.stock ?? 0) - i.qty, stockTerjual: (p.stockTerjual ?? 0) + i.qty, stockDate: today });
      });
    }
    // (Hutang is recorded at checkout confirm in Payment.tsx, not here.)
    setHutangCustomer(null);
    restart();
  }

  // Real store shows its own details; the demo placeholders apply only in demo mode
  // (never print the fake "Jl. Diponegoro" address / demo phone on a real struk).
  const displayName = storeName || (isDemoMode ? "Toko Sembako Maju" : "Toko");
  const displayAddress = storeAddress || (isDemoMode ? "Jl. Diponegoro No. 24, Palu Timur" : "");
  const displayPhone = storePhone || (isDemoMode ? "0812-3456-7890" : "");

  const waMessage =
    `*Struk dari ${displayName}*\nNo: ${trxId}\nTanggal: ${dateStr} ${timeStr}\n\n` +
    cart.map(i => `${i.product.name} x${i.qty}  ${formatRp(i.product.price * i.qty)}`).join("\n") +
    `\n\nTotal: ${formatRp(total)}\nTerima kasih!`;
  const waText = encodeURIComponent(waMessage);

  // Render the struk as a receipt-style PNG so it can be shared as a picture
  // (not just text). Drawn on a canvas — no external library needed.
  function buildReceiptImage(): Blob | Promise<Blob | null> | null {
    const W = 380, pad = 22;
    const notPremium = !isAtLeast(effectiveTier, "premium");
    let h = pad + 26 + 34 + 24 + 3 * 18 + 24 + cart.length * 22 + 24 + 30
      + (paymentMethod === "tunai" ? 3 : 1) * 18 + 26 + (notPremium ? 44 : 0) + pad;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale; canvas.height = Math.ceil(h) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, h);
    ctx.textBaseline = "top";
    const divider = (yy: number) => { ctx.strokeStyle = "#E2DDD0"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke(); ctx.setLineDash([]); };
    const clip = (s: string, max: number) => { let t = s; while (ctx.measureText(t).width > max && t.length > 1) t = t.slice(0, -1); return t === s ? s : t.slice(0, -1) + "…"; };
    let y = pad;
    ctx.fillStyle = "#0D1117"; ctx.textAlign = "center";
    ctx.font = "600 20px Georgia, serif"; ctx.fillText(clip(displayName, W - pad * 2), W / 2, y); y += 28;
    ctx.fillStyle = "#6b6b6b"; ctx.font = "400 11px Arial, sans-serif";
    if (displayAddress) { ctx.fillText(clip(displayAddress, W - pad * 2), W / 2, y); y += 16; }
    if (displayPhone) { ctx.fillText("WhatsApp " + displayPhone, W / 2, y); y += 16; }
    y += 6;
    divider(y); y += 12;
    ctx.fillStyle = "#0D1117"; ctx.textAlign = "left"; ctx.font = "400 12px Arial, sans-serif";
    ctx.fillText(`No. ${trxId}`, pad, y); ctx.textAlign = "right"; ctx.fillText(`${dateStr} ${timeStr}`, W - pad, y); y += 18;
    ctx.textAlign = "left"; ctx.fillText(`Kasir: ${cashierName}`, pad, y); ctx.textAlign = "right"; ctx.fillText(selectedShiftName, W - pad, y); y += 18;
    y += 6; divider(y); y += 12;
    ctx.font = "400 12.5px Arial, sans-serif";
    cart.forEach(i => {
      ctx.textAlign = "left"; ctx.fillText(clip(`${i.product.name}  x${i.qty}`, W - pad * 2 - 90), pad, y);
      ctx.textAlign = "right"; ctx.fillText(formatRp(i.product.price * i.qty), W - pad, y); y += 22;
    });
    divider(y); y += 12;
    ctx.textAlign = "left"; ctx.font = "700 15px Georgia, serif"; ctx.fillText("TOTAL", pad, y);
    ctx.textAlign = "right"; ctx.fillText(formatRp(total), W - pad, y); y += 26;
    ctx.font = "400 12px Arial, sans-serif"; ctx.fillStyle = "#4a4a4a";
    const methodLabel: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", hutang: "Hutang/Bon" };
    ctx.textAlign = "left"; ctx.fillText("Metode", pad, y); ctx.textAlign = "right"; ctx.fillText(methodLabel[paymentMethod] ?? paymentMethod, W - pad, y); y += 18;
    if (paymentMethod === "tunai") {
      ctx.textAlign = "left"; ctx.fillText("Tunai", pad, y); ctx.textAlign = "right"; ctx.fillText(formatRp(cashReceived), W - pad, y); y += 18;
      ctx.textAlign = "left"; ctx.fillText("Kembali", pad, y); ctx.textAlign = "right"; ctx.fillText(formatRp(change), W - pad, y); y += 18;
    }
    y += 6; ctx.textAlign = "center"; ctx.fillStyle = "#0D1117"; ctx.font = "italic 400 12px Georgia, serif";
    ctx.fillText("Terima kasih, sampai jumpa lagi", W / 2, y); y += 20;
    if (notPremium) { ctx.fillStyle = "#A6843F"; ctx.font = "600 9px Arial, sans-serif"; ctx.fillText(isAtLeast(effectiveTier, "standard") ? "Powered by Sterith Business Consulting POS" : "Powered by Sterith Business Consulting", W / 2, y + 8); }
    return new Promise<Blob | null>(res => canvas.toBlob(b => res(b), "image/png"));
  }

  async function shareReceiptWA() {
    if (!canWhatsApp) return;
    try {
      const blob = await buildReceiptImage();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (blob) {
        const file = new File([blob], `struk-${trxId}.png`, { type: "image/png" });
        if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: waMessage, title: `Struk ${trxId}` });
          return;
        }
      }
    } catch { /* fall back to text link below */ }
    // Fallback (desktop / share unsupported): wa.me carries text only.
    window.open(`https://wa.me/?text=${waText}`, "_blank");
  }

  return (
    <div className="w-full h-full bg-cream-bg flex flex-col animate-screen-in">
      <AppSidebar active="sales" cashierInitials={cashierInitials} setScreen={setScreen} signOut={signOut} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

      {/* Two-column area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: receipt */}
        <div className="flex-1 flex flex-col min-w-0 px-6 lg:px-10 py-5 lg:py-7 overflow-auto">

          <button onClick={() => setScreen("payment")}
            className="flex items-center gap-1.5 text-[12px] text-text-mute bg-transparent border-0 p-0 hover:text-navy transition-colors mb-5 self-start cursor-pointer">
            <ChevronLeft size={14} strokeWidth={1.8} />
            Kembali ke pembayaran
          </button>

          {/* Success header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[46px] h-[46px] rounded-full bg-navy flex items-center justify-center shrink-0">
              <Check size={20} strokeWidth={2.5} className="text-gold" />
            </div>
            <div>
              <p style={{ fontSize: 9.5, letterSpacing: "0.22em" }} className="font-sans uppercase text-gold mb-0.5">BERHASIL · PAID</p>
              <h2 className="font-serif text-[22px] lg:text-[26px] font-medium text-navy leading-tight">Terima kasih, pelanggan</h2>
            </div>
          </div>

          {/* Thermal receipt card */}
          <div className="bg-white border border-warm-border rounded-card px-[26px] py-6 flex flex-col w-full max-w-[460px]">

            <div className="text-center pb-3.5 border-b border-dashed border-warm-dashed">
              {canBranding && receiptLogo && (
                <img src={receiptLogo} alt="" style={{ maxHeight: 54, maxWidth: 180, objectFit: "contain", margin: "0 auto 8px", display: "block" }} />
              )}
              <div className="font-serif text-[20px] font-semibold text-navy">{displayName}</div>
              {displayAddress && <div className="text-[10.5px] text-text-mute mt-1">{displayAddress}</div>}
              {displayPhone && <div className="text-[10.5px] text-text-mute">WhatsApp {displayPhone}</div>}
            </div>

            <div className="flex justify-between font-sans text-[10.5px] text-text-mute py-2.5 border-b border-dashed border-warm-dashed" style={{ fontVariantNumeric: "tabular-nums" }}>
              <div><div>{trxId}</div><div className="mt-0.5">{dateStr} · {timeStr}</div></div>
              <div className="text-right"><div>Kasir: {cashierName}</div><div className="mt-0.5">{selectedShiftName}</div></div>
            </div>

            <div className="py-3 border-b border-dashed border-warm-dashed">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between mb-2">
                  <div>
                    <div className="text-[11.5px] font-medium text-navy">{item.product.name}</div>
                    <div className="font-sans text-[10px] text-text-mute" style={{ fontVariantNumeric: "tabular-nums" }}>{item.qty} × {item.product.price.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="font-sans text-[11.5px] font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{(item.product.price * item.qty).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-dashed border-warm-dashed">
              <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>SUBTOTAL</span><span>{total.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-sans text-[11px] text-text-mute mb-2.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span>DISKON</span><span>0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-[11px] font-semibold tracking-[0.05em] text-navy">TOTAL</span>
                <span className="num text-[24px] font-bold text-navy leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{formatRp(total)}</span>
              </div>
            </div>

            <div className="py-3">
              {paymentMethod === "hutang" ? (
                <>
                  <div className="flex justify-between font-sans text-[11px] font-semibold" style={{ color: "#C25E3D", fontVariantNumeric: "tabular-nums" }}>
                    <span>HUTANG · BELUM DIBAYAR</span><span>{total.toLocaleString("id-ID")}</span>
                  </div>
                  {hutangCustomer && <div className="font-sans text-[10px] text-text-mute mt-1.5">a.n. {hutangCustomer.name}{hutangCustomer.phone ? ` · ${hutangCustomer.phone}` : ""}</div>}
                </>
              ) : paymentMethod === "tunai" ? (
                <>
                  <div className="flex justify-between font-sans text-[11px] text-text-mute mb-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <span>TUNAI</span><span>{cashReceived.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-sans text-[11px] font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <span>KEMBALIAN</span><span>{change.toLocaleString("id-ID")}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-sans text-[11px] font-semibold text-navy">
                  <span>METODE</span><span>{paymentMethod.toUpperCase()} · LUNAS</span>
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t border-dashed border-warm-dashed mt-auto">
              <div className="font-serif italic text-[13px] text-navy text-center mb-3">Terima kasih, sampai jumpa lagi</div>
              <SterithWatermark tier={effectiveTier} />
            </div>
          </div>

          {/* Mobile actions */}
          {(canPrint || showWhatsApp) && (
          <div className="lg:hidden grid grid-cols-2 gap-2.5 mt-5">
            {canPrint && (
            <button onClick={handlePrint} className="bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy cursor-pointer">
              <Printer size={17} strokeWidth={1.8} />
              <span className="text-[11px]">Cetak struk</span>
            </button>
            )}
            {showWhatsApp && (
            <div className="relative">
              <button
                onClick={() => shareReceiptWA()}
                className={`w-full bg-white border border-warm-border rounded-button py-3.5 flex flex-col items-center gap-1.5 text-navy transition-colors ${canWhatsApp ? "hover:border-navy/30 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                <span className="text-[11px]">WhatsApp</span>
              </button>
              {!canWhatsApp && <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                STANDARD
              </span>}
            </div>
            )}
          </div>
          )}
          {printMsg && (
            <p className="lg:hidden text-[11px] mt-2 text-center" style={{ color: printMsg.ok ? "#3D7A5E" : "#C25E3D" }}>{printMsg.text}</p>
          )}
        </div>

        {/* Right panel: desktop only */}
        <div className="hidden lg:flex w-[300px] bg-white border-l border-warm-border flex-col px-7 py-7 shrink-0">

          <p style={{ fontSize: 9.5, letterSpacing: "0.18em" }} className="font-sans uppercase text-text-mute mb-3">TINDAKAN</p>
          <div className="flex flex-col gap-2 mb-auto">
            {canPrint && (
            <button onClick={handlePrint} className="flex items-center gap-3 bg-cream-bg border border-warm-border rounded-card px-4 py-3.5 text-[13px] font-medium text-navy hover:border-navy/30 transition-colors cursor-pointer w-full">
              <Printer size={15} strokeWidth={1.8} className="shrink-0" />
              Cetak struk
            </button>
            )}

            {showWhatsApp && (
            <div className="relative">
              <button
                onClick={() => shareReceiptWA()}
                className={`w-full flex items-center gap-3 bg-cream-bg border border-warm-border rounded-card px-4 py-3.5 text-[13px] font-medium text-navy transition-colors ${canWhatsApp ? "hover:border-navy/30 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                Kirim via WhatsApp
              </button>
              {!canWhatsApp && <span style={{ background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.35)", color: "#A6843F", fontSize: 7.5, letterSpacing: "0.14em", fontWeight: 600, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, position: "absolute", top: -7, right: 10, whiteSpace: "nowrap" }}>
                STANDARD
              </span>}
            </div>
            )}
          </div>

          {printMsg && <p className="text-[11px] mt-4 text-center" style={{ color: printMsg.ok ? "#3D7A5E" : "#C25E3D" }}>{printMsg.text}</p>}
          <p className="text-[11px] text-text-mute text-center mt-6">{isDemoMode ? "Mode Demo · data tidak tersimpan" : "Struk tersimpan di Riwayat"}</p>
        </div>
      </div>

      {/* Bottom: full-width Transaksi Baru */}
      <div className="px-6 lg:px-8 pb-6 lg:pb-8 pt-3 shrink-0">
        <button onClick={handleNewTrx}
          className="w-full bg-navy rounded-card h-[54px] flex items-center justify-center gap-3 text-[14px] font-semibold text-cream-text hover:opacity-90 transition-opacity cursor-pointer border-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          TRANSAKSI BARU — {nextTrxId}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </button>
      </div>

      </div>
    </div>
  );
}
