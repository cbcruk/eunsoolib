# @cbcruk/utils

난수 생성, 휴대폰 번호 파싱, 초 단위 시간 포맷, 개수 축약 같은 작은 유틸 모음입니다.

잘못된 입력은 조용히 이상한 값을 돌려주지 않고 예외로 알립니다. 숫자 인자가 정수가 아니거나
허용 범위를 벗어나면 `RangeError`를, 문자열 형식이 맞지 않으면 `Error`를 던집니다.

## 설치

```bash
pnpm add @cbcruk/utils
```

## 사용법

### `getRandomNumber`

```ts
import { getRandomNumber } from '@cbcruk/utils'

getRandomNumber({ min: 1, max: 6 }) // 1 ~ 6 중 하나
getRandomNumber({ min: 6, max: 1 }) // throws RangeError
```

### `parsePhoneNumber`

```ts
import { parsePhoneNumber } from '@cbcruk/utils'

const { prefix, middle, suffix } = parsePhoneNumber('01012345678')
// prefix: '010', middle: '1234', suffix: '5678'

parsePhoneNumber('010-1234-5678') // throws
parsePhoneNumber('02012345678') // throws (앞자리가 01X가 아님)
```

### `formatTimeFromSeconds`

```ts
import { formatTimeFromSeconds } from '@cbcruk/utils'

formatTimeFromSeconds(3701) // '1시간 1분 41초'
formatTimeFromSeconds(3601) // '1시간 1초'
formatTimeFromSeconds(0) // ''
formatTimeFromSeconds(Math.floor(90.7)) // '1분 30초'
formatTimeFromSeconds(1.5) // throws RangeError
```

### `formatCount`

```ts
import { formatCount } from '@cbcruk/utils'

formatCount(999) // '999'
formatCount(1500) // '1.5K'
formatCount(999999) // '1.0M'
```

## API

### `getRandomNumber({ min, max })`

`min` 이상 `max` 이하의 정수를 반환합니다(양 끝 포함). `Math.random` 기반이라 보안 용도로는
적합하지 않습니다.

| 옵션  | 타입     | 설명                            |
| ----- | -------- | ------------------------------- |
| `min` | `number` | 최솟값(포함). 정수              |
| `max` | `number` | 최댓값(포함). `min` 이상의 정수 |

- `min`·`max`가 정수가 아니면(`NaN`·`Infinity` 포함) `RangeError`를 던집니다.
- `min > max`이면 `RangeError`를 던집니다. `min === max`이면 그 값을 반환합니다.

### `parsePhoneNumber(value)`

하이픈 없는 **숫자 11자리** 휴대폰 번호를 `3-4-4`로 나눠 `{ prefix, middle, suffix }`를
반환합니다. 형식이 맞지 않으면 `Error('유효하지 않은 전화번호 형식입니다')`를 던집니다.

- 앞자리는 휴대폰 식별번호 `010`·`011`·`016`·`017`·`018`·`019`만 허용합니다. `02`·`070` 같은
  유선·인터넷 전화 번호는 예외입니다.
- 하이픈·공백이 섞인 값, 10자리 번호(`011-123-4567` 같은 옛 형식 포함)는 모두 예외입니다.

### `formatTimeFromSeconds(seconds)`

초를 `N시간 N분 N초` 형태의 한국어 문자열로 반환합니다. 0인 단위는 생략하고, 모두 0이면 빈
문자열을 반환합니다.

- `seconds`는 0 이상의 정수여야 합니다. 음수이거나 정수가 아니면(`NaN`·`Infinity` 포함)
  `RangeError`를 던집니다.
- 재생 위치처럼 소수점이 있는 값은 `Math.floor` 등으로 먼저 정수로 만든 뒤 넘기세요.

### `formatCount(count)`

개수를 짧은 문자열로 바꿉니다. `1000` 미만은 그대로, 그 이상은 소수 첫째 자리까지 반올림해
`K`(천)·`M`(백만)을 붙입니다(`1500` → `'1.5K'`).

- 반올림 결과가 `1000.0K`에 닿으면 `M`으로 올립니다(`999950`·`999999` → `'1.0M'`).
- 가장 큰 단위는 `M`입니다(`1500000000` → `'1500.0M'`).
- 0 이상의 개수를 가정하며 인자 검증은 하지 않습니다.
