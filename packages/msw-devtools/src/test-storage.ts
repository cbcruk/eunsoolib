/**
 * 브라우저 밖에서 store를 테스트하기 위한 최소 `Storage` 대역.
 *
 * `localStorage`의 동기 계약만 흉내내면 충분하다 — store가 쓰는 건 `getItem`과
 * `setItem`뿐이다.
 *
 * @param seed - 초기 내용을 공유할 백킹 맵. 같은 맵을 넘기면 "새로고침"을 흉내낼 수 있다.
 * @returns `Storage`로 쓸 수 있는 객체.
 */
export function createMemoryStorage(seed = new Map<string, string>()): Storage {
  return {
    getItem: (key: string) => seed.get(key) ?? null,
    setItem: (key: string, value: string) => void seed.set(key, value),
    removeItem: (key: string) => void seed.delete(key),
    clear: () => seed.clear(),
    key: (index: number) => [...seed.keys()][index] ?? null,
    get length() {
      return seed.size
    },
  } as Storage
}
