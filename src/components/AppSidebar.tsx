import { ShoppingCart, Package, BarChart2, ChevronLeft, LogOut, MessageCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Screen } from "../types";
import FeedbackDrawer from "./FeedbackDrawer";

const NAV = [
  { id: "sales"   as Screen, label: "JUAL",    Icon: ShoppingCart },
  { id: "produk"  as Screen, label: "PRODUK",  Icon: Package },
  { id: "riwayat" as Screen, label: "LAPORAN", Icon: BarChart2 },
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
      <aside className="flex w-[58px] lg:w-[80px] bg-white border-r border-warm-border flex-col items-center pt-3 pb-[72px] lg:py-5 shrink-0">
        <div className="mb-3 lg:mb-5 flex items-center justify-center">
          <img src="/mark-gold-512.png" alt="Sterith" style={{ width: 28, height: 28, objectFit: "contain" }} className="lg:hidden" />
          <img src="/mark-gold-512.png" alt="Sterith" style={{ width: 34, height: 34, objectFit: "contain" }} className="hidden lg:block" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 items-center w-full px-1.5 lg:px-2">
          {NAV.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => setScreen(id)}
                className={`w-full h-[46px] lg:h-[50px] rounded-card flex flex-col items-center justify-center gap-[4px] lg:gap-[5px] border-0 transition-colors ${isActive ? "bg-navy text-cream-text" : "bg-transparent text-text-mute hover:text-navy hover:bg-cream-bg"}`}>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                <span style={{ fontSize: 7, letterSpacing: "0.10em" }} className="font-medium uppercase leading-none hidden lg:block">{label}</span>
                <span style={{ fontSize: 6.5, letterSpacing: "0.08em" }} className="font-medium uppercase leading-none lg:hidden">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="flex flex-col items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success block" />
            <span style={{ fontSize: 6.5, letterSpacing: "0.08em" }} className="text-text-mute uppercase hidden lg:block">SYNC</span>
          </div>

          {/* Bantuan button */}
          <button onClick={() => setFeedbackOpen(true)}
            className="w-full h-[46px] lg:h-[50px] rounded-card flex flex-col items-center justify-center gap-[4px] lg:gap-[5px] border-0 bg-transparent text-text-mute hover:text-navy hover:bg-cream-bg transition-colors">
            <MessageCircle size={16} strokeWidth={1.6} />
            <span style={{ fontSize: 7, letterSpacing: "0.10em" }} className="font-medium uppercase leading-none hidden lg:block">BANTUAN</span>
            <span style={{ fontSize: 6.5, letterSpacing: "0.08em" }} className="font-medium uppercase leading-none lg:hidden">BANTUAN</span>
          </button>

          <div className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] rounded-full bg-cream-pill border border-warm-border flex items-center justify-center font-semibold text-[11px] lg:text-[12px] text-navy">
            {cashierInitials}
          </div>
          {showDemoBack && (
            <button onClick={() => setScreen("login")}
              className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-pill transition-colors border border-warm-border bg-transparent"
              title="Kembali ke PIN">
              <ChevronLeft size={13} strokeWidth={1.8} />
            </button>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); signOut(); }}
            className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] rounded-card flex items-center justify-center text-text-mute hover:text-warning hover:bg-cream-pill transition-colors border-0 bg-transparent"
            title="Keluar">
            <LogOut size={13} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      <FeedbackDrawer open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

export function MobileBottomNav({ active, setScreen }: { active: string; setScreen: (s: Screen) => void }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const items = [
    { id: "sales"   as Screen, label: "Jual",    Icon: ShoppingCart },
    { id: "produk"  as Screen, label: "Produk",  Icon: Package },
    { id: "riwayat" as Screen, label: "Laporan", Icon: BarChart2 },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-warm-border flex z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {items.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setScreen(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 border-0 bg-transparent transition-colors ${active === id ? "text-navy" : "text-text-mute"}`}>
            <Icon size={20} strokeWidth={active === id ? 2 : 1.6} />
            <span style={{ fontSize: 9.5, letterSpacing: "0.07em" }} className="font-medium">{label}</span>
          </button>
        ))}
        {/* Feedback in mobile nav */}
        <button onClick={() => setFeedbackOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 border-0 bg-transparent transition-colors text-text-mute">
          <MessageCircle size={20} strokeWidth={1.6} />
          <span style={{ fontSize: 9.5, letterSpacing: "0.07em" }} className="font-medium">Pesan</span>
        </button>
      </nav>

      <FeedbackDrawer open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
