import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { BUILD } from "../version";

// Guard so the recurring update check is wired up only once, even though this
// component mounts/unmounts across screens.
let _updateWatchStarted = false;

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    // By default the SW only checks for a new build on page load — so an installed
    // PWA that stays open never sees updates. Re-check whenever the app regains
    // focus and every 30 min, so a new deploy surfaces the prompt on its own.
    onRegisteredSW(_swUrl, r) {
      if (!r || _updateWatchStarted) return;
      _updateWatchStarted = true;
      const check = () => { r.update().catch(() => {}); };
      check();
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      window.addEventListener("focus", check);
    },
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => { if (needRefresh) setVisible(true); }, [needRefresh]);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 280, height: 280, background: "#0D0D0D", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "28px 24px 22px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Logo + branding */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginBottom: 10 }}>
            <rect x="10" y="62" width="14" height="26" rx="3" fill="#A6843F"/>
            <rect x="30" y="50" width="14" height="38" rx="3" fill="#C9A55F"/>
            <rect x="50" y="34" width="14" height="54" rx="3" fill="#D4B36C"/>
            <rect x="70" y="22" width="14" height="66" rx="3" fill="#E5C778"/>
            <polygon points="63,22 91,22 77,4" fill="#E5C778"/>
          </svg>

          <p style={{ margin: 0, fontFamily: "'EB Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: "#F2EDE3", letterSpacing: "0.18em", textTransform: "uppercase" }}>STERITH</p>
          <p style={{ margin: "3px 0 0", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, letterSpacing: "0.28em", color: "#C9A55F", textTransform: "uppercase" }}>BUSINESS CONSULTING</p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ flex: 1, height: 1, width: 32, background: "rgba(201,165,95,0.5)" }} />
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, letterSpacing: "0.22em", color: "#C9A55F", textTransform: "uppercase", whiteSpace: "nowrap" }}>POS · POINT OF SALE</span>
            <span style={{ flex: 1, height: 1, width: 32, background: "rgba(201,165,95,0.5)" }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "rgba(242,237,227,0.08)" }} />

        {/* Update info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <p style={{ margin: 0, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: "#F2EDE3", letterSpacing: "0.04em" }}>Update Tersedia</p>
          <p style={{ margin: 0, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: "rgba(242,237,227,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Build {BUILD}</p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button onClick={() => setVisible(false)}
            style={{ flex: 1, height: 38, background: "rgba(242,237,227,0.07)", border: "1px solid rgba(242,237,227,0.1)", borderRadius: 10, fontSize: 12, fontWeight: 500, color: "rgba(242,237,227,0.45)", cursor: "pointer", fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.04em" }}>
            Nanti
          </button>
          <button onClick={() => updateServiceWorker(true)}
            style={{ flex: 1, height: 38, background: "linear-gradient(135deg, #C9A55F, #A6843F)", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "0.06em" }}>
            UPDATE →
          </button>
        </div>
      </div>
    </div>
  );
}
