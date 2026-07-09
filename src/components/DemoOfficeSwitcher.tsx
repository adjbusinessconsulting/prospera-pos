import { useStore } from "../store";

// Demo-only: switch between the Front Office (POS / kasir) and the Back Office —
// both run on the same in-memory demo data, so changes cross-affect live.
export function DemoOfficeSwitcher() {
  const demoView = useStore((s) => s.demoView);
  const setDemoView = useStore((s) => s.setDemoView);

  const opts: { k: "front" | "back"; l: string }[] = [
    { k: "front", l: "Kasir" },
    { k: "back", l: "Back Office" },
  ];

  return (
    <div style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 151, display: "flex", alignItems: "center", gap: 9, background: "rgba(11,17,41,0.94)", border: "1px solid rgba(201,165,95,0.4)", borderRadius: 999, padding: "5px 8px 5px 13px", boxShadow: "0 10px 34px rgba(0,0,0,0.35)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <span style={{ fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 700, whiteSpace: "nowrap" }}>Demo · Tampilan</span>
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 3 }}>
        {opts.map((o) => {
          const active = demoView === o.k;
          return (
            <button key={o.k} onClick={() => setDemoView(o.k)}
              style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 13px", fontSize: 11, fontWeight: 600, background: active ? "#C9A55F" : "transparent", color: active ? "#0B1129" : "#C4C0B8", transition: "background .15s, color .15s", whiteSpace: "nowrap" }}>
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
