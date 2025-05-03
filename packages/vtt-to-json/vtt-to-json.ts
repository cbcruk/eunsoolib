export type Cue = {
  seconds: number
  timestamp: string
  text: string
}

export class VttParser {
  private data: string

  private state = {
    timeStamp: '',
    lastText: '',
  }

  constructor(data: string) {
    this.data = data
  }

  private getSeconds(timestamp: string): number {
    const parts = timestamp.split(':')

    if (parts.length !== 3) {
      return 0
    }

    const [h, m, s] = parts

    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
  }

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
