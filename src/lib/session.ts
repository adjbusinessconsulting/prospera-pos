// Cashier session grace: remember who's on the till so a quick app-switch (or the
// phone evicting the PWA from memory) doesn't force a PIN re-entry on return. The
// owner sets the window in Pengaturan (settings.sessionGraceMinutes; 0 = always PIN).

const KEY = "pos_session";

interface PosSession { storeId: string; cashierId: string; shift: number; lastSeen: number; }

export function saveSession(storeId: string, cashierId: string, shift: number): void {
  try { localStorage.setItem(KEY, JSON.stringify({ storeId, cashierId, shift, lastSeen: Date.now() } as PosSession)); } catch { /* ignore */ }
}

export function readSession(): PosSession | null {
  try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as PosSession) : null; } catch { return null; }
}

// Refresh lastSeen so an actively-used session doesn't age out.
export function touchSession(): void {
  const s = readSession();
  if (!s) return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, lastSeen: Date.now() })); } catch { /* ignore */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Valid if: grace is enabled, it's the same store, and the last activity is within
// the window.
export function sessionValid(s: PosSession | null, storeId: string, graceMinutes: number): s is PosSession {
  if (!s || graceMinutes <= 0) return false;
  if (s.storeId !== storeId) return false;
  return Date.now() - s.lastSeen < graceMinutes * 60_000;
}
