# @eunsoolib/dayjs-utils

dayjs 기반의 하루 중 시간대 판정(`TimeRange`)과 하루 단위 날짜 커서(`DateNavigator`)입니다.

## 설치

```bash
pnpm add @eunsoolib/dayjs-utils dayjs
```

`TimeRange`에 기준 시각을 넘기려면 `Dayjs` 객체가 필요하므로 `dayjs`도 함께 설치합니다. 패키지를
import하면 전역 `dayjs`에 `isBetween`, `customParseFormat` 플러그인이 `dayjs.extend`로
등록됩니다.

## 사용법

### `TimeRange`

매일 반복되는 운영 시간·이벤트 시간대처럼 날짜와 무관한 시간대를 다룹니다.

```ts
import dayjs from 'dayjs'
import { TimeRange } from '@eunsoolib/dayjs-utils'

const range = new TimeRange('09:00:00', '18:00:00')

range.isActive() // 지금이 09:00:00 이상 18:00:00 미만인지
range.getRemainingTime() // { HH: '02', mm: '30', ss: '00' }

const noon = dayjs().hour(12).minute(0).second(0)
range.isActive(noon) // true

TimeRange.parseTime('08:30') // { HH: '08', mm: '30', ss: '00' }
TimeRange.now() // '14:05:09'
```

### `DateNavigator`

```ts
import { DateNavigator } from '@eunsoolib/dayjs-utils'

const nav = new DateNavigator('2025-05-06')

nav.previous() // '2025-05-05'
nav.next() // '2025-05-06'
nav.set('2025-12-25')
nav.get() // '2025-12-25'

const dotted = new DateNavigator('2025.05.06', 'YYYY.MM.DD')
dotted.next() // '2025.05.07'
```

## API

### `TimeRange`

#### `new TimeRange(startTime, endTime)`

두 인자 모두 `HH:mm:ss` 문자열입니다. 생성 시점에는 검증하지 않습니다.

#### `range.isActive(now?)`

`now`(기본 `dayjs()`)가 `[startTime, endTime)` 구간에 있으면 `true`를 반환합니다. 시작은 포함,
끝은 제외합니다. 시각 형식이 `HH:mm:ss`(strict)가 아니면 예외 대신 `false`를 반환합니다.

#### `range.getRemainingTime(now?)`

`now`부터 `endTime`까지 남은 시간을 `TimeParts`로 반환합니다.

- 이미 지났으면 `{ HH: '00', mm: '00', ss: '00' }`
- `endTime` 형식이 잘못됐으면 `null`
- 시작 전이어도 `startTime`이 아니라 `endTime`까지의 시간을 계산합니다.

#### `TimeRange.parseTime(time)`

`:`로 나눠 `TimeParts`를 반환하고, 없는 단위는 `'00'`으로 채웁니다. 형식 검증이나 자릿수 보정은
하지 않습니다.

#### `TimeRange.now()`

현재 시각을 `HH:mm:ss` 문자열로 반환합니다.

#### `TimeParts`

```ts
type TimeParts = { HH: string; mm: string; ss: string }
```

### `DateNavigator`

#### `new DateNavigator(initialDate, format?)`

`initialDate`를 `format`(기본 `'YYYY-MM-DD'`)으로 파싱해 현재 날짜로 삼습니다. 모든 반환값도 같은
포맷 문자열입니다.

| 메서드       | 반환     | 설명                          |
| ------------ | -------- | ----------------------------- |
| `next()`     | `string` | 하루 뒤로 이동 후 날짜 반환   |
| `previous()` | `string` | 하루 전으로 이동 후 날짜 반환 |
| `set(date)`  | `void`   | 현재 날짜를 `date`로 교체     |
| `get()`      | `string` | 현재 날짜 반환                |
| `toString()` | `string` | `get()`과 동일                |

인스턴스 내부 상태를 직접 바꾸는(mutable) 커서입니다.

## 제약

- `TimeRange`는 시각을 항상 **오늘 날짜**에 붙여 비교합니다. 다른 날짜의 `now`를 넘기면 그 날짜가
  아니라 오늘 기준으로 판정되고, `22:00:00` ~ `02:00:00`처럼 자정을 넘는 구간은 지원하지 않습니다.
- `DateNavigator`는 non-strict 파싱이라 잘못된 날짜를 넣어도 예외 없이 `'Invalid Date'`를
  반환할 수 있습니다.
