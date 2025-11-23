# @eunsoolib/lane-assignment

캘린더 UI에서 겹치는 이벤트를 레인(행)에 배치하는 알고리즘

## 설치

```bash
pnpm add @eunsoolib/lane-assignment
```

## 알고리즘 비교

| 항목          | Simple       | Weekly             |
| ------------- | ------------ | ------------------ |
| 레인 할당     | 전역 (한 번) | 주별 (매주 재계산) |
| 시간 복잡도   | O(n log n)   | O(w × n log n)     |
| 레인 재사용   | 제한적       | 최적화됨           |
| 공간 효율     | ★★★☆☆        | ★★★★★              |
| 시각적 일관성 | ★★★★★        | ★★☆☆☆              |
| 구현 복잡도   | ★★☆☆☆        | ★★★★☆              |

## Simple 알고리즘

전체 기간에 대해 한 번만 레인을 할당합니다. 같은 이벤트는 항상 같은 레인 번호를 유지합니다.

```typescript
import { assignLanesSimple, visualizeLanes } from '@eunsoolib/lane-assignment'

const events = [
  { start: '2022-03-05', end: '2022-03-10', title: 'Event A' },
  { start: '2022-03-08', end: '2022-03-15', title: 'Event B' },
  { start: '2022-03-09', end: '2022-03-12', title: 'Event C' },
]

const result = assignLanesSimple(events)
console.log(visualizeLanes(result.events))
```

**출력:**

```
           03/05  03/06  03/07  03/08  03/09  03/10  03/11  03/12  03/13  03/14  03/15
Lane 0:     [===   ====   ====   ====   ====   ===]
         ↳ Event A
Lane 1:                          [===   ====   ====   ====   ====   ====   ====   ===]
                              ↳ Event B
Lane 2:                                 [===   ====   ====   ===]
                                     ↳ Event C

Total lanes: 3
```

**추천 사례:**

- 이벤트 개수가 적음 (< 100개)
- 시각적 일관성이 중요함
- 성능이 중요함

## Weekly 알고리즘

각 주마다 독립적으로 레인을 할당합니다. 같은 이벤트도 주가 바뀌면 레인 번호가 달라질 수 있습니다.

```typescript
import { assignLanesWeekly, getLaneForDate } from '@eunsoolib/lane-assignment'
import dayjs from 'dayjs'

const events = [{ start: '2022-03-22', end: '2022-04-03', title: 'Project B' }]

const result = assignLanesWeekly(events, 'Sunday')

// 주별 레인 맵 확인
console.log(result.events[0].weeklyLanes)
// Map { '2022-W12' => 0, '2022-W13' => 0 }

// 특정 날짜의 레인 조회
const lane = getLaneForDate(result.events[0], dayjs('2022-04-01'), 'Sunday')
console.log(lane) // 0
```

**추천 사례:**

- 이벤트가 많음 (> 500개)
- 셀 높이가 제한적 (모바일)
- 공간 절약이 최우선

## 시각적 비교

### Simple 방식

```
                3월 3주        3월 4주         4월 1주
            ┌──────────┬──────────────┬──────────────┐
   Lane 0   │   [A]    │              │              │
   Lane 1   │          │    [B────]   │  [B────]     │
   Lane 2   │          │              │  [C────]     │ ← 레인 낭비
            └──────────┴──────────────┴──────────────┘
```

### Weekly 방식

```
                3월 3주        3월 4주         4월 1주
            ┌──────────┬──────────────┬──────────────┐
   Lane 0   │   [A]    │    [A]       │   [B────]    │ ← 재사용
   Lane 1   │          │    [B────]   │   [C────]    │ ← 재사용
   Lane 2   │          │    [C]       │              │
            └──────────┴──────────────┴──────────────┘
```

## API

### assignLanesSimple(events)

```typescript
function assignLanesSimple(events: CalendarEvent[]): LaneAssignmentResult

interface LaneAssignmentResult {
  events: EventWithLane[]
  totalLanes: number
}

interface EventWithLane extends CalendarEvent {
  lane: number
  eventId: string
}
```

### assignLanesWeekly(events, weekStartsOn?)

```typescript
function assignLanesWeekly(
  events: CalendarEvent[],
  weekStartsOn?: 'Monday' | 'Sunday'
): WeeklyLaneAssignmentResult

interface WeeklyLaneAssignmentResult {
  events: EventWithWeeklyLane[]
  weekLaneCounts: Map<string, number>
}

interface EventWithWeeklyLane extends CalendarEvent {
  weeklyLanes: Map<string, number> // key: 'YYYY-Ww'
  eventId: string
}
```

### 유틸리티 함수

| 함수                                            | 설명                            |
| ----------------------------------------------- | ------------------------------- |
| `groupEventsByDate(events)`                     | 날짜별로 이벤트 그룹화 (Simple) |
| `groupEventsByDateWeekly(events, weekStartsOn)` | 날짜별로 이벤트 그룹화 (Weekly) |
| `getLaneForDate(event, date, weekStartsOn)`     | 특정 날짜의 레인 번호 조회      |
| `visualizeLanes(events)`                        | ASCII 시각화 (Simple)           |
| `visualizeWeeklyLanes(events, weekStartsOn)`    | ASCII 시각화 (Weekly)           |

## 알고리즘 원리

### 핵심 로직

```typescript
// 1. 시작일 기준 정렬
const sorted = events.sort((a, b) => a.start - b.start)

// 2. 각 이벤트에 사용 가능한 첫 번째 레인 할당
for (const event of sorted) {
  const lane = findAvailableLane(event.start)
  if (lane === -1) {
    createNewLane()
  }
  assignToLane(event, lane)
}
```

### 레인 사용 가능 조건

```
이전 이벤트 종료일 < 현재 이벤트 시작일
```

**주의:** 같은 날 끝나고 시작하는 이벤트는 겹침으로 판정됩니다.
