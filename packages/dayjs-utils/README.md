# @cbcruk/dayjs-utils

dayjs 기반의 하루 중 시간대 판정(`TimeRange`)과 하루 단위 날짜 커서(`DateNavigator`)입니다.

## 설치

```bash
pnpm add @cbcruk/dayjs-utils dayjs
```

`TimeRange`에 기준 시각을 넘기려면 `Dayjs` 객체가 필요하므로 `dayjs`도 함께 설치합니다. 각 모듈은
필요한 플러그인을 직접 `dayjs.extend`로 등록하므로, 패키지를 import하면 전역 `dayjs`에
`isBetween`(`TimeRange`), `customParseFormat`(`TimeRange`, `DateNavigator`) 플러그인이 등록됩니다.

## 사용법

### `TimeRange`

매일 반복되는 운영 시간·이벤트 시간대처럼 날짜와 무관한 시간대를 다룹니다. 시각은 기준 시각(`now`)의
날짜에 붙여 비교합니다.

```ts
import dayjs from 'dayjs'
import { TimeRange } from '@cbcruk/dayjs-utils'

const range = new TimeRange('09:00:00', '18:00:00')

range.isActive() // 지금이 09:00:00 이상 18:00:00 미만인지
range.getRemainingTime() // { HH: '02', mm: '30', ss: '00' }

const noon = dayjs().hour(12).minute(0).second(0)
range.isActive(noon) // true
range.isActive(dayjs('2020-01-01T12:00:00')) // true — 넘긴 날짜 기준으로 판정

// endTime이 startTime보다 이르면 자정을 넘는 구간
const night = new TimeRange('22:00:00', '02:00:00')
night.isActive(dayjs('2025-05-07T01:00:00')) // true
night.getRemainingTime(dayjs('2025-05-06T23:30:00')) // { HH: '02', mm: '30', ss: '00' }

TimeRange.parseTime('08:30') // { HH: '08', mm: '30', ss: '00' }
TimeRange.now() // '14:05:09'
```

### `DateNavigator`

```ts
import { DateNavigator } from '@cbcruk/dayjs-utils'

const nav = new DateNavigator('2025-05-06')

nav.previous() // '2025-05-05'
nav.next() // '2025-05-06'
nav.set('2025-12-25')
nav.get() // '2025-12-25'

const dotted = new DateNavigator('06.05.2025', 'DD.MM.YYYY')
dotted.next() // '07.05.2025'

new DateNavigator('2025-02-30') // Error: Invalid date string
```

## API

### `TimeRange`

#### `new TimeRange(startTime, endTime)`

두 인자 모두 `HH:mm:ss` 문자열입니다. 생성 시점에는 검증하지 않습니다.

`endTime`이 `startTime`보다 이르면(예: `'22:00:00'` ~ `'02:00:00'`) 자정을 넘어 다음 날까지 이어지는
구간으로 봅니다. 두 값이 같으면 빈 구간입니다.

#### `range.isActive(now?)`

`now`(기본 `dayjs()`)가 `[startTime, endTime)` 구간에 있으면 `true`를 반환합니다. 시작은 포함,
끝은 제외합니다. 두 시각은 `now`와 같은 날짜에 붙여 비교하며, 자정을 넘는 구간은 `startTime` 이후이거나
`endTime` 이전이면 `true`입니다. 시각 형식이 `HH:mm:ss`(strict)가 아니면 예외 대신 `false`를
반환합니다.

#### `range.getRemainingTime(now?)`

`now`부터 `endTime`까지 남은 시간을 `TimeParts`로 반환합니다.

- `endTime`은 `now`와 같은 날짜 기준입니다. 자정을 넘는 구간에서 `now`가 그날의 `endTime` 이후라면
  다음 날 `endTime`까지 계산합니다.
- 이미 지났으면 `{ HH: '00', mm: '00', ss: '00' }`
- `startTime` 또는 `endTime` 형식이 잘못됐으면 `null`
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

`initialDate`를 `format`(기본 `'YYYY-MM-DD'`)으로 **strict** 파싱해 현재 날짜로 삼습니다. 모든
반환값도 같은 포맷 문자열입니다. 형식이 다르거나(`'2025-5-6'`) 존재하지 않는 날짜(`'2025-02-30'`)면
`Error`를 던집니다.

| 메서드       | 반환     | 설명                          |
| ------------ | -------- | ----------------------------- |
| `next()`     | `string` | 하루 뒤로 이동 후 날짜 반환   |
| `previous()` | `string` | 하루 전으로 이동 후 날짜 반환 |
| `set(date)`  | `void`   | 현재 날짜를 `date`로 교체     |
| `get()`      | `string` | 현재 날짜 반환                |
| `toString()` | `string` | `get()`과 동일                |

인스턴스 내부 상태를 직접 바꾸는(mutable) 커서입니다. `set(date)`도 생성자와 같이 strict 파싱하며,
잘못된 값이면 `Error`를 던지고 현재 날짜를 유지합니다.

## 제약

- `TimeRange`는 날짜 없는 시각만 다루므로 여러 날에 걸친(24시간 이상) 구간은 표현할 수 없습니다.
- `DateNavigator`의 `format`은 dayjs `customParseFormat` 토큰을 따릅니다. 시각 토큰을 포함한
  포맷이라도 이동 단위는 항상 하루입니다.
