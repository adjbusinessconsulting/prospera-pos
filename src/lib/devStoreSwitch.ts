import { useStore } from "../store";
import { releaseStore } from "./deviceLock";

// Injected by vite.config.ts from VERCEL_ENV === 'preview'.
declare const __STERITH_DEV__: boolean;

/**
 * True on Vercel preview builds and on the local dev server, false in production.
 *
 * Everything gated on this is a testing affordance. It is compiled out of a
 * production bundle entirely, so there is no path by which a customer reaches it
 * even if the UI were reachable some other way.
 */
export const IS_DEV_BUILD =
  (typeof __STERITH_DEV__ !== "undefined" && __STERITH_DEV__) || import.meta.env.DEV;

/**
 * Hop between the stores on this account without re-authenticating.
 *
 * The store picker shown at login is already a store switcher — the only reason
 * a tier change meant logging out and back in is that nothing returned you to it.
 * `signOut()` clears local state but leaves the Supabase session alone, and
 * OwnerLogin re-reads that session on mount, so this lands straight on the picker.
 *
 * The device lock is released first. Without that, the store being left keeps
 * this device recorded as its holder and would report itself as "sedang dipakai
 * di perangkat lain" when switched back to.
 */
export async function switchStore(): Promise<void> {
  const { storeId, isDemoMode, signOut } = useStore.getState();
  if (isDemoMode) return;            // the demo has one store; nothing to switch to
  if (storeId) await releaseStore(storeId);
  signOut();
}
