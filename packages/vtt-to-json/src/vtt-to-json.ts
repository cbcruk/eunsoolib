/** 자막 한 줄(cue) */
export type Cue = {
  /** 시작 시각(초). `timestamp`를 초로 환산한 값 */
  seconds: number
  /** 원본 시작 타임스탬프 (`HH:mm:ss.SSS` 또는 시가 생략된 `mm:ss.SSS`) */
  timestamp: string
  /** 자막 텍스트. 태그는 제거하지 않는다 */
  text: string
}

/** 타이밍 줄: `00:00:01.000 --> 00:00:05.000` 또는 `00:01.000 --> 00:05.000` */
const TIMING_LINE = /^((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})\s+-->\s/

/** cue가 아닌 블록(`NOTE`, `STYLE`, `REGION`)의 시작 줄 */
const NON_CUE_BLOCK = /^(?:NOTE|STYLE|REGION)(?:\s|$)/

/**
 * WebVTT 자막을 cue 배열로 변환하는 파서
 *
 * YouTube 등에서 받은 자동 생성 자막처럼 같은 문장이 여러 번 반복되는 형식을
 * 염두에 두고, 직전과 동일한 텍스트와 `<c>` 스타일 태그 줄은 건너뛴다.
 * cue 식별자 줄과 `NOTE` / `STYLE` / `REGION` 블록은 결과에 넣지 않는다.
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

  /**
   * @param data - WebVTT 파일의 원본 텍스트
   */
  constructor(data: string) {
    this.data = data
  }

  /**
   * `HH:mm:ss.SSS` 또는 `mm:ss.SSS` 타임스탬프를 초로 환산
   *
   * @returns 형식이 맞지 않으면 `0`
   */
  private getSeconds(timestamp: string): number {
    const parts = timestamp.split(':')

    if (parts.length === 2) {
      const [m, s] = parts

      return parseInt(m, 10) * 60 + parseFloat(s)
    }

    if (parts.length === 3) {
      const [h, m, s] = parts

      return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
    }

    return 0
  }

  /**
   * 자막을 파싱해 cue 배열로 반환
   *
   * 파싱 상태는 호출마다 새로 만들므로 같은 인스턴스에서 여러 번 호출해도
   * 같은 결과를 반환한다.
   *
   * @returns 시간순 cue 목록. 중복 텍스트, 스타일 태그 줄, cue 식별자,
   * `NOTE` / `STYLE` / `REGION` 블록은 제외된다
   */
  toJson(): Cue[] {
    const cues: Cue[] = []
    const lines = this.data.split(/\r\n|\r|\n/)

    let timeStamp = ''
    let lastText = ''
    /**
     * - `none`: 블록 밖 (블록 시작 줄을 기다리는 중)
     * - `cue`: 타이밍 줄 이후의 cue 본문
     * - `ignored`: `NOTE` / `STYLE` / `REGION` 블록 본문
     */
    let block: 'none' | 'cue' | 'ignored' = 'none'

    const isTimingLine = (line: string | undefined) =>
      line !== undefined && TIMING_LINE.test(line.trim())

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()
      const match = line.match(TIMING_LINE)

      if (match) {
        // 타이밍 줄이면 현재 자막 시작 시간으로 설정하고, 다음 줄부터 자막으로 인식
        timeStamp = match[1]
        block = 'cue'
        continue
      }

      if (rawLine === '') {
        // 완전히 빈 줄은 블록의 끝
        block = 'none'
        continue
      }

      if (!line || block === 'ignored') {
        continue
      }

      if (block === 'none') {
        if (NON_CUE_BLOCK.test(line)) {
          block = 'ignored'
          continue
        }

        // 바로 다음 줄이 타이밍 줄이면 cue 식별자
        if (isTimingLine(lines[i + 1])) {
          continue
        }
      }

      if (
        // 유효한 타임스탬프가 없는 경우 (WEBVTT 헤더 등)
        !timeStamp ||
        // 이전 자막과 동일한 텍스트인 경우
        line === lastText ||
        // 스타일 태그인 경우
        /<\/c>$/.test(line)
      ) {
        continue
      }

      cues.push({
        seconds: this.getSeconds(timeStamp),
        timestamp: timeStamp,
        text: line,
      })

      // 마지막 자막 텍스트 저장 (중복 제거)
      lastText = line
    }

    return cues
  }
}
