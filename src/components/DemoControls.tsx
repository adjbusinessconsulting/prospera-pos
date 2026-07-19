import { useStore } from "../store";

const OFFICES: { k: "front" | "back"; l: string }[] = [
  { k: "front", l: "Kasir" },
  { k: "back", l: "Back Office" },
];
const TIERS = [
  { k: "free", l: "Free" },
  { k: "standard", l: "Standard" },
  { k: "premium", l: "Premium" },
];

// Compact demo control bar: Front/Back office + tier. Laid out by its parent
// (not viewport-fixed) so it never overlaps the app chrome.
export function DemoControls() {
  const demoView = useStore((s) => s.demoView);
  const setDemoView = useStore((s) => s.setDemoView);
  const storeTier = useStore((s) => s.storeTier);
  const setStoreTier = useStore((s) => s.setStoreTier);

  const seg = (opts: { k: string; l: string }[], val: string, on: (k: string) => void) => (
    <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 3 }}>
      {opts.map((o) => {
        const active = val === o.k;
        return (
          <button key={o.k} onClick={() => on(o.k)}
            style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 600, background: active ? "#C9A55F" : "transparent", color: active ? "#0D1117" : "#C4C0B8", whiteSpace: "nowrap", transition: "background .15s, color .15s" }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(11,17,41,0.95)", border: "1px solid rgba(201,165,95,0.4)", borderRadius: 999, padding: "4px 9px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", fontFamily: "Inter, system-ui, sans-serif", maxWidth: "96vw", flexWrap: "wrap", justifyContent: "center" }}>
      <span style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 800, whiteSpace: "nowrap" }}>Demo</span>
      {seg(OFFICES, demoView, (k) => setDemoView(k as "front" | "back"))}
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.14)" }} />
      {seg(TIERS, storeTier, setStoreTier)}
    </div>
  );
}
