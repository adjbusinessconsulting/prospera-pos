import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { checkForUpdate } from "../lib/pwaUpdate";
import { BUILD } from "../version";

// "Cek pembaruan" button. Forces the service worker to re-check for a new build.
// If one is found, UpdateBanner's "Update Tersedia" prompt appears on its own;
// otherwise this shows a brief "Sudah versi terbaru" confirmation.
export default function CheckUpdateButton({ style }: { style?: React.CSSProperties }) {
  const [state, setState] = useState<"idle" | "checking" | "current">("idle");

  async function onClick() {
    if (state === "checking") return;
    setState("checking");
    const found = await checkForUpdate();
    if (found) setState("idle");                 // banner will pop up
    else { setState("current"); setTimeout(() => setState("idle"), 2600); }
  }

  const label =
    state === "checking" ? "Mengecek pembaruan…"
    : state === "current" ? `Sudah versi terbaru · Build ${BUILD}`
    : "Cek pembaruan";

  return (
    <button onClick={onClick} disabled={state === "checking"} title="Cek versi terbaru aplikasi"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "transparent", border: "none", cursor: state === "checking" ? "default" : "pointer",
        color: state === "current" ? "#3D7A5E" : "#7A776F",
        fontSize: 12, fontWeight: 500, fontFamily: "'Hanken Grotesk', sans-serif",
        padding: "6px 4px", letterSpacing: "0.01em", ...style,
      }}>
      {state === "current" ? <Check size={13} strokeWidth={2.2} /> : <RefreshCw size={13} strokeWidth={1.9} style={state === "checking" ? { animation: "spin360 0.8s linear infinite" } : undefined} />}
      {label}
    </button>
  );
}
