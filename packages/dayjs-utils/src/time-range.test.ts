import { describe, expect, it } from 'vitest'
import { TimeRange } from './time-range'
import dayjs from 'dayjs'

describe('TimeRange', () => {
  const now = dayjs().hour(12).minute(0).second(0).millisecond(0)

  describe('toDatetime', () => {
    it('올바른 시간 문자열을 Dayjs로 변환한다', () => {
      const tr = new TimeRange('09:00:00', '17:00:00')
      const result = tr['toDatetime']('15:30:45')

      expect(result.format('HH:mm:ss')).toBe('15:30:45')
    })

    it('잘못된 시간 문자열은 에러를 던진다', () => {
      const tr = new TimeRange('09:00:00', '17:00:00')
      expect(() => tr['toDatetime']('99:99:99')).toThrow()
    })
  })

  describe('isActive', () => {
    it('현재 시간이 범위 내에 있으면 true', () => {
      const tr = new TimeRange('10:00:00', '14:00:00')
      expect(tr.isActive(now)).toBe(true)
    })

    it('현재 시간이 범위 밖이면 false', () => {
      const tr = new TimeRange('14:01:00', '15:00:00')
      expect(tr.isActive(now)).toBe(false)
    })

    it('현재 시간이 endTime과 같으면 false (exclusive)', () => {
      const tr = new TimeRange('11:00:00', '12:00:00')
      expect(tr.isActive(now)).toBe(false)
    })

    it('현재 시간이 startTime과 같으면 true (inclusive)', () => {
      const tr = new TimeRange('12:00:00', '13:00:00')
      expect(tr.isActive(now)).toBe(true)
    })
  })

  describe('getRemainingTime', () => {
    it('남은 시간이 올바르게 계산된다', () => {
      const tr = new TimeRange('10:00:00', '13:30:00')
      const remaining = tr.getRemainingTime(now)
      expect(remaining).toEqual({ HH: '01', mm: '30', ss: '00' })
    })

    it('endTime이 이미 지났으면 00:00:00을 반환한다', () => {
      const tr = new TimeRange('08:00:00', '11:59:59')
      const remaining = tr.getRemainingTime(now)
      expect(remaining).toEqual({ HH: '00', mm: '00', ss: '00' })
    })

    it('잘못된 시간일 경우 null을 반환한다', () => {
      const tr = new TimeRange('08:00:00', 'invalid')
      const remaining = tr.getRemainingTime(now)
      expect(remaining).toBeNull()
    })
  })

  describe('parseTime', () => {
    it('시간 문자열을 시/분/초로 분해한다', () => {
      const parsed = TimeRange.parseTime('08:30:45')
      expect(parsed).toEqual({ HH: '08', mm: '30', ss: '45' })
    })

    it('부족한 구성요소는 기본값으로 채운다', () => {
      const parsed = TimeRange.parseTime('08:30')
      expect(parsed).toEqual({ HH: '08', mm: '30', ss: '00' }) // ss 없음 처리용
    })
  })

  describe('now', () => {
    it('현재 시간을 HH:mm:ss 포맷으로 반환한다', () => {
      const result = TimeRange.now()
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    })
  })
})
