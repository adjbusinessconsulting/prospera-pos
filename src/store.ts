import { create } from 'zustand';
import type { CartItem, CashierDB, Product, Screen } from './types';
import { PRODUCTS } from './data';

interface POSState {
  screen: Screen;
  selectedCashier: string;
  cashierName: string;
  cashierInitials: string;
  selectedShift: 1 | 2 | 3;
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
  dbCashiers: CashierDB[];
  checkinPhoto: string | null;
  products: Product[];

  setScreen: (s: Screen) => void;
  selectCashier: (id: string) => void;
  setShift: (n: 1 | 2 | 3) => void;
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
  addProduct: (p: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  setStoreData: (id: string, name: string, address: string, cashiers: CashierDB[], phone?: string) => void;
}

function currentShiftFromTime(): 1 | 2 | 3 {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

export const useStore = create<POSState>((set) => ({
  screen: 'owner-login',
  selectedCashier: 'ae',
  cashierName: 'Aerith',
  cashierInitials: 'AE',
  selectedShift: currentShiftFromTime(),
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
  dbCashiers: [],
  checkinPhoto: null,
  products: [...PRODUCTS],

  setScreen: (screen) => set({ screen }),

  selectCashier: (id) => set((s) => {
    const cashier = s.dbCashiers.find(c => c.id === id);
    const name = cashier ? cashier.name.split(' ')[0] : (id === 'ae' ? 'Aerith' : id === 'st' ? 'Stevany' : 'Anthony');
    const initials = cashier ? cashier.initials : (id === 'ae' ? 'AE' : id === 'st' ? 'ST' : 'AN');
    return { selectedCashier: id, cashierName: name, cashierInitials: initials };
  }),

  setShift: (n) => set({ selectedShift: n }),

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
    dbCashiers: [],
    trxCounter: 42,
  }),

  setCheckinPhoto: (photo) => set({ checkinPhoto: photo }),
  addProduct: (product) => set(s => ({ products: [...s.products, product] })),
  updateProduct: (id, updates) => set(s => ({
    products: s.products.map(p => p.id === id ? { ...p, ...updates } : p),
    cart: s.cart.map(i => i.product.id === id ? { ...i, product: { ...i.product, ...updates } } : i),
  })),

  setStoreData: (id, name, address, cashiers, phone = '') => set({
    storeId: id,
    storeName: name,
    storeAddress: address,
    storePhone: phone,
    dbCashiers: cashiers,
    selectedCashier: cashiers.length > 0 ? cashiers[0].id : 'ae',
  }),
}));

export const getTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
export const getItemCount = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.qty, 0);
export const getTrxId = (counter: number) => `#TRX-${counter.toString().padStart(4, '0')}`;
