import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";

type LocStatus = "loading" | "found" | "denied";

export default function CheckIn() {
  const { cashierName, selectedShiftName, storeName, setScreen, setCheckinPhoto } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [captured, setCaptured] = useState<string | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("loading");

  useEffect(() => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus("found"); },
      () => setLocStatus("denied"),
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamReady(true);
      }
    } catch {
      setCamError("Akses kamera ditolak. Izinkan kamera di pengaturan browser dan muat ulang halaman.");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;

    // Draw mirrored frame (selfie looks natural)
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    // Bottom gradient
    const grad = ctx.createLinearGradient(0, H * 0.5, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const locStr = location
      ? `${location.lat.toFixed(5)}°, ${location.lng.toFixed(5)}°`
      : "Lokasi tidak tersedia";

    const scale = W / 640;
    const fs = (n: number) => Math.round(n * scale);

    // Top-left timestamp box
    ctx.fillStyle = "rgba(11,17,41,0.75)";
    const bw = fs(230), bh = fs(54), bx = fs(14), by = fs(12), br = fs(6);
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, br);
    ctx.fill();

    ctx.fillStyle = "#C9A55F";
    ctx.font = `bold ${fs(14)}px 'Courier New', monospace`;
    ctx.fillText(timeStr + " WIB", bx + fs(10), by + fs(22));
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `${fs(11)}px 'Courier New', monospace`;
    ctx.fillText(dateStr, bx + fs(10), by + fs(41));

    // Top-right watermark
    ctx.fillStyle = "rgba(201,165,95,0.65)";
    ctx.font = `bold ${fs(10)}px 'Courier New', monospace`;
    ctx.textAlign = "right";
    ctx.fillText("STERITH POS · BUKTI MASUK", W - fs(14), by + fs(22));
    ctx.textAlign = "left";

    // Bottom info lines
    const lineH = fs(22);
    const boty = H - fs(14);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `${fs(12)}px 'Courier New', monospace`;
    ctx.fillText(`\u{1F4CD} ${locStr}`, fs(14), boty - lineH * 0);

    ctx.fillStyle = "rgba(201,165,95,0.85)";
    ctx.font = `${fs(12)}px 'Courier New', monospace`;
    ctx.fillText(storeName || "Sterith POS", fs(14), boty - lineH * 1);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${fs(15)}px 'Courier New', monospace`;
    ctx.fillText(`${cashierName}  ·  ${selectedShiftName}`, fs(14), boty - lineH * 2.1);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptured(dataUrl);
    stopStream();
  }

  async function retake() {
    setCaptured(null);
    setCamReady(false);
    await startCamera();
  }

  function confirm() {
    if (captured) setCheckinPhoto(captured);
    setScreen("sales");
  }

  const shift = selectedShiftName;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0D1117", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(242,237,227,0.08)", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 9.5, letterSpacing: "0.22em", color: "rgba(201,165,95,0.75)", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "'Courier New', monospace" }}>
            STERITH POS · VERIFIKASI MASUK
          </p>
          <p style={{ fontSize: 17, fontWeight: 600, color: "#F2EDE3", margin: 0, fontFamily: "Georgia, 'Cormorant Garamond', serif" }}>
            {cashierName} · {shift}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {locStatus === "loading" && (
            <>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9A55F", opacity: 0.8 }} />
              <span style={{ fontSize: 11, color: "rgba(242,237,227,0.45)" }}>Mencari lokasi…</span>
            </>
          )}
          {locStatus === "found" && location && (
            <>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C9E7E" }} />
              <span style={{ fontSize: 11, color: "rgba(242,237,227,0.55)", fontFamily: "'Courier New', monospace" }}>
                {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
              </span>
            </>
          )}
          {locStatus === "denied" && (
            <>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#C25E3D" }} />
              <span style={{ fontSize: 11, color: "rgba(194,94,61,0.8)" }}>Lokasi tidak tersedia</span>
            </>
          )}
        </div>
      </div>

      {/* Camera area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px", gap: 14, minHeight: 0 }}>

        {camError ? (
          <div style={{ textAlign: "center", padding: "32px 20px", maxWidth: 340 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <p style={{ color: "#C25E3D", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{camError}</p>
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", maxWidth: 500, borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,165,95,0.2), 0 20px 60px rgba(0,0,0,0.5)" }}>

            {/* Live video */}
            {!captured && (
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }} />
            )}

            {/* Captured photo */}
            {captured && (
              <img src={captured} alt="Checkin foto"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}

            {/* Viewfinder corners */}
            {!captured && camReady && (
              <>
                {[
                  { top: 12, left: 12, borderTop: "2px solid rgba(201,165,95,0.8)", borderLeft: "2px solid rgba(201,165,95,0.8)" },
                  { top: 12, right: 12, borderTop: "2px solid rgba(201,165,95,0.8)", borderRight: "2px solid rgba(201,165,95,0.8)" },
                  { bottom: 12, left: 12, borderBottom: "2px solid rgba(201,165,95,0.8)", borderLeft: "2px solid rgba(201,165,95,0.8)" },
                  { bottom: 12, right: 12, borderBottom: "2px solid rgba(201,165,95,0.8)", borderRight: "2px solid rgba(201,165,95,0.8)" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 22, height: 22, ...s }} />
                ))}
                <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(11,17,41,0.6)", padding: "3px 10px", borderRadius: 4 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em", color: "rgba(201,165,95,0.9)", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>
                    Posisikan wajah di sini
                  </span>
                </div>
              </>
            )}

            {/* Loading */}
            {!captured && !camReady && !camError && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "rgba(242,237,227,0.35)", fontSize: 12 }}>Memuat kamera…</span>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!captured && !camError && (
          <p style={{ color: "rgba(242,237,227,0.35)", fontSize: 11.5, textAlign: "center", margin: 0 }}>
            Foto wajib diambil sebelum memulai shift · metadata waktu & lokasi akan tersimpan
          </p>
        )}

        {captured && (
          <p style={{ color: "#5C9E7E", fontSize: 12, textAlign: "center", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Foto berhasil diambil — metadata waktu & lokasi sudah tercatat
          </p>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: "12px 24px 36px", flexShrink: 0 }}>
        {!captured ? (
          <button onClick={capture} disabled={!camReady || !!camError}
            style={{ width: "100%", height: 56, borderRadius: 14, border: "none", background: camReady ? "#C9A55F" : "rgba(201,165,95,0.18)", color: camReady ? "#0D1117" : "rgba(201,165,95,0.4)", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", cursor: camReady ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "background 0.15s" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            AMBIL FOTO
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={retake}
              style={{ flex: 1, height: 56, borderRadius: 14, border: "1px solid rgba(242,237,227,0.15)", background: "transparent", color: "rgba(242,237,227,0.65)", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "0.04em" }}>
              Ulangi
            </button>
            <button onClick={confirm}
              style={{ flex: 2.5, height: 56, borderRadius: 14, border: "none", background: "#C9A55F", color: "#0D1117", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              Konfirmasi & Masuk
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
