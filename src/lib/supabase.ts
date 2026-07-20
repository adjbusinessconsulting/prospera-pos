import { createClient } from '@supabase/supabase-js';

// Keep owners logged in all day: the session persists and the token silently
// auto-refreshes in the background (survives reloads, backgrounding, expiry).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
