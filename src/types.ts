export type Screen = 'owner-login' | 'login' | 'checkin' | 'sales' | 'payment' | 'receipt' | 'riwayat' | 'produk' | 'kas' | 'laporan' | 'pindah-shift' | 'tutup-toko';

export interface Product {
  id: string;
  name: string;
  monogram: string;
  emoji: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  photo?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Cashier {
  id: string;
  initials: string;
  name: string;
  role: string;
  active?: boolean;
}

export interface CashierDB {
  id: string;
  store_id: string;
  name: string;
  initials: string;
  role: string;
  pin: string;
  active: boolean;
}

export interface StoreData {
  id: string;
  name: string;
  address: string;
}
