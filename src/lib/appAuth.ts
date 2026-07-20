import { supabase } from "./supabase";

// Per-app auth: verify the POS password via Master Office and redeem the returned
// magic-link token for a Supabase session. Falls back to the legacy Supabase password
// so existing owners who haven't set a POS password yet still log in.
const AUTH_BASE = "https://masteroffice.sterith.com";

export async function appAuthLogin(email: string, password: string, app = "pos"): Promise<void> {
  let tokenHash: string | null = null;
  try {
    const res = await fetch(`${AUTH_BASE}/api/app-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, app, password }),
    });
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      tokenHash = j.token_hash ?? null;
    }
  } catch {
    /* network — fall through to legacy */
  }
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (error) throw error;
    return;
  }
  // Legacy fallback (migration): the old shared Supabase password.
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Re-verify the app password (owner-approval prompts) — no session minted.
export async function appAuthVerify(email: string, password: string, app = "pos"): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/app-auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, app, password }),
    });
    const j = await res.json().catch(() => ({}));
    return res.ok && !!j.ok;
  } catch {
    return false;
  }
}

// Resolve a ?setup_token to the registered email (does not consume it).
export async function appAuthSetupInfo(token: string): Promise<{ email: string | null; app: string | null }> {
  const res = await fetch(`${AUTH_BASE}/api/app-auth/setup?token=${encodeURIComponent(token)}`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || "Tautan tidak valid.");
  return { email: j.email ?? null, app: j.app ?? null };
}

// Redeem a ?setup_token to set this app's password. Returns the account email.
export async function appAuthSetup(token: string, password: string): Promise<{ email: string | null }> {
  const res = await fetch(`${AUTH_BASE}/api/app-auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || "Gagal menyimpan kata sandi.");
  return { email: j.email ?? null };
}
