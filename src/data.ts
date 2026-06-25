import type { Product, Cashier } from './types';

export const CASHIERS: Cashier[] = [
  { id: 'ra', initials: 'RA', name: 'Ratna A.', role: 'Kasir · Shift 2', active: true },
  { id: 'dw', initials: 'DW', name: 'Dewi W.', role: 'Kasir · Off' },
  { id: 'bs', initials: 'BS', name: 'Budi S.', role: 'Owner' },
];

export const PRODUCTS: Product[] = [
  { id: 'bp', name: 'Beras Pandan 5kg', monogram: 'Bp', category: 'SBK', unit: 'per karung', price: 75000, stock: 42 },
  { id: 'bm', name: 'Bimoli 2L', monogram: 'Bm', category: 'SBK', unit: 'botol', price: 38000, stock: 18 },
  { id: 'ig', name: 'Indomie Goreng', monogram: 'Ig', category: 'SNC', unit: 'pcs / dus', price: 3500, stock: 128 },
  { id: 'is', name: 'Indomie Soto', monogram: 'Is', category: 'SNC', unit: 'pcs / dus', price: 3500, stock: 96 },
  { id: 'gp', name: 'Gula Pasir 1kg', monogram: 'Gp', category: 'SBK', unit: 'per kg', price: 16000, stock: 24 },
  { id: 'tl', name: 'Telur Ayam', monogram: 'Tl', category: 'SBK', unit: 'per kg / butir', price: 28000, stock: 14 },
  { id: 'aq', name: 'Aqua 600ml', monogram: 'Aq', category: 'MIN', unit: 'botol', price: 4000, stock: 64 },
  { id: 'tp', name: 'Teh Pucuk 350ml', monogram: 'Tp', category: 'MIN', unit: 'botol', price: 4500, stock: 31 },
  { id: 'ka', name: 'Kapal Api Sachet', monogram: 'Ka', category: 'MIN', unit: 'sachet', price: 1500, stock: 220 },
  { id: 'sb', name: 'Susu Bendera 1L', monogram: 'Sb', category: 'MIN', unit: 'stok rendah', price: 22000, stock: 3 },
  { id: 'ry', name: 'Royco Ayam', monogram: 'Ry', category: 'BMB', unit: 'sachet', price: 1000, stock: 340 },
  { id: 'lb', name: 'Lifebuoy 85g', monogram: 'Lb', category: 'PRS', unit: 'batang', price: 4500, stock: 52 },
  { id: 'ps', name: 'Pepsodent 75g', monogram: 'Ps', category: 'PRS', unit: 'tube', price: 8500, stock: 22 },
  { id: 'mm', name: 'Marlboro Merah', monogram: 'Mm', category: 'RKK', unit: '16 batang', price: 32000, stock: 26 },
];

export const CATEGORIES = ['Semua', 'Sembako', 'Minuman', 'Snack', 'Rokok', 'Bumbu', 'Personal'];
const CAT_MAP: Record<string, string> = { SBK: 'Sembako', MIN: 'Minuman', SNC: 'Snack', RKK: 'Rokok', BMB: 'Bumbu', PRS: 'Personal' };
export const getCatLabel = (cat: string) => CAT_MAP[cat] || cat;

export const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
