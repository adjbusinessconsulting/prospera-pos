import { supabase } from "./supabase";

// Single active POS device per store. Each install/browser gets a stable device id
// in localStorage; entering a store "claims" it (last claim wins). A background
// heartbeat checks whether this device is still the current one — if another device
// has since claimed the store, this one signs itself out ("masuk di perangkat lain").
// Web vs installed PWA have separate storage, so they count as different devices.

const DEV_KEY = "sterith_device_id";

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEV_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEV_KEY, id); }
    return id;
  } catch {
    return "nodevice";
  }
}

// Claim the store for this device — called on store entry (i.e. right after login).
export async function claimStore(storeId: string): Promise<void> {
  try {
    await supabase.from("stores")
      .update({ active_device_id: deviceId(), active_device_at: new Date().toISOString() })
      .eq("id", storeId);
  } catch { /* offline — the heartbeat re-checks once back online */ }
}

// Does THIS device still own the store?
//  true  → yes (or the store was never claimed)
//  false → no, another device has taken over → caller should sign out
//  null  → couldn't tell (offline / error) → caller should do nothing
export async function ownsStore(storeId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.from("stores")
      .select("active_device_id").eq("id", storeId).maybeSingle();
    if (error || !data) return null;
    const cur = (data as { active_device_id?: string | null }).active_device_id;
    if (!cur) return true;                 // never claimed (pre-migration / old store)
    return cur === deviceId();
  } catch {
    return null;
  }
}
