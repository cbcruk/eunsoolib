# @eunsoolib/shopping

XState 기반 장바구니·쿠폰·주문 도메인 모델입니다.

쇼핑몰의 장바구니 → 주문서 흐름을 작은 단위로 쪼개 본 설계 실험입니다. 같은 장바구니 규칙(상품 `id` 기준, 최대 3개)을 XState 머신(`cartMachine`)과 클래스(`CartManager`) 두 방식으로 구현했고, 적용 쿠폰(`CouponManager`)과 주문서의 선택·수량(`OrderManager`)은 별도 매니저로 둡니다. 가격·할인 계산은 포함하지 않습니다.

## 설치

```bash
pnpm add @eunsoolib/shopping xstate
```

`xstate`(^5)는 패키지 의존성이지만, `cartMachine`을 실행하려면 앱에서 `createActor`를 직접 import해야 하므로 함께 설치합니다. 매니저 클래스만 쓴다면 필요 없습니다.

## 사용법

### XState 머신

```ts
import { createActor } from 'xstate'
import { cartMachine } from '@eunsoolib/shopping'

const actor = createActor(cartMachine).start()

actor.send({ type: 'ADD', params: { product: { id: 'p1' } } })
actor.send({ type: 'DELETE', params: { id: 'p1' } })
actor.send({ type: 'RESET' })

actor.getSnapshot().context.items // Map<string, { id: string }>
```

### 매니저 클래스

```ts
import { CartManager, CouponManager, OrderManager } from '@eunsoolib/shopping'

const cart = new CartManager()
cart.add({ id: 'p1' })
cart.add({ id: 'p2' })

const order = new OrderManager()
order.toggleCheck('p1')
order.setQty('p1', 2)

const coupon = new CouponManager()
coupon.setCoupon({ code: 'DISCOUNT10' })

// localStorage 등에 보관 후 복원
const restored = CartManager.fromJSON(JSON.stringify(cart))
const restoredOrder = OrderManager.fromJSON(JSON.stringify(order))
const restoredCoupon = CouponManager.fromJSON(coupon.toJSON())
```

## API

### `cartMachine`

단일 `active` 상태 머신. context는 `{ items: Map<string, { id: string }>, maxCount: 3 }`.

| 이벤트                                 | 동작                                  |
| -------------------------------------- | ------------------------------------- |
| `{ type: 'ADD', params: { product } }` | 담기. `items.size < 3`일 때만 (guard) |
| `{ type: 'DELETE', params: { id } }`   | `id`로 빼기                           |
| `{ type: 'RESET' }`                    | 새 `Map`으로 비우기                   |

한도에 걸린 `ADD`는 에러 없이 무시됩니다.

### `new CartManager(initialItems?)`

`initialItems`는 `Map<CartProductId, CartProduct>`이며 복사해서 보관합니다.

| 메서드                       | 설명                                                |
| ---------------------------- | --------------------------------------------------- |
| `add(product)`               | 담기. 같은 `id`는 덮어씀. 이미 3개면 `Error`를 던짐 |
| `delete(id)`                 | 빼기. 없는 `id`는 무시                              |
| `getItems()`                 | `CartProduct[]`                                     |
| `toJSON()`                   | `[id, product][]`                                   |
| `CartManager.fromJSON(data)` | `JSON.stringify(cart)` 문자열로부터 복원            |

타입: `CartProduct = { id: CartProductId }`, `CartProductId = string`.

### `new CouponManager(initialCoupon = null)`

쿠폰 하나만 보관합니다. `setCoupon(coupon)`(교체) / `resetCoupon()` / `getCoupon()`(없으면 `null`) / `toJSON()` / `CouponManager.fromJSON(data)`(빈 문자열이면 미적용).
`toJSON()`은 다른 매니저와 달리 **이미 직렬화된 문자열**을 반환하므로 `fromJSON(coupon.toJSON())`처럼 그대로 넘깁니다. `Coupon` 타입은 `{}`로, 필드를 강제하지 않습니다.

### `new OrderManager(checked?, qty?)`

상품 `id`별 선택 여부(`Map<CartProductId, boolean>`)와 수량(`Map<CartProductId, number>`)을 보관합니다.

| 메서드                        | 설명                                                |
| ----------------------------- | --------------------------------------------------- |
| `toggleCheck(id)`             | 선택 여부 반전 (기본 `false`)                       |
| `isChecked(id)`               | 선택 여부                                           |
| `setQty(id, value)`           | 수량 지정 (값 검증 없음)                            |
| `getQty(id)`                  | 수량 (기본 `1`)                                     |
| `toJSON()`                    | `{ checked: [id, boolean][], qty: [id, number][] }` |
| `OrderManager.fromJSON(json)` | `JSON.stringify(order)` 문자열로부터 복원           |

## 설계 노트

- 네 구성 요소는 서로를 참조하지 않습니다. `OrderManager`는 `CartProductId` 타입만 공유할 뿐 장바구니에 실제로 담긴 상품인지 확인하지 않습니다.
- 한도 초과 처리 방식이 다릅니다. 머신은 guard로 이벤트를 무시하고, `CartManager`는 예외를 던집니다. 두 구현 모두 한도에 도달하면 이미 담긴 `id`를 다시 담는(덮어쓰기) 것도 막힙니다.
- `fromJSON`은 입력을 검증하지 않아, 복원 시에는 최대 개수 제한도 적용되지 않습니다.
