import Dexie, { type EntityTable } from 'dexie'

/** 포인트 적립/사용 내역 한 건 */
export type PointSchema = {
  id: number
  /** `earn`은 적립, `spend`는 사용 */
  type: 'earn' | 'spend'
  /** 내역을 구분하는 코드 */
  code: string
  amount: number
  createdAt: Date
}

/**
 * 포인트 내역을 담는 IndexedDB 인스턴스
 *
 * `points` 테이블은 `id`를 자동 증가 기본키로 쓰고
 * `type` / `code` / `amount` / `createdAt`에 인덱스를 둔다.
 */
export const db = new Dexie('PointDatabase') as Dexie & {
  points: EntityTable<PointSchema, 'id'>
}

db.version(1).stores({
  points: '++id, type, code, amount, createdAt',
})

/**
 * 포인트 내역을 추가
 *
 * `id`는 자동 증가하고 `createdAt`은 현재 시각으로 채워지므로 넘기지 않는다.
 *
 * @param row - 적립/사용 구분, 코드, 금액
 * @example
 * ```ts
 * await addPoint({ type: 'earn', code: 'SIGNUP', amount: 1000 })
 * ```
 */
export async function addPoint(row: Omit<PointSchema, 'id' | 'createdAt'>) {
  await db.points.add({
    ...row,
    createdAt: new Date(),
  })
}
