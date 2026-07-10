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
  hutangCustomer: { name: string; phone: string } | null;
  trxCounter: number;

  storeId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeTier: string;
  inventoryEnabled: boolean;
  lowStockThreshold: number;
  receiptLogo: string;
  qrisImageUrl: string;
  midtransClientKey: string;
  dbCashiers: CashierDB[];
  checkinPhoto: string | null;
  products: Product[];
  isDemoMode: boolean;
  demoView: 'front' | 'back';
  subscriptionExpired: boolean;
  paidTier: string;
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;

  setScreen: (s: Screen) => void;
  setDemoMode: (v: boolean) => void;
  setDemoView: (v: 'front' | 'back') => void;
  setSubscription: (expired: boolean, paidTier: string) => void;
  setSyncStatus: (s: { isOnline?: boolean; pendingSyncCount?: number; lastSyncedAt?: string | null }) => void;
  setStoreTier: (tier: string) => void;
  setInventoryEnabled: (v: boolean) => void;
  setInventorySettings: (enabled: boolean, threshold: number) => void;
  setReceiptLogo: (v: string) => void;
  startDemo: () => void;
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
  setHutangCustomer: (c: { name: string; phone: string } | null) => void;
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
  const type = q.get('type') || h.get('type');
  const isSetPassword = type === 'recovery' || type === 'invite';   // reset link OR admin invite
  return has('code') || has('token_hash') || isSetPassword || has('error_code') || has('error');
}
const _startsAsReset = _detectResetFlow();

// Captured synchronously at load (before Supabase strips the hash): was this an admin invite
// (first-time password set) rather than a password reset? Used to tailor the set-password screen.
export const startedAsInvite = typeof window !== 'undefined' &&
  ((new URLSearchParams(window.location.search).get('type') === 'invite') ||
   (new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'invite'));

// Demo sandbox identity — shared by the ?demo=true URL flow (App.tsx) and the
// "Coba Demo" button on the login screen so both enter the exact same demo.
export const DEMO_STORE_ID = '42dea26b-82a2-4b1b-b5fd-c573687df422';
export const DEMO_CASHIER: CashierDB = {
  id: 'ae',
  store_id: DEMO_STORE_ID,
  name: 'Aerith Djiady',
  initials: 'AE',
  role: 'cashier',
  pin: '000000',
  active: true,
};

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
  hutangCustomer: null,
  trxCounter: 42,

  storeId: '',
  storeName: '',
  storeAddress: '',
  storePhone: '',
  storeTier: 'free',
  inventoryEnabled: true,
  lowStockThreshold: 5,
  receiptLogo: '',
  qrisImageUrl: '',
  midtransClientKey: '',
  dbCashiers: [],
  checkinPhoto: null,
  products: [...PRODUCTS],
  isDemoMode: false,
  demoView: 'front',
  subscriptionExpired: false,
  paidTier: '',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncCount: 0,
  lastSyncedAt: null,

  setScreen: (screen) => set({ screen }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
  setDemoView: (demoView) => set({ demoView }),
  setSubscription: (subscriptionExpired, paidTier) => set({ subscriptionExpired, paidTier }),
  setSyncStatus: (s) => set((st) => ({
    isOnline: s.isOnline ?? st.isOnline,
    pendingSyncCount: s.pendingSyncCount ?? st.pendingSyncCount,
    lastSyncedAt: s.lastSyncedAt !== undefined ? s.lastSyncedAt : st.lastSyncedAt,
  })),
  setStoreTier: (storeTier) => set({ storeTier }),
  setInventoryEnabled: (inventoryEnabled) => set({ inventoryEnabled }),
  setInventorySettings: (inventoryEnabled, lowStockThreshold) => set({ inventoryEnabled, lowStockThreshold }),
  setReceiptLogo: (receiptLogo) => set({ receiptLogo }),

  // Enter the full demo: premium tier + demo store, straight to Sales.
  // Ephemeral — nothing is written to Supabase while isDemoMode is true.
  startDemo: () => set({
    isDemoMode: true,
    demoView: 'front',
    subscriptionExpired: false,
    paidTier: '',
    storeId: DEMO_STORE_ID,
    storeName: 'Demo Toko',
    storeAddress: 'Jl. Diponegoro No. 24, Palu Timur',
    storePhone: '0812-3456-7890',
    storeTier: 'premium',
    inventoryEnabled: true,
    lowStockThreshold: 5,
    dbCashiers: [DEMO_CASHIER],
    selectedCashier: DEMO_CASHIER.id,
    cashierName: DEMO_CASHIER.name.split(' ')[0],
    cashierInitials: DEMO_CASHIER.initials,
    screen: 'sales',
  }),

  selectCashier: (id) => set((s) => {
    const cashier = s.dbCashiers.find(c => c.id === id);
    const name = cashier ? cashier.name.split(' ')[0] : (id === 'ae' ? 'Aerith' : id === 'st' ? 'Stevany' : 'Anthony');
    const initials = cashier ? cashier.initials : (id === 'ae' ? 'AE' : id === 'st' ? 'ST' : 'AN');
    return { selectedCashier: id, cashierName: name, cashierInitials: initials };
  }),

  setShift: (n) => set((s) => ({ selectedShift: n, selectedShiftName: shiftNameFor(s.dbShifts, n) })),
  setDbShifts: (dbShifts) => set((s) => ({ dbShifts, selectedShiftName: shiftNameFor(dbShifts, s.selectedShift) })),

  addPin: (digit) => set(s => ({ pin: s.pin.length < 6 ? s.pin + digit : s.pin })),
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
  setHutangCustomer: (hutangCustomer) => set({ hutangCustomer }),
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
    inventoryEnabled: true,
    lowStockThreshold: 5,
    receiptLogo: '',
    qrisImageUrl: '',
    midtransClientKey: '',
    dbCashiers: [],
    dbShifts: [],
    trxCounter: 42,
    isDemoMode: false,
    subscriptionExpired: false,
    paidTier: '',
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

// Local (device-timezone) date as YYYY-MM-DD — used for the daily inventory ledger.
export const localDateISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
export const getItemCount = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.qty, 0);
export const getTrxId = (counter: number) => `#TRX-${counter.toString().padStart(4, '0')}`;

const TIER_LEVELS: Record<string, number> = { free: 0, standard: 1, premium: 2, business: 3, enterprise: 4 };
export const tierLevel = (tier: string) => TIER_LEVELS[tier?.toLowerCase()] ?? 0;
export const isAtLeast = (tier: string, required: string) => tierLevel(tier) >= tierLevel(required);

// Per-tier limits (Jul 6 2026 update). Kasir/karyawan accounts include the owner.
const KASIR_LIMITS: Record<string, number> = { free: 1, standard: 10, premium: Infinity, business: Infinity, enterprise: Infinity };
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
