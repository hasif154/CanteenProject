'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  canteenId: string | null;
  items: CartItem[];
  addItem: (canteenId: string, item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQty: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      canteenId: null,
      items: [],

      addItem: (canteenId, item) => {
        const state = get();
        // If switching canteen, clear cart first
        if (state.canteenId && state.canteenId !== canteenId) {
          set({ canteenId, items: [item] });
          return;
        }
        const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          set({
            items: state.items.map((i) =>
              i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ canteenId, items: [...state.items, item] });
        }
      },

      removeItem: (menuItemId) =>
        set((s) => ({ items: s.items.filter((i) => i.menuItemId !== menuItemId) })),

      updateQty: (menuItemId, delta) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i
            )
            .filter((i) => i.quantity > 0),
        })),

      clearCart: () => set({ canteenId: null, items: [] }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: 'canteen-cart' }
  )
);
