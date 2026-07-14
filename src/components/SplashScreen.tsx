import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const doneTimer = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0D1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1,
      transition: "opacity 0.5s ease",
      pointerEvents: fading ? "none" : "all",
    }}>
      <img
        src="/splash-logo.png"
        alt="Sterith POS"
        style={{ width: "72%", maxWidth: 420, height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}
