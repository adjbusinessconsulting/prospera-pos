import type { CartItem } from "../types";

// "Tahan Pesanan" — held/parked orders. A cashier can save the current cart
// (e.g. the customer isn't ready to pay) and recall it later to settle. Stored
// per store on the device (localStorage) so it survives navigation and reloads.
// Not synced to the server — a held order only lives until it's settled here.

const KEY = "sterith_held_orders_v1";

export interface HeldOrder {
  id: string;
  label: string;          // optional name/table the cashier typed (or auto "Pesanan N")
  items: CartItem[];
  total: number;
  cashierName: string;
  createdAt: string;      // ISO
}

function skey(storeId: string) { return `${KEY}:${storeId}`; }

export function listHeld(storeId: string): HeldOrder[] {
  if (!storeId) return [];
  try { return JSON.parse(localStorage.getItem(skey(storeId)) || "[]"); } catch { return []; }
}

function writeHeld(storeId: string, list: HeldOrder[]) {
  try { localStorage.setItem(skey(storeId), JSON.stringify(list)); } catch { /* quota — ignore */ }
}

export function saveHeld(storeId: string, order: HeldOrder) {
  const list = listHeld(storeId);
  const i = list.findIndex(o => o.id === order.id);
  if (i >= 0) list[i] = order; else list.unshift(order);   // newest first
  writeHeld(storeId, list);
}

export function removeHeld(storeId: string, id: string) {
  writeHeld(storeId, listHeld(storeId).filter(o => o.id !== id));
}

export function heldCount(storeId: string): number { return listHeld(storeId).length; }
