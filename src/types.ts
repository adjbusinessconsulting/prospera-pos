export type Screen = 'owner-login' | 'login' | 'sales' | 'payment' | 'receipt';

export interface Product {
  id: string;
  name: string;
  monogram: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
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
