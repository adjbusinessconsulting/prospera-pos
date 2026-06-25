import { useEffect } from "react";
import { useStore } from "./store";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";

const SCREENS = ["login", "sales", "payment", "receipt"] as const;
type ScreenId = typeof SCREENS[number];

export default function App() {
  const { screen, setScreen, restart } = useStore();
  const idx = SCREENS.indexOf(screen as ScreenId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && idx > 0) setScreen(SCREENS[idx - 1]);
      if (e.key === "ArrowRight") {
        if (idx < SCREENS.length - 1) setScreen(SCREENS[idx + 1]);
        else restart();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, setScreen, restart]);

  return (
    <div className="fixed inset-0 bg-cream-deep flex items-center justify-center">
      <div
        className="bg-cream-bg rounded-card shadow-tablet overflow-hidden"
        style={{ width: 1366, height: 900, maxWidth: "96vw", maxHeight: "calc(100vh - 100px)" }}
      >
        {screen === "login" && <PinLogin />}
        {screen === "sales" && <Sales />}
        {screen === "payment" && <Payment />}
        {screen === "receipt" && <Receipt />}
      </div>
      {/* Prototype nav */}
      <div className="fixed bottom-5 right-5 flex items-center gap-1.5">
        <button onClick={() => idx > 0 && setScreen(SCREENS[idx - 1])}
          className="w-8 h-8 flex items-center justify-center bg-navy/10 rounded text-navy text-sm hover:bg-navy/20">←</button>
        <button onClick={() => { if (idx < SCREENS.length - 1) setScreen(SCREENS[idx + 1]); else restart(); }}
          className="w-8 h-8 flex items-center justify-center bg-navy/10 rounded text-navy text-sm hover:bg-navy/20">→</button>
        <span className="font-mono text-[10px] text-navy/40 tracking-mono-default ml-1">NAVIGATE</span>
      </div>
    </div>
  );
}
