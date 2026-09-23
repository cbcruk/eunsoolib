/** 파일 하나의 이름 변경 계획. */
export interface Rename {
  /** 원래 경로. 저장소 루트 기준 상대 경로다. */
  from: string
  /** 바뀔 경로. JSX가 있으면 `.tsx`, 없으면 `.ts`다. */
  to: string
}

/** 이름을 바꾸지 못한 파일. */
export interface SkippedFile {
  /** 건너뛴 파일 경로. */
  file: string
  /** 건너뛴 이유. 파서 메시지나 git 오류 메시지다. */
  reason: string
}

/** {@linkcode gitMvTs} 옵션. */
export interface GitMvTsOptions {
  /** 명령을 실행할 디렉터리. git 저장소 안이어야 한다. @default process.cwd() */
  cwd?: string
  /** 대상을 좁히는 경로 목록(`src`, `app/pages`). 비우면 저장소 전체다. @default [] */
  paths?: string[]
  /** 참이면 실제로 옮기지 않고 계획만 만든다. @default false */
  dryRun?: boolean
}

/** {@linkcode gitMvTs} 실행 결과. */
export interface GitMvTsResult {
  /** 이름을 바꾼(또는 `dryRun`이면 바꿀) 파일. */
  renamed: Rename[]
  /** 파싱이나 `git mv`에 실패해 건너뛴 파일. */
  skipped: SkippedFile[]
}
