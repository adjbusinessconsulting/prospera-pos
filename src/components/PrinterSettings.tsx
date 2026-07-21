import { useState } from "react";
import {
  isIOS, bluetoothSupported, usbSupported, isDesktop, isConnected, connectedName,
  connectBluetooth, connectUsb, testPrint, loadPrinterConfig, savePrinterConfig, clearPrinterConfig,
} from "../lib/printer";

export function PrinterSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const saved = loadPrinterConfig();
  const [paper, setPaper] = useState<58 | 80>(saved?.paper ?? 58);
  const [busy, setBusy] = useState<"" | "bt" | "usb" | "test">("");
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [, force] = useState(0);

  if (!open) return null;

  const ios = isIOS();
  const bt = bluetoothSupported();
  const usb = usbSupported() && isDesktop();
  const connected = isConnected();

  async function pair(kind: "bt" | "usb") {
    setErr(""); setOkMsg(""); setBusy(kind);
    try {
      const name = kind === "bt" ? await connectBluetooth() : await connectUsb();
      savePrinterConfig({ type: kind === "bt" ? "bluetooth" : "usb", paper, name });
      setOkMsg(`Terhubung: ${name}`);
    } catch (e) {
      const m = (e as Error)?.message || "";
      setErr(/cancel|user gesture|chooser/i.test(m) ? "Pemilihan printer dibatalkan." : (m || "Gagal menghubungkan printer."));
    } finally { setBusy(""); force(x => x + 1); }
  }

  async function runTest() {
    setErr(""); setOkMsg(""); setBusy("test");
    try { await testPrint(paper); setOkMsg("Struk tes terkirim ke printer."); }
    catch (e) { setErr((e as Error)?.message || "Gagal mencetak. Cek printer & sambungan."); }
    finally { setBusy(""); }
  }

  function changePaper(p: 58 | 80) {
    setPaper(p);
    const c = loadPrinterConfig();
    if (c) savePrinterConfig({ ...c, paper: p });
  }

  function forget() {
    clearPrinterConfig(); setOkMsg(""); setErr(""); force(x => x + 1);
  }

  const label = { fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#0D1117", fontWeight: 700 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1150, background: "rgba(11,17,41,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 18, padding: 24, boxShadow: "0 30px 80px rgba(11,17,41,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600 }}>Sterith POS · Struk</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#0D1117" }}>Atur Printer</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ECE7DD", background: "white", cursor: "pointer", color: "#7A776F" }}>✕</button>
        </div>

        {ios ? (
          <div style={{ marginTop: 16, background: "rgba(194,94,61,0.07)", border: "1px dashed rgba(194,94,61,0.4)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0D1117" }}>Perangkat Apple</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#7A776F", lineHeight: 1.6 }}>
              Cetak Bluetooth tidak didukung di iPhone/iPad (batasan Apple). Pakai
              tablet/HP <b>Android</b> untuk printer Bluetooth, atau bagikan struk lewat
              <b> layar / WhatsApp</b>.
            </p>
          </div>
        ) : !bt && !usb ? (
          <div style={{ marginTop: 16, background: "rgba(201,165,95,0.07)", border: "1px dashed rgba(201,165,95,0.4)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "#0D1117", lineHeight: 1.6 }}>
              Browser ini belum mendukung printer. Gunakan <b>Google Chrome</b> di Android
              atau desktop untuk menyambungkan printer thermal.
            </p>
          </div>
        ) : (
          <>
            {/* Paper size */}
            <p style={{ ...label, margin: "18px 0 8px" }}>Ukuran Kertas</p>
            <div style={{ display: "flex", gap: 8 }}>
              {([58, 80] as const).map(p => (
                <button key={p} onClick={() => changePaper(p)}
                  style={{ flex: 1, height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: paper === p ? "1.5px solid #0D1117" : "1px solid #ECE7DD",
                    background: paper === p ? "#0D1117" : "white", color: paper === p ? "#F2EDE3" : "#0D1117" }}>
                  {p}mm
                </button>
              ))}
            </div>

            {/* Status */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: connected ? "rgba(61,122,94,0.08)" : "#F7F4EE", border: `1px solid ${connected ? "rgba(61,122,94,0.3)" : "#ECE7DD"}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: connected ? "#3D7A5E" : "#C25E3D", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "#0D1117", fontWeight: 600 }}>
                {connected ? `Terhubung: ${connectedName()}` : "Tidak terhubung"}
              </span>
            </div>
            {!connected && saved && (
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#7A776F" }}>Printer terakhir: <b>{saved.name}</b>. Sambungkan ulang tiap buka aplikasi.</p>
            )}

            {/* Connect buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {bt && (
                <button onClick={() => pair("bt")} disabled={busy !== ""}
                  style={{ height: 46, borderRadius: 11, border: "none", background: "#0D1117", color: "#F2EDE3", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy === "bt" ? 0.6 : 1 }}>
                  {busy === "bt" ? "Mencari…" : connected ? "Cari Printer Bluetooth Lain" : "Cari Printer Bluetooth"}
                </button>
              )}
              {usb && (
                <button onClick={() => pair("usb")} disabled={busy !== ""}
                  style={{ height: 46, borderRadius: 11, border: "1px solid #ECE7DD", background: "white", color: "#0D1117", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy === "usb" ? 0.6 : 1 }}>
                  {busy === "usb" ? "Mencari…" : "Printer USB / Kabel"}
                </button>
              )}
            </div>

            {/* Test print */}
            <button onClick={runTest} disabled={!connected || busy !== ""}
              style={{ width: "100%", height: 44, marginTop: 10, borderRadius: 11, border: "1px solid #ECE7DD", background: connected ? "#FAFAF7" : "#F2EDE3", color: connected ? "#0D1117" : "#B0A99A", fontSize: 13, fontWeight: 700, cursor: connected && !busy ? "pointer" : "default" }}>
              {busy === "test" ? "Mencetak…" : "Test Print"}
            </button>

            {err && <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#C25E3D", lineHeight: 1.5 }}>{err}</p>}
            {okMsg && <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#3D7A5E", lineHeight: 1.5 }}>{okMsg}</p>}

            {saved && (
              <button onClick={forget} style={{ width: "100%", marginTop: 14, background: "none", border: "none", color: "#7A776F", fontSize: 11.5, textDecoration: "underline", cursor: "pointer" }}>
                Lupakan printer
              </button>
            )}

            <p style={{ margin: "16px 0 0", fontSize: 10.5, color: "#B8B0A8", lineHeight: 1.6 }}>
              Jika printer mati / kehabisan kertas, penjualan tetap selesai — struk tampil
              di layar sebagai cadangan.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
