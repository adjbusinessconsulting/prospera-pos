// Branded launch screen. It is NOT on a timer — App.tsx keeps it up only while
// the app is genuinely still booting (restoring the session), so a fast open
// shows it for a moment and a slow one keeps it until there's something to see.
export default function SplashScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0D1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "splashIn 0.25s ease",
    }}>
      <style>{`@keyframes splashIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <img
        src="/splash-logo.png"
        alt="Sterith POS"
        style={{ width: "72%", maxWidth: 420, height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}
