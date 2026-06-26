import { create } from 'zustand';
import type { CartItem, Product, Screen } from './types';

interface POSState {
  screen: Screen;
  selectedCashier: string;
  pin: string;
  cart: CartItem[];
  category: string;
  search: string;
  paymentMethod: string;
  cashReceived: number;

  setScreen: (s: Screen) => void;
  selectCashier: (id: string) => void;
  addPin: (digit: string) => void;
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
}

export const useStore = create<POSState>((set) => ({
  screen: 'owner-login',
  selectedCashier: 'ra',
  pin: '',
  cart: [],
  category: 'Semua',
  search: '',
  paymentMethod: 'tunai',
  cashReceived: 200000,

  setScreen: (screen) => set({ screen }),
  selectCashier: (id) => set({ selectedCashier: id }),
  addPin: (digit) => set(s => ({ pin: s.pin.length < 6 ? s.pin + digit : s.pin })),
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

  restart: () => set({ screen: 'sales', cart: [], pin: '', paymentMethod: 'tunai', cashReceived: 200000 }),
  signOut: () => set({ screen: 'owner-login', cart: [], pin: '', paymentMethod: 'tunai', cashReceived: 200000, selectedCashier: 'ra' }),
}));

export const getTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
export const getItemCount = (cart: CartItem[]) => cart.reduce((sum, i) => sum + i.qty, 0);
