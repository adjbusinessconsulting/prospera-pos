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

export interface SaleItem {
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  trx_id: string;
  cashier_id: string;
  cashier_name: string;
  shift: number;
  total: number;
  payment_method: string;
  cash_received: number;
  change_amount: number;
  created_at: string;
  sale_items: SaleItem[];
}
