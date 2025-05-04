import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
})

export const ItemListSchema = z.array(ItemSchema)

export type Item = z.infer<typeof ItemSchema>

export type LikesItem = Item
export type LikesItemId = LikesItem['id']

export type LikesState = {
  likes: Item[]
  addItem: (item: LikesItem) => void
  removeItem: (id: LikesItemId) => void
  removeItems: (ids: LikesItemId[]) => void
  clear: () => void
}

export const useLikesStore = create<LikesState>()((set) => ({
  likes: [],
  addItem: (item) =>
    set((state) =>
      state.likes.some((i) => i.id === item.id)
        ? state
        : { likes: [...state.likes, item] }
    ),
  toggleItem: (item: LikesItem) =>
    set((state) => {
      const exists = state.likes.some((i) => i.id === item.id)

      return {
        likes: exists
          ? state.likes.filter((i) => i.id !== item.id)
          : [...state.likes, item],
      }
    }),
  removeItem: (id) =>
    set((state) => ({
      likes: state.likes.filter((item) => item.id !== id),
    })),
  removeItems: (ids) =>
    set((state) => ({
      likes: state.likes.filter((item) => !ids.includes(item.id)),
    })),
  clear: () => set({ likes: [] }),
}))

export const useLikesStoreWith = persist(useLikesStore, {
  name: 'likes-storage',
  version: 1,
  migrate: (persistedState, _version) => {
    return persistedState as LikesState
  },
})
