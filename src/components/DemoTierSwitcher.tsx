import { useStore } from "../store";

const TIERS = [
  { k: "free", l: "Free" },
  { k: "standard", l: "Standard" },
  { k: "premium", l: "Premium" },
];

// Demo-only: flip the store tier on the fly so the tier gating throughout the
// POS (Kas, Laporan, Riwayat, inventory, kasir/shift limits…) shows the locked
// state for the chosen tier.
export function DemoTierSwitcher() {
  const storeTier = useStore((s) => s.storeTier);
  const setStoreTier = useStore((s) => s.setStoreTier);

  return (
    <div style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 150, display: "flex", alignItems: "center", gap: 9, background: "rgba(11,17,41,0.94)", border: "1px solid rgba(201,165,95,0.4)", borderRadius: 999, padding: "5px 8px 5px 13px", boxShadow: "0 10px 34px rgba(0,0,0,0.35)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <span style={{ fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 700, whiteSpace: "nowrap" }}>Demo · Tier</span>
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 3 }}>
        {TIERS.map((t) => {
          const active = storeTier === t.k;
          return (
            <button key={t.k} onClick={() => setStoreTier(t.k)}
              style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 13px", fontSize: 11, fontWeight: 600, background: active ? "#C9A55F" : "transparent", color: active ? "#0B1129" : "#C4C0B8", transition: "background .15s, color .15s" }}>
              {t.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
