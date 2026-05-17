import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from './types';

interface OrderState {
  orders: Record<string, Order>; // keyed by order.id
  addOrder: (order: Order) => void;
  getOrder: (id: string) => Order | undefined;
  clearAll: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: {},
      addOrder: (order) =>
        set((state) => ({ orders: { ...state.orders, [order.id]: order } })),
      getOrder: (id) => get().orders[id],
      clearAll: () => set({ orders: {} }),
    }),
    { name: 'ambica-orders' },
  ),
);

/** Last placed order — for "thank you" pages that need quick access. */
export const selectLastOrder = (state: OrderState): Order | undefined => {
  const all = Object.values(state.orders);
  if (all.length === 0) return undefined;
  return all.reduce((latest, o) => (o.placedAt > latest.placedAt ? o : latest));
};
