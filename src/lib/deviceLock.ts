import { supabase } from "./supabase";

// Single active POS device per store. First device to log in HOLDS the store; a
// second device is blocked ("akun sudah masuk di perangkat lain") until the first
// logs out. Safety valves so nobody gets permanently locked out:
//  - the holder heartbeats `active_device_at`; if it goes silent (crash / closed
//    without logout) the lock is STALE after STALE_MS and a new login may take over.
//  - the blocked screen offers "Paksa masuk di sini" (force) which claims anyway.
// Web vs installed PWA have separate storage, so they count as different devices.

const DEV_KEY = "sterith_device_id";
const STALE_MS = 2 * 60 * 1000;   // lock older than 2 min → holder is gone

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEV_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEV_KEY, id); }
    return id;
  } catch {
    return "nodevice";
  }
}

// Is the store currently held by a DIFFERENT, still-active device?
//  true  → blocked (another live device holds it)
//  false → free / mine / stale / offline (caller may proceed)
export async function isLockedByOther(storeId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from("stores")
      .select("active_device_id, active_device_at").eq("id", storeId).maybeSingle();
    if (!data) return false;
    const id = (data as { active_device_id?: string | null }).active_device_id;
    const at = (data as { active_device_at?: string | null }).active_device_at;
    if (!id || id === deviceId()) return false;              // free, or already mine
    if (!at) return true;                                    // held but no heartbeat → treat as live
    return (Date.now() - new Date(at).getTime()) < STALE_MS; // live only if the heartbeat is recent
  } catch {
    return false;   // offline / error → fail open (don't block selling)
  }
}

// Claim the store for this device (on login / force login).
export async function claimStore(storeId: string): Promise<void> {
  try {
    await supabase.from("stores")
      .update({ active_device_id: deviceId(), active_device_at: new Date().toISOString() })
      .eq("id", storeId);
  } catch { /* offline — heartbeat re-claims once back online */ }
}

// Heartbeat: refresh my lock's timestamp so it stays "live". Only touches the row
// if I'm still the holder (avoids stomping a device that took over).
export async function touchLock(storeId: string): Promise<void> {
  try {
    await supabase.from("stores")
      .update({ active_device_at: new Date().toISOString() })
      .eq("id", storeId).eq("active_device_id", deviceId());
  } catch { /* ignore */ }
}

// Am I still the holder? true = yes/unclaimed, false = another device took over, null = unknown.
export async function ownsStore(storeId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.from("stores")
      .select("active_device_id").eq("id", storeId).maybeSingle();
    if (error || !data) return null;
    const cur = (data as { active_device_id?: string | null }).active_device_id;
    if (!cur) return true;
    return cur === deviceId();
  } catch {
    return null;
  }
}

// Release the lock on logout (only if I'm the holder), so another device can log in.
export async function releaseStore(storeId: string): Promise<void> {
  try {
    await supabase.from("stores")
      .update({ active_device_id: null, active_device_at: null })
      .eq("id", storeId).eq("active_device_id", deviceId());
  } catch { /* stale lock will time out anyway */ }
}
