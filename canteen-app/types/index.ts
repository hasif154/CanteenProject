// ============================================================
// Shared TypeScript Types — Sathyabama Canteen
// ============================================================

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string | null;
  isVeg: boolean;
  image: string | null;
  available: boolean;
}

export interface Canteen {
  name: string;
  menuVersion: string;
  lastUpdated: string;
  items: MenuItem[];
}

export interface CanteenMap {
  [canteenId: string]: Canteen;
}

export interface MenuJson {
  canteens: CanteenMap;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string | null;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string | null;
}

export type OrderStatus = 'PLACED' | 'COLLECTED';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface Order {
  id: string;
  canteen_id: string;
  canteen_name: string;
  student_id: string;
  student_name: string;
  items: OrderItem[];
  total_amount: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  razorpay_payment_id?: string;
  paid_at?: string;
  collected_at?: string;
}

export interface AdminSession {
  canteenId: string;
  loginTime: string;
}

export interface StudentSession {
  registerNumber: string;
  name: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
