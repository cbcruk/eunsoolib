import { z } from 'zod'

export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
})

export type Item = z.infer<typeof ItemSchema>

export type LikeItemId = Item['id']
