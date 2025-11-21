import { assign, setup } from 'xstate'

type CartProduct = {
  id: string
}

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
