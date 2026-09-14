import { z } from 'zod'

/** 찜 목록에 담기는 아이템의 zod 스키마. */
export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
})

/** {@link ItemSchema}에서 추론한 아이템 타입. */
export type Item = z.infer<typeof ItemSchema>

/** 찜 여부를 판별하는 아이템 식별자(`Item['id']`). */
export type LikeItemId = Item['id']
