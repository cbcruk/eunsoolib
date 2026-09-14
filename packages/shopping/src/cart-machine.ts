import { assign, setup } from 'xstate'

type CartProduct = {
  id: string
}

/**
 * 장바구니 상태 머신
 *
 * 단일 `active` 상태에서 다음 이벤트를 처리한다.
 *
 * - `ADD` — 상품을 담는다. `maxCount`(3개)에 도달하면 guard가 막아 무시된다
 * - `DELETE` — `id`로 상품을 뺀다
 * - `RESET` — 장바구니를 비운다
 *
 * @example
 * ```ts
 * import { createActor } from 'xstate'
 * import { cartMachine } from '@cbcruk/shopping'
 *
 * const actor = createActor(cartMachine).start()
 * actor.send({ type: 'ADD', params: { product: { id: 'p1' } } })
 * actor.getSnapshot().context.items // Map { 'p1' => { id: 'p1' } }
 * ```
 */
export const cartMachine = setup({
  types: {
    context: {} as {
      items: Map<string, CartProduct>
      maxCount: 3
    },
    events: {} as
      | { type: 'ADD'; params: { product: CartProduct } }
      | { type: 'DELETE'; params: { id: CartProduct['id'] } }
      | { type: 'RESET' },
  },
}).createMachine({
  id: 'cart',
  initial: 'active',
  context: {
    items: new Map(),
    maxCount: 3,
  },
  states: {
    active: {
      on: {
        ADD: {
          actions: assign({
            items: ({ event, context }) => {
              context.items.set(event.params.product.id, event.params.product)
              return context.items
            },
          }),
          guard: ({ context }) => {
            return context.items.size < context.maxCount
          },
        },
        DELETE: {
          actions: assign({
            items: ({ event, context }) => {
              context.items.delete(event.params.id)
              return context.items
            },
          }),
        },
        RESET: {
          actions: assign({
            items: new Map(),
          }),
        },
      },
    },
  },
})
