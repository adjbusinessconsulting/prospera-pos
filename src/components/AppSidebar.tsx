import { ShoppingCart, Clock, Package, Wallet, BarChart2, ChevronLeft, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Screen } from "../types";

const NAV = [
  { id: "sales"   as Screen, label: "JUAL",    Icon: ShoppingCart },
  { id: "riwayat" as Screen, label: "RIWAYAT", Icon: Clock },
  { id: "produk"  as Screen, label: "PRODUK",  Icon: Package },
  { id: "kas"     as Screen, label: "KAS",     Icon: Wallet },
  { id: "laporan" as Screen, label: "LAPORAN", Icon: BarChart2 },
];

interface Props {
  active: string;
  cashierInitials: string;
  setScreen: (s: Screen) => void;
  signOut: () => void;
  showDemoBack?: boolean;
}

export function AppSidebar({ active, cashierInitials, setScreen, signOut, showDemoBack = false }: Props) {
  return (
    <aside className="hidden lg:flex w-[80px] bg-white border-r border-warm-border flex-col items-center py-5 shrink-0">
      <div className="mb-5 flex items-center justify-center">
        <img src="/mark-gold-512.png" alt="Sterith" style={{ width: 34, height: 34, objectFit: "contain" }} />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 items-center w-full px-2">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setScreen(id)}
              className={`w-full h-[50px] rounded-card flex flex-col items-center justify-center gap-[5px] border-0 transition-colors ${isActive ? "bg-navy text-cream-text" : "bg-transparent text-text-mute hover:text-navy hover:bg-cream-bg"}`}>
              <Icon size={17} strokeWidth={isActive ? 2 : 1.6} />
              <span style={{ fontSize: 7.5, letterSpacing: "0.12em" }} className="font-medium uppercase leading-none">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-2.5 mt-2">
        <div className="flex flex-col items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success block" />
          <span style={{ fontSize: 7, letterSpacing: "0.1em" }} className="text-text-mute uppercase">SYNC</span>
        </div>
        <div className="w-[34px] h-[34px] rounded-full bg-cream-pill border border-warm-border flex items-center justify-center font-semibold text-[12px] text-navy">
          {cashierInitials}
        </div>
        {showDemoBack && (
          <button onClick={() => setScreen("login")}
            className="w-[34px] h-[34px] rounded-card flex items-center justify-center text-text-mute hover:text-navy hover:bg-cream-pill transition-colors border border-warm-border bg-transparent"
            title="Kembali ke PIN (Demo)">
            <ChevronLeft size={15} strokeWidth={1.8} />
          </button>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); signOut(); }}
          className="w-[34px] h-[34px] rounded-card flex items-center justify-center text-text-mute hover:text-warning hover:bg-cream-pill transition-colors border-0 bg-transparent"
          title="Keluar">
          <LogOut size={14} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ active, setScreen }: { active: string; setScreen: (s: Screen) => void }) {
  const items = [
    { id: "sales"   as Screen, label: "Jual",    Icon: ShoppingCart },
    { id: "produk"  as Screen, label: "Produk",  Icon: Package },
    { id: "kas"     as Screen, label: "Kas",     Icon: Wallet },
    { id: "laporan" as Screen, label: "Laporan", Icon: BarChart2 },
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-warm-border flex z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setScreen(id)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 border-0 bg-transparent transition-colors ${active === id ? "text-navy" : "text-text-mute"}`}>
          <Icon size={20} strokeWidth={active === id ? 2 : 1.6} />
          <span style={{ fontSize: 9.5, letterSpacing: "0.07em" }} className="font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
