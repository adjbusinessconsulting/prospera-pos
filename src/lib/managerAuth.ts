import type { CashierDB } from "../types";

// Manager-override permissions (Phase 2). A gated action at the register (void,
// discount, product edit, …) needs approval: the owner (Pemilik) can always approve;
// a Manajer only if the owner enabled that action in Back Office. The credential is a
// PIN or a password depending on the store's approvalMethod.

export const PERM_LABELS: Record<string, string> = {
  void: "Void / batalkan transaksi",
  discount: "Diskon / ubah harga",
  products: "Kelola produk",
  shifts: "Kelola shift",
  cashDrawer: "Kas laci",
  stock: "Kelola stok",
  reports: "Lihat laporan",
};

function roleOf(c: CashierDB): string { return (c.role ?? "").toLowerCase(); }
function isOwner(c: CashierDB): boolean { const r = roleOf(c); return r === "owner" || r === "pemilik"; }
function isManager(c: CashierDB): boolean { return roleOf(c) === "manajer"; }

// True if `credential` (PIN or password per `method`) belongs to someone allowed to
// approve `action`.
export function verifyApproval(
  action: string,
  credential: string,
  method: string,
  cashiers: CashierDB[],
  managerPerms: Record<string, boolean>,
): boolean {
  const cred = credential.trim();
  if (!cred) return false;
  for (const c of cashiers) {
    const stored = method === "password" ? (c.password ?? "") : (c.pin ?? "");
    if (!stored || String(stored).trim() !== cred) continue;
    if (isOwner(c)) return true;                                  // owner does everything
    if (isManager(c) && managerPerms[action]) return true;        // manager if enabled
  }
  return false;
}
