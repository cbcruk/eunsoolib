# @cbcruk/fetch-outcome

실패한 fetch를 재시도 판단이 담긴 데이터로 바꾸는 FetchOutcome 모델

`fetch`는 DNS 실패도, 서버가 보낸 스트림 리셋도, TLS 오류도 모두 구별할 수 없는
`TypeError` 하나로 던진다. 이 패키지는 실패를 던지는 대신 **결과 값**으로 돌려주고,
그 결과의 머리에 호출자가 실제로 궁금해하는 질문의 답을 둔다 — **이 요청을 다시
보내도 되는가?**

```ts
import { safeFetch } from '@cbcruk/fetch-outcome'

const out = await safeFetch(url, { method: 'POST', body })
switch (out.kind) {
  case 'ok':
    return out.value
  case 'failed':
    return out.retry === 'safe' && out.attested ? retry() : fail(out)
  case 'indeterminate':
    return giveUp(out.reason) // 브라우저의 불투명함, 삼켜진 리셋, 포맷 변경
}
```

## 설치

```bash
pnpm add @cbcruk/fetch-outcome
```

런타임 의존성은 없다. neverthrow 어댑터(`@cbcruk/fetch-outcome/neverthrow`)를 쓸 때만
`neverthrow`가 선택적 peer dependency로 필요하다.

## 이 패키지가 실제로 하는 일

[_Fetch Needs Error Codes_](https://www.jasnell.me/posts/fetch-needs-error-codes)
(James M Snell, 2026-07-12)가 제안한 에러 코드 분류와
[tc39/proposal-error-code-property](https://github.com/tc39/proposal-error-code-property)
(Stage 1)를 기반으로 만든 shim이다. **분류 체계는 아직 표준이 아니다.** 코드 문자열은
바뀌거나 폐기될 수 있다.

그래서 이 패키지의 머리는 분류가 아니라 `FetchOutcome`이다. 제안이 표준이 되면 증거
경로가 아래에서 켜질 뿐, 호출부는 바뀌지 않는다.

### 프로토콜이 알려 주는 것은 생각보다 적다

"정보는 프로토콜 계층에 있는데 Fetch가 버릴 뿐"이라는 기대는 절반만 맞다. 분류가
구분한다고 주장하는 각 `RST_STREAM` 조건을 내는 HTTP/2 서버를 세우고 Node 24 / undici
8.10.2로 측정한 결과다 (`pnpm --filter @cbcruk/fetch-outcome conformance`).

| 경로                      | 분류가 말하는 것    | 실제로 얻는 것                     | 피어 코드 |
| ------------------------- | ------------------- | ---------------------------------- | --------- |
| `/reset/refused`          | `REQUEST_REJECTED`  | `REQUEST_REJECTED` / retry `safe`  | ✅        |
| `/reset/internal`         | `INTERNAL_ERROR`    | `INTERNAL_ERROR` / retry `unsafe`  | ✅        |
| `/reset/protocol`         | `PROTOCOL_ERROR`    | `PROTOCOL_ERROR` / retry `unknown` | ✅        |
| `/reset/enhance`          | `STREAM_RESET`      | `STREAM_RESET` / retry `unknown`   | ✅        |
| `/mid/cancel-with-length` | `REQUEST_CANCELLED` | `PROTOCOL_ERROR` / retry `unknown` | ✅        |
| `/reset/cancel`           | `REQUEST_CANCELLED` | `STREAM_RESET`(코드 유실)          | ❌        |
| `/mid/cancel`             | `REQUEST_CANCELLED` | **`200` + 조용히 잘린 본문**       | ❌        |
| `/mid/internal`           | `INTERNAL_ERROR`    | **`200` + 조용히 잘린 본문**       | ❌        |
| `/ok`                     | (성공)              | `200`                              | —         |

9개 중 6개가 코드를 가진 실패로 나오고, 그중 **피어가 실제로 보낸 코드는 5개**다.
나머지는 감추지 않고 그대로 드러낸다.

여기서 나오는 세 가지 사실:

1. **빈틈은 명세에만 있지 않다.** `/mid/cancel`·`/mid/internal`은 `TypeError`조차
   만들지 않는다. `content-length` 없이 본문 중간에 스트림을 리셋하면 undici는
   `status: 200`인 `Response`와 **조용히 잘린 본문**을 돌려준다. 코드를 붙일 에러
   자체가 없다. Fetch에 `.code`를 추가해도 이 경우는 달라지지 않는다.
2. **살아남은 통로는 메시지 문자열 하나다.** undici는 구분 가능한 리셋을
   `cause.code === 'ERR_HTTP2_STREAM_ERROR'`로 모으고, 숫자 코드는 메시지 안에만
   남는다 (`"Stream closed with error code NGHTTP2_REFUSED_STREAM"`).
   `src/mapping.ts`가 이 문자열을 정규식으로 긁는다. 명세가 아니라 Node 내부 구현에
   묶인 코드이고, Fetch가 `.code`를 내보내면 가장 먼저 지울 부분이다.
3. **측정값은 런타임 버전을 따라 움직인다.** 원본 측정(Node 22 / undici 8.7)에서
   `CANCEL`(0x08)은 **프라미스를 영원히 멈춰** 같은 h2 세션의 이후 요청까지 막았다.
   undici 8.10에서는 settle된다(개선). 대신 숫자 코드를 잃어 `STREAM_RESET`으로만
   보인다. undici 8.11은 `content-length`가 있는 본문 중간 리셋을 프로토콜 에러
   대신 길이 불일치로 보고한다 — 절단은 감지하지만 피어 코드는 잃는다. 두 형태
   모두 `src/normalize.ts`가 처리하고, 기준선은 개발 기준 버전(8.10.2)에 맞춰 둔다.

적합성 스크립트는 이 표를 **기준선으로 고정한 게이트**다. undici가 더 복구해 주거나
반대로 메시지 포맷이 바뀌면 이 테스트가 깨진다. 그게 목적이다.

## `attested` 불변식

분류 안에서 **행동 권한**을 주는 코드는 단 하나, `ERR_HTTP_REQUEST_REJECTED`다.
RFC 9113 §8.7과 RFC 9114 §4.1.1은 거부된 요청이라면 **비멱등 메서드라도** 자동
재시도해도 된다고 말한다. 나머지는 전부 관측 정보일 뿐이다.

이 비대칭이 설계의 전부다. `ERR_HTTP_REQUEST_REJECTED`의 오탐은 중복 `POST`이고,
`ERR_HTTP_INTERNAL_ERROR`의 오탐은 잘못된 로그 한 줄이다.

그래서 모든 판독은 `attested`를 함께 싣는다. **피어가 보낸 프로토콜 코드를 복구했을
때만** `true`이고, 우리 쪽 소켓에서 추론한 것이면 `false`다. `ECONNRESET`이 함정이다 —
"요청이 죽었다"처럼 보이지만 서버는 이미 커밋했을 수 있다.

```ts
assessRetry(err, 'POST')
// { retryability: 'safe', attested: true,
//   reason: 'server sent REFUSED_STREAM: request was not processed (RFC 9113 §8.7)' }

assessRetry(econnresetErr, 'POST')
// { retryability: 'unknown', attested: false,
//   reason: 'ERR_HTTP_CONNECTION_RESET carries no processing guarantee for POST' }
```

`GOAWAY`는 비멱등 메서드에 대해 일부러 `'unknown'`이다. 재시도 보장이
`last-stream-id`보다 위 스트림에만 적용되는데 그 값이 어디에도 노출되지 않는다.
근사하지 않고 모른다고 답한다.

## 사용법

```ts
import { safeFetch, safeText } from '@cbcruk/fetch-outcome'

let out = await safeFetch(url, { method: 'POST', body })

if (out.kind === 'ok') {
  // 헤더는 도착했다. 리셋은 본문 스트림에서 뒤늦게 올 수 있으므로
  // safeText로 읽어 조용한 절단 대신 결과로 받는다.
  const body = await safeText(out.value, { method: 'POST' })
  if (body.kind === 'ok') return body.value
  out = body
}

if (out.kind === 'failed') {
  if (out.retry === 'safe' && out.attested) return retry()
  log.warn({ code: out.code, reason: out.reason })
}
// out.kind === 'indeterminate': out.reason이 왜 아무것도 복구하지 못했는지 말한다
```

### neverthrow

```ts
import { safeFetch } from '@cbcruk/fetch-outcome'
import { toResult } from '@cbcruk/fetch-outcome/neverthrow'

const result = toResult(await safeFetch(url))
```

## API

### `safeFetch(input, init?, options?)`

`fetch`와 같은 인자를 받고 `Promise<FetchOutcome<Response>>`를 반환한다. 던지지 않는다.

| 옵션                | 타입           | 기본값                 | 설명                              |
| ------------------- | -------------- | ---------------------- | --------------------------------- |
| `fetch`             | `typeof fetch` | `globalThis.fetch`     | 주입할 fetch 구현                 |
| `redactCrossOrigin` | `boolean`      | `location`이 있으면 참 | 교차 출처의 연결 전 코드를 가릴지 |
| `origin`            | `string`       | `location.origin`      | 비교 기준 출처                    |

헤더 시점에 결정된다. 본문 중간 리셋은 여기서 보이지 않으므로 `safeText`로 읽는다.

교차 출처 가리기: DNS·TLS·연결 거부·리셋·타임아웃 코드는 대상의 네트워크 구성을
드러내므로, 출처가 다르면 코드와 그것이 정당화했을 `safe` 판단을 함께 거둬들이고
`indeterminate`로 낮춘다. 브라우저에서는 기본으로 켜지고 서버 런타임에서는 꺼진다.

### `safeText(response, options?)`

본문을 문자열로 읽어 `FetchOutcome<string>`으로 돌려준다. `options.method`는 재시도
판단에 쓴다.

닫지 못하는 구멍이 하나 있다. `content-length` **없이** 본문 중간에 리셋되면 undici가
스트림을 정상 종료로 처리해 잘린 본문이 `ok`로 나온다. 이 계층 아래의 문제라서
해결하지 못하고 문서화한다.

### `safeJson<T>(response, options?)`

본문을 JSON으로 읽어 `FetchOutcome<T>`로 돌려준다. 두 실패를 구분한다.

- **본문 스트림이 끊긴 경우** — 전송 실패다. `safeText`와 같은 경로를 타고 복구한
  프로토콜 증거를 싣는다.
- **바이트는 왔는데 JSON이 아닌 경우** — 서버가 요청을 **처리했다**는 뜻이므로
  네트워크 실패가 아니다. `indeterminate`에 `response body is not valid JSON`을
  이유로 싣고, 재시도 판단은 메서드 의미를 따른다(이미 처리된 `POST`는 `unsafe`).

반환 타입 `T`는 검증하지 않는다. 모양이 중요하면 스키마로 파싱한다.

### `FetchOutcome<T>`

```ts
type FetchOutcome<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'failed'; retry; attested; reason; code; evidence }
  | { kind: 'indeterminate'; retry; reason; raw }
```

`retry`는 `'safe' | 'unsafe' | 'unknown'`이다. 코드를 복구하지 못해도 재시도 판단은
답할 수 있기 때문에(`GET`은 메서드 의미만으로 재시도 가능) 모든 실패 갈래가 이 값을
싣는다. `isOk` / `isFailure`로 좁힐 수 있다.

### `assessRetry(err, method?)` / `isSafeToRetry(err, method?)`

던져진 에러 하나를 재시도 판단(`RetryVerdict`)으로 바꾼다. `safeFetch`를 쓰지 않고
기존 코드의 `catch` 블록에서만 쓸 수도 있다.

### `inspect(err)` / `codeOf(err)`

에러 체인(`cause`와 `AggregateError.errors`)을 훑어 가장 좋은 증거(`HttpErrorInfo`)를
꺼낸다. 복구할 수 없으면 `undefined`다 — 추측하지 않는다.

### `HTTP_ERROR_CODES` / `fromH2` / `fromH3`

분류 코드 상수와, HTTP/2·HTTP/3 숫자 코드를 추상 코드로 바꾸는 함수.

### `createError` / `installErrorCode` / `adoptErrorCode` / `hasNativeErrorCode`

`tc39/proposal-error-code-property`의 ponyfill. `new Error(msg, { code })`의 서술자
의미(instance own property, non-enumerable, writable, configurable)를 그대로 흉내 낸다.
`hasNativeErrorCode`는 런타임이 제안을 구현하면 `true`가 된다.

## 제약

- **표준이 아니다.** 코드 문자열과 옵션 의미는 TC39 논의에 따라 바뀔 수 있다.
- **브라우저에서는 거의 아무것도 복구하지 못한다.** Fetch의 불투명함은 탐지 방지를
  위한 의도된 기능이고, 이 패키지는 그것을 뚫으려 하지 않는다. 브라우저에서 얻는
  값은 대개 `indeterminate`이며, 그래도 `retry` 판단은 메서드 의미로 답한다.
- **메시지 스크레이프는 깨지기 쉽다.** Node 내부 문자열에 묶여 있다. 적합성 게이트가
  깨지는 것으로 알아차리도록 설계했다.
- **`content-length` 없는 본문 중간 리셋은 감지할 수 없다.** 위 `safeText` 항목 참고.

## 적합성 테스트 실행

```bash
pnpm --filter @cbcruk/fetch-outcome conformance
```

자체 서명 인증서를 만들고(`src/*.pem`, git에 올리지 않는다), 패키지를 빌드한 뒤
HTTP/2 서버를 띄워 9개 조건을 실제로 측정한다. 기준선과 다르면 실패한다.
