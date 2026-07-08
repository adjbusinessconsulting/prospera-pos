import type { CSSProperties } from "react";

interface DemoChooserProps {
  onClassic: () => void;
  onClose: () => void;
}

// Base-aware URLs for the bundled brand showcases (public/showcases/*).
const base = import.meta.env.BASE_URL || "/";
const FORE_URL = `${base}showcases/fore-coffee-pos.html`;
const AROBI_URL = `${base}showcases/kopi-arobi-pos.html`;

const OPTIONS = [
  {
    key: "classic",
    kind: "classic" as const,
    name: "Sterith POS",
    tag: "Klasik",
    desc: "Tampilan bawaan Sterith — kasir, produk, laporan.",
    accent: "#C9A55F",
    logo: `${base}mark-gold-512.png`,
    tileBg: "#0B1129",
    logoFit: "contain" as const,
  },
  {
    key: "fore",
    kind: "link" as const,
    href: FORE_URL,
    name: "Fore Coffee",
    tag: "Custom brand",
    desc: "Kedai kopi modern — identitas hijau, menu signature.",
    accent: "#1E9E5A",
    logo: `${base}showcases/img/logos/fore-pin.png`,
    tileBg: "#F4F2E8",
    logoFit: "contain" as const,
  },
  {
    key: "arobi",
    kind: "link" as const,
    href: AROBI_URL,
    name: "Kopi A'Robi",
    tag: "Custom brand",
    desc: "Coffee & eatery Palu — identitas merah, menu Nusantara.",
    accent: "#A81E2C",
    logo: `${base}showcases/img/logos/arobi-fb.png`,
    tileBg: "#A81E2C",
    logoFit: "cover" as const,
  },
];

export function DemoChooser({ onClassic, onClose }: DemoChooserProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(11,17,41,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "Inter, system-ui, sans-serif",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 720, background: "#FAFAF7", borderRadius: 20,
          padding: "26px 26px 24px", boxShadow: "0 30px 80px rgba(11,17,41,0.4)",
          maxHeight: "100%", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A55F", fontWeight: 700, margin: "0 0 6px" }}>
              Coba Demo
            </p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 500, color: "#0B1129", margin: 0, lineHeight: 1.1 }}>
              Pilih tampilan demo
            </h2>
            <p style={{ fontSize: 13, color: "#7A776F", margin: "6px 0 0", maxWidth: 440, lineHeight: 1.5 }}>
              Coba POS bawaan Sterith, atau lihat contoh POS yang dikustom untuk merek tertentu.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid #ECE7DD", background: "#fff", color: "#7A776F", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="demo-chooser-grid" style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {OPTIONS.map((o) => {
            const inner = (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0, overflow: "hidden",
                    background: o.tileBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <img
                      src={o.logo}
                      alt={o.name}
                      style={o.logoFit === "cover"
                        ? { width: "100%", height: "100%", objectFit: "cover" }
                        : { width: "74%", height: "74%", objectFit: "contain" }}
                    />
                  </div>
                  <span style={{
                    fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
                    color: o.kind === "classic" ? "#0B1129" : "#A6843F",
                    background: o.kind === "classic" ? "rgba(11,17,41,0.07)" : "rgba(201,165,95,0.12)",
                    border: `1px solid ${o.kind === "classic" ? "rgba(11,17,41,0.15)" : "rgba(201,165,95,0.35)"}`,
                    borderRadius: 5, padding: "3px 7px",
                  }}>{o.tag}</span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "#0B1129", marginBottom: 3 }}>{o.name}</div>
                <div style={{ fontSize: 12, color: "#7A776F", lineHeight: 1.5, flex: 1 }}>{o.desc}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11.5, fontWeight: 600, color: "#0B1129" }}>
                  {o.kind === "classic" ? "Mulai demo" : "Buka showcase"}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A55F" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </div>
              </>
            );
            const cardStyle: CSSProperties = {
              display: "flex", flexDirection: "column", textAlign: "left",
              background: "#fff", border: "1px solid #ECE7DD", borderRadius: 14,
              padding: 16, cursor: "pointer", minHeight: 168, width: "100%",
              textDecoration: "none", transition: "border-color .15s, transform .15s",
            };
            return o.kind === "classic" ? (
              <button
                key={o.key}
                onClick={onClassic}
                style={cardStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C9A55F"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ECE7DD"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {inner}
              </button>
            ) : (
              <a
                key={o.key}
                href={o.href}
                style={cardStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = o.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ECE7DD"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {inner}
              </a>
            );
          })}
        </div>
      </div>

      <style>{`
        .demo-chooser-grid { grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 640px) { .demo-chooser-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
