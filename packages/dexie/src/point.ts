import Dexie, { type EntityTable } from 'dexie'

export type PointSchema = {
  id: number
  type: 'earn' | 'spend'
  code: string
  amount: number
  createdAt: Date
}

export const db = new Dexie('PointDatabase') as Dexie & {
  points: EntityTable<PointSchema, 'id'>
}

db.version(1).stores({
  points: '++id, type, code, amount, createdAt',
})

export async function addPoint(row: Omit<PointSchema, 'id' | 'createdAt'>) {
  await db.points.add({
    ...row,
    createdAt: new Date(),
  })
}
