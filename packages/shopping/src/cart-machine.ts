import { assign, setup } from 'xstate'

type CartProduct = {
  id: string
}

/**
 * 장바구니 상태 머신
 *
 * 단일 `active` 상태에서 다음 이벤트를 처리한다.
 *
 * - `ADD` — 상품을 담는다. 같은 `id`는 덮어쓰며, 새 `id`는 `maxCount`(3개)에 도달하면 guard가 막아 무시된다
 * - `DELETE` — `id`로 상품을 뺀다
 * - `RESET` — 장바구니를 비운다
 *
 * context는 actor마다 새로 만들어지고, 이벤트를 처리할 때마다 `items`를 새 `Map`으로 교체한다.
 * 따라서 이전 스냅샷은 바뀌지 않고, 참조 비교 기반 셀렉터(`useSelector` 등)가 변경을 감지한다.
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
  context: () => ({
    items: new Map(),
    maxCount: 3,
  }),
  states: {
    active: {
      on: {
        ADD: {
          actions: assign({
            items: ({ event, context }) => {
              const items = new Map(context.items)

              items.set(event.params.product.id, event.params.product)

              return items
            },
          }),
          guard: ({ event, context }) => {
            return (
              context.items.has(event.params.product.id) ||
              context.items.size < context.maxCount
            )
          },
        },
        DELETE: {
          actions: assign({
            items: ({ event, context }) => {
              const items = new Map(context.items)

              items.delete(event.params.id)

              return items
            },
          }),
        },
        RESET: {
          actions: assign({
            items: () => new Map(),
          }),
        },
      },
    },
  },
})
