import { supabase } from "./supabase";
import { localDateISO } from "../store";
import { formatRp } from "../data";
import { logEvent } from "./auditlog";

// "Buka Toko" for the day: the opening cash float (modal awal) + when the store
// opened. localStorage (per store, per device) is the source of truth during the
// day — instant and offline-safe — and we best-effort mirror to the `day_opens`
// table for durability / cross-device. A record only counts if it's for TODAY,
// so a new calendar day re-prompts the Buka Toko screen.

const KEY = "sterith_dayopen_v1";
interface DayOpenRec { date: string; modal: number; openedAt: string }
function key(storeId: string): string { return `${KEY}:${storeId}`; }

function readToday(storeId: string): DayOpenRec | null {
  try {
    const r = JSON.parse(localStorage.getItem(key(storeId)) || "null") as DayOpenRec | null;
    return r && r.date === localDateISO() ? r : null;   // yesterday's record → treat as not-yet-opened
  } catch { return null; }
}

export function hasOpenedToday(storeId: string): boolean { return !!readToday(storeId); }
export function modalAwalToday(storeId: string): number { return readToday(storeId)?.modal ?? 0; }
export function openedAtToday(storeId: string): string | null { return readToday(storeId)?.openedAt ?? null; }

// Record the day's opening. Writes localStorage first (authoritative for the day),
// logs a shift.open entry, then mirrors to the server (non-blocking).
export async function saveDayOpen(storeId: string, modal: number, cashierName: string): Promise<void> {
  const rec: DayOpenRec = { date: localDateISO(), modal, openedAt: new Date().toISOString() };
  try { localStorage.setItem(key(storeId), JSON.stringify(rec)); } catch { /* ignore quota */ }
  void logEvent("shift.open", modal > 0 ? `Buka toko — modal awal ${formatRp(modal)}` : "Buka toko — tanpa modal awal");
  try {
    await supabase.from("day_opens").upsert(
      { store_id: storeId, business_date: rec.date, modal_awal: modal, opened_at: rec.openedAt, opened_by: cashierName || null },
      { onConflict: "store_id,business_date" },
    );
  } catch { /* offline or migration not run — localStorage still carries the day */ }
}
