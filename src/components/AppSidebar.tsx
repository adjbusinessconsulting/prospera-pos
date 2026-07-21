import { ShoppingCart, Package, BarChart2, ChevronLeft, LogOut, MessageCircle, Sparkles, Settings } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import type { Screen } from "../types";
import FeedbackDrawer from "./FeedbackDrawer";
import UpgradeModal from "./UpgradeModal";
import { ReceiptSettings } from "./ReceiptSettings";
import { SettingsPanel } from "./SettingsPanel";
import { PrinterSettings } from "./PrinterSettings";
import { pendingAuditCount } from "../lib/auditlog";

const NAV = [
  { id: "sales"   as Screen, label: "Jual",    Icon: ShoppingCart },
  { id: "produk"  as Screen, label: "Produk",  Icon: Package },
  { id: "riwayat" as Screen, label: "Laporan", Icon: BarChart2 },
];

interface Props {
  active: string;
  cashierInitials: string;
  setScreen: (s: Screen) => void;
  signOut: () => void;
  showDemoBack?: boolean;
}

export function AppSidebar({ active, cashierInitials, setScreen, signOut, showDemoBack = false }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);
  const storeTier = useStore(s => (s.storeId ? s.storeTier : "free"));
  const isOnline = useStore(s => s.isOnline);
  const pendingSyncCount = useStore(s => s.pendingSyncCount);
  const auditPending = pendingAuditCount();
  const syncColor = !isOnline ? "#C25E3D" : (pendingSyncCount + auditPending) > 0 ? "#C9A55F" : "#5C9E7E";
  const syncLabel = !isOnline ? "Offline" : pendingSyncCount > 0 ? `${pendingSyncCount} belum sync` : "";

  return (
    <>
      <header className="pos-topbar" style={{
        height: 52, background: "white", borderBottom: "1px solid #ECE7DD",
        display: "flex", alignItems: "center", padding: "0 12px", gap: 8,
        flexShrink: 0, zIndex: 30, overflowX: "auto", overflowY: "hidden",
      }}>
        {/* Logo mark */}
        <img src="/mark-gold-512.png" alt="Sterith"
          style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />

        {/* Nav items — centred */}
        <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "center" }}>
          {NAV.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => setScreen(id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 13px", borderRadius: 9, border: "none",
                background: isActive ? "#0D1117" : "transparent",
                color: isActive ? "#f8f6ef" : "#7A776F",
                cursor: "pointer", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.09em", textTransform: "uppercase" as const,
                transition: "background 0.12s, color 0.12s",
              }}>
                <Icon size={14} strokeWidth={isActive ? 2 : 1.6} />
                <span style={{ display: "none" }} className="sm-label">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: sync · feedback · cashier · demo back · logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Sync status */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }} title={!isOnline ? "Offline — transaksi disimpan & disinkron saat online" : (pendingSyncCount + auditPending) > 0 ? `${pendingSyncCount} transaksi${auditPending ? ` · ${auditPending} log audit` : ""} menunggu sinkron` : "Tersinkron"}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: syncColor, boxShadow: `0 0 0 3px ${syncColor}2E`, display: "inline-block", flexShrink: 0 }} />
            {syncLabel && <span style={{ fontSize: 9, fontWeight: 600, color: syncColor, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{syncLabel}</span>}
          </div>

          {/* Tier badge → upgrade */}
          <button onClick={() => setUpgradeOpen(true)} title="Lihat paket / upgrade" style={{
            display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px",
            borderRadius: 999, border: "1px solid rgba(201,165,95,0.4)", background: "rgba(201,165,95,0.10)",
            cursor: "pointer",
          }}>
            <Sparkles size={12} color="#A6843F" strokeWidth={2} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#A6843F" }}>{storeTier}</span>
          </button>

          {/* Pengaturan */}
          <button onClick={() => setSettingsOpen(true)} title="Pengaturan" style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#7A776F", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8,
          }}>
            <Settings size={15} strokeWidth={1.6} />
          </button>

          {/* Bantuan */}
          <button onClick={() => setFeedbackOpen(true)} title="Bantuan" style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#7A776F", display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8,
          }}>
            <MessageCircle size={15} strokeWidth={1.6} />
          </button>

          {/* Cashier initials */}
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "#f0ebe1", border: "1px solid #ECE7DD",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#0D1117", flexShrink: 0,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}>
            {cashierInitials}
          </div>

          {/* Demo back to PIN */}
          {showDemoBack && (
            <button onClick={() => setScreen("login")} title="Kembali ke PIN" style={{
              background: "transparent", border: "1px solid #ECE7DD",
              cursor: "pointer", color: "#7A776F",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 8,
            }}>
              <ChevronLeft size={13} strokeWidth={1.8} />
            </button>
          )}

          {/* Logout */}
          <button onClick={async () => { await supabase.auth.signOut(); signOut(); }} title="Keluar" style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#7A776F", display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8,
          }}>
            <LogOut size={14} strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <style>{`
        @media (min-width: 480px) { .sm-label { display: inline !important; } }
        .pos-topbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pos-topbar::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedbackDrawer open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenReceipt={() => setReceiptOpen(true)} onOpenPrinter={() => setPrinterOpen(true)} />
      <ReceiptSettings open={receiptOpen} onClose={() => setReceiptOpen(false)} />
      <PrinterSettings open={printerOpen} onClose={() => setPrinterOpen(false)} />
    </>
  );
}
