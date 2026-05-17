import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/features/products/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...state.items, { product, qty }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),
      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId ? { ...i, qty } : i,
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'ambica-cart',
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Derived selectors                                                          */
/* Each returns a primitive so it's safe with zustand v5 + React 19 (which    */
/* uses Object.is for equality — returning a fresh object/array each call     */
/* would trigger an infinite re-render loop). Compose them in the component.  */
/* -------------------------------------------------------------------------- */

export const selectCartCount = (state: CartState): number =>
  state.items.reduce((acc, i) => acc + i.qty, 0);

export const selectSubtotal = (state: CartState): number =>
  state.items.reduce((acc, i) => acc + i.product.price * i.qty, 0);

export const selectMrpTotal = (state: CartState): number =>
  state.items.reduce((acc, i) => acc + i.product.mrp * i.qty, 0);
