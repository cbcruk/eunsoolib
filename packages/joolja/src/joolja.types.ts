/** 이미지 한 장의 측정 결과. */
export interface ImageMeasurement {
  /** 측정한 파일 이름. 확장자를 포함한 원본 이름이다. */
  file: string
  /** 가로 픽셀 수. */
  width: number
  /** 세로 픽셀 수. */
  height: number
  /** image-size가 판별한 포맷(`png`, `jpg` 등). 판별하지 못하면 `undefined`. */
  type?: string
}

/**
 * 키(`img_1x1`)로 찾는 측정 결과 모음.
 *
 * 키는 파일 이름에서 확장자를 떼고 공백을 `_`로 바꾼 뒤 소문자로 만든 값이다.
 */
export type ImageMeasurements = Record<string, ImageMeasurement>

/** {@linkcode measureImages} 옵션. */
export interface MeasureOptions {
  /** 이미지를 찾을 디렉터리. 하위 디렉터리는 훑지 않는다. @default process.cwd() */
  dir?: string
  /** 측정할 확장자 목록. 점을 포함하고 소문자로 적는다. @default ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] */
  extensions?: string[]
}

/** 생성할 파일 하나. */
export interface OutputFile {
  /** 파일 이름. 경로는 포함하지 않는다. */
  name: string
  /** 파일 내용. */
  content: string
}

/** {@linkcode buildOutputs} 옵션. */
export interface OutputOptions {
  /** `result.json`을 만들지 여부. @default false */
  json?: boolean
  /** `_variables.scss`와 `_sprite.scss`를 만들지 여부. @default false */
  scss?: boolean
}

/** {@linkcode joolja} 옵션. */
export interface JooljaOptions extends MeasureOptions, OutputOptions {
  /** 생성한 파일을 저장할 디렉터리. 없으면 만든다. @default dir과 같은 값 */
  outDir?: string
}

/** {@linkcode joolja} 실행 결과. */
export interface JooljaResult {
  /** 측정한 이미지 정보. */
  images: ImageMeasurements
  /** 실제로 쓴 파일의 절대 경로. */
  written: string[]
}
