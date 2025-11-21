import { z } from 'zod'

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
})

export type Item = z.infer<typeof ItemSchema>

type ItemId = Item['id']

export class LikeManager {
  private items: Item[] = []

  getItems() {
    return this.items
  }

  hasItem(id: number) {
    return this.items.some((item) => item.id === id)
  }

  add(item: Item) {
    if (!this.hasItem(item.id)) {
      this.items.push(item)
    }
  }

  remove(id: ItemId) {
    this.items = this.items.filter((item) => item.id !== id)
  }

  removeMany(ids: ItemId[]) {
    ids.forEach((id) => {
      this.remove(id)
    })
  }

  toggle(item: Item) {
    this.hasItem(item.id) ? this.remove(item.id) : this.add(item)
  }

  clear() {
    this.items = []
  }
}
