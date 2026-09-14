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
   *
   * @throws 컨텍스트 밖에서 호출했고 `defaultValue`도 없으면 `ContextNotFoundError`
   */
  get(): T

  /**
   * 현재 컨텍스트 값을 에러 없이 가져온다.
   *
   * 컨텍스트 밖이면 `defaultValue`를, 그것도 없으면 `undefined`를 반환한다.
   * 컨텍스트 밖이어도 `get()`과 같은 값을 돌려주므로, 값이 실제로 설정됐는지
   * 구분하려면 `isActive()`를 쓴다.
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
