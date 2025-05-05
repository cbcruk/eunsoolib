import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Item } from './like-manager'

export type LikesItem = Item
export type LikesItemId = LikesItem['id']

export type LikesState = {
  likes: Item[]
  addItem: (item: LikesItem) => void
  removeItem: (id: LikesItemId) => void
  removeItems: (ids: LikesItemId[]) => void
  clear: () => void
}

export const useLikesStore = create<LikesState>()((_set) => ({
  likes: [],
  addItem: (_item) => {},
  removeItem: (_id) => {},
  removeItems(_ids) {},
  clear: () => {},
}))

export const useLikesStoreWith = persist(useLikesStore, {
  name: 'likes-storage',
  version: 1,
  migrate: (persistedState, _version) => {
    return persistedState as LikesState
  },
})
