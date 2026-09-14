/** 자막 한 줄(cue) */
export type Cue = {
  /** 시작 시각(초). `timestamp`를 초로 환산한 값 */
  seconds: number
  /** 원본 타임스탬프 (`HH:mm:ss.SSS`) */
  timestamp: string
  text: string
}

/**
 * WebVTT 자막을 cue 배열로 변환하는 파서
 *
 * YouTube 등에서 받은 자동 생성 자막처럼 같은 문장이 여러 번 반복되는 형식을
 * 염두에 두고, 직전과 동일한 텍스트와 `<c>` 스타일 태그 줄은 건너뛴다.
 *
 * @example
 * ```ts
 * import { VttParser } from '@cbcruk/vtt-to-json'
 *
 * const cues = new VttParser(vttText).toJson()
 * // [{ seconds: 1, timestamp: '00:00:01.000', text: '안녕하세요' }]
 * ```
 */
export class VttParser {
  private data: string

  private state = {
    timeStamp: '',
    lastText: '',
  }

  /**
   * @param data - WebVTT 파일의 원본 텍스트
   */
  constructor(data: string) {
    this.data = data
  }

  /**
   * `HH:mm:ss.SSS` 타임스탬프를 초로 환산
   *
   * @returns 형식이 맞지 않으면 `0`
   */
  private getSeconds(timestamp: string): number {
    const parts = timestamp.split(':')

    if (parts.length !== 3) {
      return 0
    }

    const [h, m, s] = parts

    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
  }

  /**
   * 자막을 파싱해 cue 배열로 반환
   *
   * @returns 시간순 cue 목록. 중복 텍스트와 스타일 태그 줄은 제외된다
   */
  toJson(): Cue[] {
    const cues: Cue[] = []
    const lines = this.data
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      // 타임스탬프 줄 확인: "00:00:01.000 --> 00:00:05.000" 형식
      const match = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> /)

      if (match) {
        // 타임스탬프 줄이면 현재 자막 시작 시간으로 설정하고, 다음 줄부터 자막으로 인식
        this.state.timeStamp = match[1]
        continue
      }

      if (
        // 유효한 타임스탬프가 없는 경우
        !this.state.timeStamp ||
        // 이전 자막과 동일한 텍스트인 경우
        line === this.state.lastText ||
        // 스타일 태그인 경우
        /<\/c>$/.test(line)
      ) {
        continue
      }

      cues.push({
        seconds: this.getSeconds(this.state.timeStamp),
        timestamp: this.state.timeStamp,
        text: line,
      })

      // 마지막 자막 텍스트 저장 (중복 제거)
      this.state.lastText = line
    }

    return cues
  }
}
