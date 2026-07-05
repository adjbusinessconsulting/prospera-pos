import { ShoppingCart, Package, BarChart2, ChevronLeft, LogOut, MessageCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Screen } from "../types";
import FeedbackDrawer from "./FeedbackDrawer";

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

  return (
    <>
      <header style={{
        height: 52, background: "white", borderBottom: "1px solid #ECE7DD",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
        flexShrink: 0, zIndex: 30,
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
                background: isActive ? "#0B1129" : "transparent",
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
          {/* Sync dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5C9E7E", boxShadow: "0 0 0 3px rgba(92,158,126,0.18)", display: "inline-block", flexShrink: 0 }} />
          </div>

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
            fontSize: 11, fontWeight: 700, color: "#0B1129", flexShrink: 0,
            fontFamily: "Inter, sans-serif",
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
      `}</style>

      <FeedbackDrawer open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
