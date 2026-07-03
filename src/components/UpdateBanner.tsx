import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const [visible, setVisible] = useState(false);

  useEffect(() => { if (needRefresh) setVisible(true); }, [needRefresh]);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#0B1129", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(11,17,41,0.28)", minWidth: 280 }}>
      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#F2EDE3", fontFamily: "Inter, sans-serif" }}>Update tersedia</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(242,237,227,0.55)", fontFamily: "Inter, sans-serif" }}>Versi baru Sterith POS siap dipasang</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setVisible(false)} style={{ background: "rgba(242,237,227,0.08)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, color: "rgba(242,237,227,0.5)", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Nanti</button>
        <button onClick={() => updateServiceWorker(true)} style={{ background: "#C9A55F", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11.5, fontWeight: 600, color: "white", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Update</button>
      </div>
    </div>
  );
}
