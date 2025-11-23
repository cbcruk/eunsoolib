/**
 * 캘린더 이벤트 기본 타입
 */
export interface CalendarEvent {
  /** 이벤트 시작일 */
  start: Date | string
  /** 이벤트 종료일 (없으면 시작일과 동일) */
  end?: Date | string
  /** 이벤트 제목 */
  title?: string
}
