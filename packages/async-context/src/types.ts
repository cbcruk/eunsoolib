/**
 * 비동기 실행 컨텍스트 내에서 타입 안전하게 값을 공유하기 위한 핸들.
 */
export interface AsyncContext<T> {
  /**
   * 컨텍스트 이름 (디버깅용).
   */
  readonly name: string

  /**
   * 컨텍스트에 값을 설정하고 콜백을 실행한다.
   * 콜백 내부의 모든 함수에서 이 값에 접근할 수 있다.
   */
  run<R>(value: T, callback: () => R): R

  /**
   * 현재 컨텍스트 값을 가져온다.
   * 컨텍스트가 설정되지 않은 경우 에러를 던진다.
   */
  get(): T

  /**
   * 현재 컨텍스트 값을 안전하게 가져온다.
   * 컨텍스트가 설정되지 않은 경우 undefined를 반환한다.
   */
  getOptional(): T | undefined

  /**
   * 컨텍스트가 현재 설정되어 있는지 확인한다.
   */
  isActive(): boolean
}

/**
 * 컨텍스트 맵에서 각 컨텍스트가 담고 있는 값 타입을 추출한다.
 */
export type ContextValues<T extends Record<string, AsyncContext<unknown>>> = {
  [K in keyof T]: T[K] extends AsyncContext<infer V> ? V : never
}
