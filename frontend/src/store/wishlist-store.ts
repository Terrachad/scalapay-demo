'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  description?: string;
  addedAt: Date;
}

interface WishlistStore {
  items: WishlistItem[];
  addToWishlist: (item: Omit<WishlistItem, 'addedAt'>) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: () => void;
  isInWishlist: (id: string) => boolean;
  getWishlistCount: () => number;
  moveToCart: (id: string) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToWishlist: (item) => {
        const { items } = get();
        const existingItem = items.find((i) => i.id === item.id);

        if (!existingItem) {
          set({
            items: [...items, { ...item, addedAt: new Date() }],
          });
        }
      },

      removeFromWishlist: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      isInWishlist: (id) => {
        const { items } = get();
        return items.some((item) => item.id === id);
      },

      getWishlistCount: () => {
        const { items } = get();
        return items.length;
      },

      moveToCart: (id) => {
        const { items } = get();
        const item = items.find((i) => i.id === id);

        if (item) {
          // Remove from wishlist
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
          }));

          // Note: In a real app, you'd also add to cart here
          // For now, we just remove from wishlist
          console.log(`Moving item ${id} to cart`);
        }
      },
    }),
    {
      name: 'scalapay-wishlist',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
