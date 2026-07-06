import { create } from 'zustand';
import type { CartItem, CashierDB, Product, Screen, ShiftDef } from './types';
import { PRODUCTS } from './data';

interface POSState {
  screen: Screen;
  selectedCashier: string;
  cashierName: string;
  cashierInitials: string;
  selectedShift: number;
  selectedShiftName: string;
  dbShifts: ShiftDef[];
  pin: string;
  cart: CartItem[];
  category: string;
  search: string;
  paymentMethod: string;
  cashReceived: number;
  trxCounter: number;

  storeId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeTier: string;
  qrisImageUrl: string;
  midtransClientKey: string;
  dbCashiers: CashierDB[];
  checkinPhoto: string | null;
  products: Product[];
  isDemoMode: boolean;

  setScreen: (s: Screen) => void;
  setDemoMode: (v: boolean) => void;
  selectCashier: (id: string) => void;
  setShift: (n: number) => void;
  setDbShifts: (shifts: ShiftDef[]) => void;
  addPin: (digit: string) => void;
  removePin: () => void;
  clearPin: () => void;
  addToCart: (product: Product) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  setCategory: (c: string) => void;
  setSearch: (s: string) => void;
  setPaymentMethod: (m: string) => void;
  setCashReceived: (n: number) => void;
  addCash: (n: number) => void;
  restart: () => void;
  signOut: () => void;
  setCheckinPhoto: (photo: string) => void;
  setProductsFromDB: (products: Product[]) => void;
  setDbCashiers: (cashiers: CashierDB[]) => void;
  setTrxCounter: (n: number) => void;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  setStoreData: (id: string, name: string, address: string, cashiers: CashierDB[], phone?: string, qrisImageUrl?: string, midtransClientKey?: string, tier?: string) => void;
}

function currentShiftFromTime(): 1 | 2 | 3 {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

// Fallback labels for stores that haven't configured shift slots yet.
const FALLBACK_SHIFT_LABELS: Record<number, string> = { 1: 'Shift 1 · Pagi', 2: 'Shift 2 · Siang', 3: 'Shift 3 · Malam' };

// Display name for the shift at 1-based position `n`: configured shift name if any, else fallback.
export function shiftNameFor(dbShifts: ShiftDef[], n: number): string {
  if (dbShifts.length > 0) return dbShifts[n - 1]?.name ?? `Shift ${n}`;
  return FALLBACK_SHIFT_LABELS[n] ?? `Shift ${n}`;
}

// Synchronous check at store creation time — before any React renders or Supabase async work.
// A password-reset link can arrive in several shapes depending on the email flow:
//   - implicit:   #access_token=...&type=recovery
//   - PKCE:       ?code=...
//   - token_hash: ?token_hash=...&type=recovery   (scanner-proof flow)
//   - errors:     #error=...&error_code=otp_expired  (expired/used link)
// We route to the reset screen for all of them (errors included, so we can show a
// friendly "request a new link" message instead of dumping the user on login).
function _detectResetFlow(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const has = (k: string) => q.has(k) || h.has(k);
  const isRecovery = q.get('type') === 'recovery' || h.get('type') === 'recovery';
  return has('code') || has('token_hash') || isRecovery || has('error_code') || has('error');
}
const _startsAsReset = _detectResetFlow();

export const useStore = create<POSState>((set) => ({
  screen: _startsAsReset ? 'reset-password' : 'owner-login',
  selectedCashier: 'ae',
  cashierName: 'Aerith',
  cashierInitials: 'AE',
  selectedShift: currentShiftFromTime(),
  selectedShiftName: FALLBACK_SHIFT_LABELS[currentShiftFromTime()],
  dbShifts: [],
  pin: '',
  cart: [],
  category: 'Semua',
  search: '',
  paymentMethod: 'tunai',
  cashReceived: 200000,
  trxCounter: 42,

  storeId: '',
  storeName: '',
  storeAddress: '',
  storePhone: '',
  storeTier: 'free',
  qrisImageUrl: '',
  midtransClientKey: '',
  dbCashiers: [],
  checkinPhoto: null,
  products: [...PRODUCTS],
  isDemoMode: false,

  setScreen: (screen) => set({ screen }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),

  selectCashier: (id) => set((s) => {
    const cashier = s.dbCashiers.find(c => c.id === id);
    const name = cashier ? cashier.name.split(' ')[0] : (id === 'ae' ? 'Aerith' : id === 'st' ? 'Stevany' : 'Anthony');
    const initials = cashier ? cashier.initials : (id === 'ae' ? 'AE' : id === 'st' ? 'ST' : 'AN');
    return { selectedCashier: id, cashierName: name, cashierInitials: initials };
  }),

  setShift: (n) => set((s) => ({ selectedShift: n, selectedShiftName: shiftNameFor(s.dbShifts, n) })),
  setDbShifts: (dbShifts) => set((s) => ({ dbShifts, selectedShiftName: shiftNameFor(dbShifts, s.selectedShift) })),

  addPin: (digit) => set(s => ({ pin: s.pin.length < 4 ? s.pin + digit : s.pin })),
  removePin: () => set(s => ({ pin: s.pin.slice(0, -1) })),
  clearPin: () => set({ pin: '' }),

  addToCart: (product) => set(s => {
    const existing = s.cart.find(i => i.product.id === product.id);
    if (existing) return { cart: s.cart.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i) };
    return { cart: [...s.cart, { product, qty: 1 }] };
  }),

  updateQty: (id, delta) => set(s => {
    const updated = s.cart.map(i => i.product.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0);
    return { cart: updated };
  }),

  clearCart: () => set({ cart: [] }),
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCashReceived: (cashReceived) => set({ cashReceived }),
  addCash: (n) => set(s => ({ cashReceived: s.cashReceived + n })),

  restart: () => set(s => ({
    screen: 'sales',
    cart: [],
    pin: '',
    paymentMethod: 'tunai',
    cashReceived: 200000,
    trxCounter: s.trxCounter + 1,
  })),

  signOut: () => set({
    screen: 'owner-login',
    cart: [],
    pin: '',
    paymentMethod: 'tunai',
    cashReceived: 200000,
    selectedCashier: 'ae',
    cashierName: 'Aerith',
    cashierInitials: 'AE',
    storeId: '',
    storeName: '',
    storeAddress: '',
    storeTier: 'free',
    qrisImageUrl: '',
    midtransClientKey: '',
    dbCashiers: [],
    dbShifts: [],
    trxCounter: 42,
    isDemoMode: false,
  }),

  setCheckinPhoto: (photo) => set({ checkinPhoto: photo }),
  setProductsFromDB: (products) => set({ products }),
  setDbCashiers: (dbCashiers) => set({ dbCashiers }),
  setTrxCounter: (n) => set({ trxCounter: n }),
  addProduct: (product) => set(s => ({ products: [...s.products, product] })),
  updateProduct: (id, updates) => set(s => ({
    products: s.products.map(p => p.id === id ? { ...p, ...updates } : p),
    cart: s.cart.map(i => i.product.id === id ? { ...i, product: { ...i.product, ...updates } } : i),
  })),

  setStoreData: (id, name, address, cashiers, phone = '', qrisImageUrl = '', midtransClientKey = '', tier = 'free') => set({
    storeId: id,
    storeName: name,
    storeAddress: address,
    storePhone: phone,
    storeTier: tier,
    qrisImageUrl,
    midtransClientKey,
    dbCashiers: cashiers,
    selectedCashier: cashiers.length > 0 ? cashiers[0].id : 'ae',
  }),
}));

export const getTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
export const getItemCount = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.qty, 0);
export const getTrxId = (counter: number) => `#TRX-${counter.toString().padStart(4, '0')}`;

const TIER_LEVELS: Record<string, number> = { free: 0, standard: 1, premium: 2, business: 3, enterprise: 4 };
export const tierLevel = (tier: string) => TIER_LEVELS[tier?.toLowerCase()] ?? 0;
export const isAtLeast = (tier: string, required: string) => tierLevel(tier) >= tierLevel(required);

// Per-tier limits (Jul 6 2026 update). Kasir/karyawan accounts include the owner.
const KASIR_LIMITS: Record<string, number> = { free: 3, standard: 10, premium: Infinity, business: Infinity, enterprise: Infinity };
export const kasirLimit = (tier: string) => KASIR_LIMITS[tier?.toLowerCase()] ?? 3;

const SHIFT_SLOT_LIMITS: Record<string, number> = { free: 1, standard: 5, premium: Infinity, business: Infinity, enterprise: Infinity };
export const shiftSlotLimit = (tier: string) => SHIFT_SLOT_LIMITS[tier?.toLowerCase()] ?? 1;

// The tier that lifts a given limit next — used for upgrade prompts.
export const nextTierLabel = (tier: string): string => {
  const lvl = tierLevel(tier);
  if (lvl < 1) return 'Standard';
  if (lvl < 2) return 'Premium';
  return 'Business';
};
