import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useStore } from "../store";
import { getLog, verifyLog, type AuditEntry } from "../lib/auditlog";

const TYPE_LABEL: Record<string, string> = {
  "product.add": "Produk baru",
  "product.edit": "Ubah produk",
  "product.price": "Ubah harga",
  "product.delete": "Hapus produk",
  "stock.add": "Tambah stok",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function LogAktivitas() {
  const setScreen = useStore((s) => s.setScreen);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [tamperAt, setTamperAt] = useState<number | null>(null);

  useEffect(() => {
    const list = getLog().slice().reverse(); // newest first
    setEntries(list);
    verifyLog().then((i) => setTamperAt(i));
  }, []);

  const intact = tamperAt === -1;

  return (
    <div className="w-full h-full flex flex-col bg-cream-bg animate-screen-in">
      {/* Header */}
      <div style={{ height: 52, background: "white", borderBottom: "1px solid #ECE7DD", display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
        <button onClick={() => setScreen("produk")} style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #ECE7DD", background: "white", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A776F", cursor: "pointer" }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7A776F", fontWeight: 600 }}>Sterith POS · Audit</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0B1129" }}>Log Aktivitas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-5">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Integrity banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, padding: "11px 14px", marginBottom: 16, background: intact ? "rgba(78,140,110,0.07)" : "rgba(194,94,61,0.08)", border: `1px solid ${intact ? "rgba(78,140,110,0.3)" : "rgba(194,94,61,0.4)"}` }}>
            {intact
              ? <ShieldCheck size={18} color="#4E8C6E" />
              : <ShieldAlert size={18} color="#C25E3D" />}
            <div style={{ fontSize: 12.5, color: "#0B1129", lineHeight: 1.5 }}>
              {intact
                ? <>Log utuh &amp; tidak diubah. Catatan bersifat <b>permanen</b> — tidak bisa dihapus atau diedit.</>
                : <><b style={{ color: "#C25E3D" }}>Log terdeteksi diubah!</b> Rantai tidak konsisten mulai entri ke-{(entries.length - (tamperAt ?? 0))}. Hubungi admin.</>}
            </div>
          </div>

          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "#B8B0A8", fontSize: 13, paddingTop: 40 }}>Belum ada aktivitas tercatat.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((e) => (
                <div key={e.hash} style={{ background: "white", border: "1px solid #ECE7DD", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "#A6843F", background: "rgba(201,165,95,0.12)", border: "1px solid rgba(201,165,95,0.3)", borderRadius: 5, padding: "3px 7px", whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase" }}>
                    {TYPE_LABEL[e.type] ?? e.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#0B1129", lineHeight: 1.4 }}>{e.detail}</div>
                    <div style={{ fontSize: 11, color: "#7A776F", marginTop: 3 }}>{fmt(e.time)} · oleh <b style={{ color: "#0B1129" }}>{e.actor}</b></div>
                  </div>
                  <span style={{ fontSize: 10, color: "#C4C0B8", fontFamily: "monospace", flexShrink: 0 }}>#{e.seq}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
