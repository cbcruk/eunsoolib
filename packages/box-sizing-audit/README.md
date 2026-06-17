# @eunsoolib/box-sizing-audit

`content-box` → `border-box` 마이그레이션을 위한 토글-비교 감사 도구. 페이지를
현재 상태로 캡처하고, 선택한 스코프에 `box-sizing: border-box`를 주입한 뒤 다시
캡처해 **델타만** 진단한다.

기준선이 페이지의 실제 현재 상태이므로, 이미 border-box인 것(리셋 / Tailwind
preflight / 벤더 스타일)은 no-op이라 결과에 나타나지 않는다. diff가 곧 마이그레이션
델타다.

## 설치

```bash
pnpm add @eunsoolib/box-sizing-audit
# 감사를 실제로 실행하려면 (peer):
pnpm add -D playwright pixelmatch pngjs
```

순수 진단 함수(`diffGeometry`, `analyzeAudit`, `formatReport` 등)만 쓴다면 peer
의존성 없이 import할 수 있다. `boxSizingAudit()` 러너만 셋을 필요로 한다.

## 두 개의 패스

결과는 서로 겹치지 않는다.

1. **geometry** — overflow / reflow / resize 라는 *결과*를 분류 (메커니즘)
2. **internal-shift** — 움직이지 않은 박스의 픽셀 diff (geometry의 사각지대)

| FindingKind           | 의미                                | 회귀 |
| --------------------- | ----------------------------------- | ---- |
| `OVERFLOW_INTRODUCED` | 없던 overflow가 생김                | ✅   |
| `INTERNAL_SHIFT`      | 박스 크기는 같은데 내부 픽셀이 이동 | ✅   |
| `REFLOWED`            | 위치 이동                           |      |
| `RESIZED`             | 크기 변경(overflow/reflow 없음)     |      |
| `OVERFLOW_RESOLVED`   | border-box가 기존 버그를 고침       |      |

## CLI

```bash
node box-sizing-audit.example.js <url> [--scope <selector>] [--viewport WxH] [--json]
```

```bash
# 전체 페이지를 통째로 뒤집어 시뮬레이션 (scope: *)
node box-sizing-audit.example.js http://localhost:3000/v2/dashboard

# <main>만 opt-in .bb 스코프로 감싸는 시뮬레이션
node box-sizing-audit.example.js http://localhost:3000/admin --scope main
```

회귀가 발견되면 non-zero로 종료하므로 CI 게이트로 바로 쓸 수 있다.

## 프로그래밍 방식

```ts
import { boxSizingAudit, formatReport } from '@eunsoolib/box-sizing-audit'

const result = await boxSizingAudit({
  url: 'http://localhost:3000/admin',
  scope: 'main',
  viewport: { width: 1280, height: 800 },
})

console.log(formatReport(result, '1280x800'))
if (result.regressions > 0) process.exit(1)
```

## API

| 항목                                | 설명                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `boxSizingAudit(options)`           | Playwright로 캡처·토글·진단하는 러너 (`AuditResult` 반환) |
| `analyzeAudit(input)`               | 캡처된 스냅샷/이미지로 두 패스를 합치는 순수 함수         |
| `diffGeometry(before, after, t?)`   | 패스 1: geometry 결과 분류                                |
| `detectInternalShifts(...)`         | 패스 2: 안정 박스의 픽셀 diff (`PixelCompare` 주입)       |
| `crop(img, x, y, w, h)`             | RawImage 영역 잘라내기                                    |
| `sortFindings` / `formatReport`     | 심각도 정렬 / 사람이 읽는 리포트                          |
| `isRegression` / `countRegressions` | 회귀 판정 / 집계                                          |
| `parseArgs` / `buildFlipCss`        | CLI 인자 파싱 / 토글 스타일시트 생성                      |

`DiffThresholds`: `{ reflowPx?, stablePx?, diffRatio? }` (기본 1 / 1 / 0.02).

## 설계 메모

- `deviceScaleFactor: 1`로 PNG px == CSS px를 유지해 crop 좌표 계산을 1:1로 맞춘다.
  안티앨리어싱 정밀도가 필요하면 2로 올리고 crop 좌표에 DPR을 곱한다.
- 픽셀 비교는 `PixelCompare`로 주입한다. 러너는 `pixelmatch`를 쓰지만, 순수
  코어와 테스트는 외부 의존성 없이 동작한다.
- 스코프 토글이 핵심 손잡이다. 항상 `*`가 아니라 실제 마이그레이션 계획에 맞춰
  스코프를 지정하라.
