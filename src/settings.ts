// POS feature settings — owner-controlled toggles. See §14 of the Tiers doc.
//
// Core rule: a toggle gates the NEW-entry surface only, never existing data.
// Turning "hutang" off stops new bons but Buku Hutang stays open; turning "kas"
// off stops new entries but the ledger stays viewable; etc.
//
// Defaults: everything ON except the two that add work to *every* transaction
// (fotoBuktiWajib, and inventory — inventory lives on the existing
// `inventoryEnabled` flag, not here). Owners turn OFF what they don't need.

export interface StoreSettings {
  // Payment methods (each hideable; debit/ewallet are Premium-gated anyway)
  pay_tunai: boolean;
  pay_qris: boolean;
  pay_transfer: boolean;
  pay_debit: boolean;
  pay_ewallet: boolean;
  // All tiers
  printReceipt: boolean;
  passwordConfirmPrice: boolean;
  receiptLogo: boolean;
  // Standard+
  hutang: boolean;
  kas: boolean;
  fotoBuktiWajib: boolean;   // enforcement — default OFF
  rekonsiliasi: boolean;
  pinWajib: boolean;
  gantiShift: boolean;
  whatsappShare: boolean;
  quickCash: number[];   // customizable "uang diterima" quick-add denominations
}

export const DEFAULT_SETTINGS: StoreSettings = {
  pay_tunai: true,
  pay_qris: true,
  pay_transfer: true,
  pay_debit: true,
  pay_ewallet: true,
  printReceipt: true,
  passwordConfirmPrice: true,
  receiptLogo: true,
  hutang: true,
  kas: true,
  fotoBuktiWajib: false,
  rekonsiliasi: true,
  pinWajib: true,   // Standard/Premium require a cashier PIN by default (safety); owner can turn off in Pengaturan
  gantiShift: true,
  whatsappShare: true,
  quickCash: [50000, 100000, 200000, 500000],
};

// Merge whatever is stored (possibly partial / from an older schema) over the
// defaults so a missing key always reads as its default rather than undefined.
export function mergeSettings(raw: unknown): StoreSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(raw as Partial<StoreSettings>) };
}
