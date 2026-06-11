import {
  createContext,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type DepsList = readonly unknown[];

/**
 * use-state-with-deps와 동일한 비교 의미론.
 * - 길이가 다르면 변경으로 간주 (issue #131 수정 반영: [1,2] -> [1,2,3]도 리셋)
 * - 각 원소는 Object.is로 비교
 */
function depsChanged(prev: DepsList, next: DepsList): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

/**
 * 경계의 "리셋 버전"을 자식에게 내려준다.
 * 값 자체에는 의미가 없고, deps가 바뀔 때마다 단조 증가하는 고유 키일 뿐이다.
 */
const ResetVersionContext = createContext<number | null>(null);

interface ResetBoundaryProps {
  /**
   * 이 배열이 (use-state-with-deps의 deps와 동일한 의미론으로) 변경되면
   * 경계 안의 모든 <Resettable> 자식이 remount되어 초기 상태로 돌아간다.
   */
  deps: DepsList;
  children: ReactNode;
}

export function ResetBoundary({
  deps,
  children,
}: ResetBoundaryProps): ReactNode {
  // deps를 문자열로 직렬화하지 않고 "변경 횟수"를 키로 쓴다.
  // 덕분에 객체/함수/배열 deps도 참조(Object.is) 기준으로 안전하게 처리된다.
  const versionRef = useRef(0);
  const prevDepsRef = useRef<DepsList>(deps);

  // 렌더 중 ref 갱신 — React 공식 "storing information from previous renders" 패턴.
  // re-render를 유발하지 않으며, deps가 같은 리렌더에서는 증가하지 않으므로
  // Strict Mode 이중 호출에서도 두 번째 호출 때는 false가 되어 한 번만 증가한다.
  if (depsChanged(prevDepsRef.current, deps)) {
    versionRef.current += 1;
    prevDepsRef.current = deps;
  }

  // ResetBoundary 자신은 remount되지 않는다. version만 바뀌어 내려갈 뿐이라,
  // 경계 안에 있되 <Resettable> 밖에 있는 "보존 state"는 영향을 받지 않는다.
  return (
    <ResetVersionContext.Provider value={versionRef.current}>
      {children}
    </ResetVersionContext.Provider>
  );
}

interface ResettableProps<T> {
  /** useState와 동일하게 값 또는 lazy initializer를 받는다. */
  initial: T | (() => T);
  children: (state: T, setState: Dispatch<SetStateAction<T>>) => ReactNode;
}

export function Resettable<T>({
  initial,
  children,
}: ResettableProps<T>): ReactNode {
  const version = useContext(ResetVersionContext);
  if (version === null) {
    throw new Error("<Resettable> must be rendered inside a <ResetBoundary>");
  }
  // 실제 useState를 가진 컴포넌트(ResettableInner)를 version을 key로 렌더한다.
  // version이 바뀌면 ResettableInner가 다른 instance로 취급되어 remount되고,
  // 그 안의 useState가 initial로 다시 초기화된다.
  //
  // useState가 "key 아래" 컴포넌트에 살기 때문에, 호출부가 hook 규약을 잘못
  // 쓸 여지(함수 안에서 직접 useState 호출 등)가 구조적으로 사라진다.
  return (
    <ResettableInner key={version} initial={initial}>
      {children}
    </ResettableInner>
  );
}

function ResettableInner<T>({
  initial,
  children,
}: ResettableProps<T>): ReactNode {
  const [state, setState] = useState(initial);
  return <>{children(state, setState)}</>;
}
