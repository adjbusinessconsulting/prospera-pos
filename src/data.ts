import type { Product, Cashier } from './types';

export const CASHIERS: Cashier[] = [
  { id: 'ae', initials: 'AE', name: 'Aerith D.',   role: 'Kasir · Shift 2', active: true },
  { id: 'st', initials: 'ST', name: 'Stevany C.',  role: 'Kasir · Shift 3' },
  { id: 'an', initials: 'AN', name: 'Anthony D.',  role: 'Owner · Shift 1' },
];

export const PRODUCTS: Product[] = [
  { id: 'bp', name: 'Beras Pandan 5kg',  monogram: 'Bp', emoji: '🌾', category: 'SBK', unit: 'per karung',      price: 75000,  stock: 42,  photo: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Five_kg_rice_bags.jpg' },
  { id: 'bm', name: 'Bimoli 2L',          monogram: 'Bm', emoji: '🫙', category: 'SBK', unit: 'botol',           price: 38000,  stock: 18,  photo: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/CanolaOil_bottle.jpg' },
  { id: 'ig', name: 'Indomie Goreng',     monogram: 'Ig', emoji: '🍜', category: 'SNC', unit: 'pcs / dus',       price: 3500,   stock: 128, photo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Indomie_Mi_goreng_%2803-07-2021%29.jpg' },
  { id: 'is', name: 'Indomie Soto',       monogram: 'Is', emoji: '🍜', category: 'SNC', unit: 'pcs / dus',       price: 3500,   stock: 96,  photo: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Indomie_Soto_Spesial.jpg' },
  { id: 'gp', name: 'Gula Pasir 1kg',    monogram: 'Gp', emoji: '🍬', category: 'SBK', unit: 'per kg',          price: 16000,  stock: 24,  photo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Granulated_White_Sugar_with_Large_Crystals%2C_Bright_Side_Light.jpg' },
  { id: 'tl', name: 'Telur Ayam',         monogram: 'Tl', emoji: '🥚', category: 'SBK', unit: 'per kg / butir',  price: 28000,  stock: 14,  photo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Telur_Ayam.jpg' },
  { id: 'aq', name: 'Aqua 600ml',         monogram: 'Aq', emoji: '💧', category: 'MIN', unit: 'botol',           price: 4000,   stock: 64,  photo: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/A_bottle_of_Aqua_mineral_water.JPG' },
  { id: 'tp', name: 'Teh Pucuk 350ml',   monogram: 'Tp', emoji: '🍵', category: 'MIN', unit: 'botol',           price: 4500,   stock: 31,  photo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Lipton_Ice_Tea_Green.JPG' },
  { id: 'ka', name: 'Kapal Api Sachet',   monogram: 'Ka', emoji: '☕', category: 'MIN', unit: 'sachet',          price: 1500,   stock: 220, photo: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portionssticks_%28Deutschland%2C_Italien%29_2021.jpg' },
  { id: 'sb', name: 'Susu Bendera 1L',   monogram: 'Sb', emoji: '🥛', category: 'MIN', unit: 'per liter',       price: 22000,  stock: 3,   photo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Drink_carton.JPG' },
  { id: 'ry', name: 'Royco Ayam',         monogram: 'Ry', emoji: '🧂', category: 'BMB', unit: 'sachet',          price: 1000,   stock: 340, photo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Chlorofeel_Spices_Mirchi_Powder_Packet.jpg' },
  { id: 'lb', name: 'Lifebuoy 85g',       monogram: 'Lb', emoji: '🧼', category: 'PRS', unit: 'batang',          price: 4500,   stock: 52,  photo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Lifebuoy_Health_soap.JPG' },
  { id: 'ps', name: 'Pepsodent 75g',     monogram: 'Ps', emoji: '🪥', category: 'PRS', unit: 'tube',            price: 8500,   stock: 22,  photo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toothpaste.jpg' },
  { id: 'mm', name: 'Marlboro Merah',     monogram: 'Mm', emoji: '🚬', category: 'RKK', unit: '16 batang',       price: 32000,  stock: 26,  photo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Marlboro_Reds.JPG' },
];

export const CATEGORIES = ['Semua', 'Sembako', 'Minuman', 'Snack', 'Rokok', 'Bumbu', 'Personal'];
const CAT_MAP: Record<string, string> = { SBK: 'Sembako', MIN: 'Minuman', SNC: 'Snack', RKK: 'Rokok', BMB: 'Bumbu', PRS: 'Personal' };
export const getCatLabel = (cat: string) => CAT_MAP[cat] || cat;
export const CATEGORY_OPTIONS = [
  { id: 'SBK', label: 'Sembako' },
  { id: 'MIN', label: 'Minuman' },
  { id: 'SNC', label: 'Snack' },
  { id: 'RKK', label: 'Rokok' },
  { id: 'BMB', label: 'Bumbu' },
  { id: 'PRS', label: 'Personal' },
];

export const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export function formatIDRInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('id-ID');
}

export function parseIDRInput(formatted: string): number {
  return parseInt(formatted.replace(/\./g, ''), 10) || 0;
}
