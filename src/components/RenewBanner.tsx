import { useState } from "react";
import { useStore } from "../store";
import UpgradeModal from "./UpgradeModal";

// Shown when the store's paid subscription has lapsed — features have reverted to
// Free; the owner can request a renewal (opens the pricing modal → Master Office).
export function RenewBanner() {
  const subscriptionExpired = useStore((s) => s.subscriptionExpired);
  const paidTier = useStore((s) => s.paidTier);
  const [open, setOpen] = useState(false);

  if (!subscriptionExpired) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "96vw", background: "#FCEFE0", border: "1px solid #E5B98A", borderRadius: 999, padding: "6px 8px 6px 14px", boxShadow: "0 6px 20px rgba(138,90,46,0.12)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontSize: 8, color: "#B26B2E" }}>⚠</span>
        <span style={{ fontSize: 11.5, color: "#8A5A2E", fontWeight: 500 }}>
          Langganan <b style={{ textTransform: "capitalize" }}>{paidTier || "Anda"}</b> berakhir — fitur kembali ke Free.
        </span>
        <button onClick={() => setOpen(true)}
          style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 13px", fontSize: 11, fontWeight: 700, background: "#B26B2E", color: "#fff", whiteSpace: "nowrap" }}>
          Perpanjang
        </button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
