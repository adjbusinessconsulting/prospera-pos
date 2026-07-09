import { useStore } from "../store";

// Append-only, tamper-EVIDENT activity log. Every entry embeds a hash of the
// previous one (a hash chain), so deleting or altering any entry breaks the chain
// and is detectable. There is intentionally NO delete/edit API — write-once.
// (Premium also mirrors entries to Backoffice's server; added separately.)

const KEY = "sterith_audit_log_v1";

export interface AuditEntry {
  seq: number;
  time: string;     // ISO timestamp
  actor: string;    // who did it (cashier)
  type: string;     // e.g. "product.add", "product.price", "stock.add"
  detail: string;   // human-readable, incl. old → new where relevant
  prevHash: string;
  hash: string;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function chainInput(e: Omit<AuditEntry, "hash">): string {
  return `${e.seq}|${e.time}|${e.actor}|${e.type}|${e.detail}|${e.prevHash}`;
}

function read(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: AuditEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getLog(): AuditEntry[] { return read(); }

// Append an entry. Logging must never throw into the calling action.
export async function logEvent(type: string, detail: string) {
  try {
    const list = read();
    const prev = list[list.length - 1];
    const s = useStore.getState();
    const base = {
      seq: (prev?.seq ?? 0) + 1,
      time: new Date().toISOString(),
      actor: s.cashierName || s.cashierInitials || "—",
      type,
      detail,
      prevHash: prev?.hash ?? "GENESIS",
    };
    const hash = await sha256(chainInput(base));
    list.push({ ...base, hash });
    write(list);
  } catch { /* never break the action */ }
}

// Verify the chain. Returns the index of the first broken entry, or -1 if intact.
export async function verifyLog(): Promise<number> {
  const list = read();
  let prevHash = "GENESIS";
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.prevHash !== prevHash) return i;
    const h = await sha256(chainInput(e));
    if (h !== e.hash) return i;
    prevHash = e.hash;
  }
  return -1;
}
