import { createClient } from '@supabase/supabase-js';

// Keep owners logged in all day: the session persists and the token silently
// auto-refreshes in the background (survives reloads, backgrounding, expiry).
// Trim: a value pasted into a dashboard can pick up a trailing space/newline,
// which silently corrupts a JWT signature ("Invalid API key") or a URL.
const clean = (v: string | undefined) => (v ?? "").trim();

export const supabase = createClient(
  clean(import.meta.env.VITE_SUPABASE_URL),
  clean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  { auth: { persistSession: true, autoRefreshToken: true } },
);
