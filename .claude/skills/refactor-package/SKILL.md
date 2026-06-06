---
name: refactor-package
description: packages/ 하위에 사용자가 임시로 만든 폴더(flat한 index.ts/test.ts 등이 들어있는)를 이 모노레포의 표준 패키지 구조로 리팩토링한다 — src/ 아래 타입/유틸/구현 분리, 배럴 index.ts, Vitest 테스트, package.json·tsconfig.json. "이 폴더를 패키지 구조로 정리/리팩토링해줘", "packages/foo 구조 잡아줘" 같은 요청에 사용.
---

# refactor-package

사용자가 `packages/<name>/` 아래에 느슨하게 만든 폴더(예: 채팅에서 받은 코드를 통째로 붙인 `index.ts`, `console.log` 기반 `test.ts`, `README.md`)를 이 레포의 표준 패키지 구조로 리팩토링한다.

기준 컨벤션 패키지: `packages/lane-assignment`, `packages/local-storage-manager`, `packages/stacked` (이미 정리된 형태). 빈 패키지를 새로 만드는 건 `scripts/create-package.sh`가 담당하며, 이 스킬은 **이미 내용이 채워진 폴더를 정리**한다.

## 목표 구조

```
packages/<name>/
├── package.json          # @eunsoolib/<name>, main/types/exports → ./src/index.ts
├── tsconfig.json         # ../../tsconfig.json extends
├── README.md             # 한국어, 설치/사용법/API 섹션
└── src/
    ├── index.ts          # 배럴 — 공개 API만 re-export
    ├── <feature>.ts      # 메인 구현 (kebab-case)
    ├── types.ts          # 여러 파일이 공유하는 타입 (있을 때만)
    ├── <feature>.utils.ts # 분리된 유틸/헬퍼 함수 (있을 때만)
    ├── <feature>.test.ts # Vitest 테스트
    └── __snapshots__/    # 스냅샷 테스트가 있을 때만
```

## 규칙

- **대상은 `packages/` 하위 폴더만.** 인자로 폴더명을 받거나, 직전에 사용자가 만든 packages 하위 폴더를 대상으로 한다. 애매하면 어떤 폴더인지 물어본다.
- **파일명은 kebab-case** (`rw-lock.ts`, `lane-simple.ts`).
- **타입 분리**: 여러 src 파일이 공유하는 타입만 `types.ts`로 분리한다. 특정 feature 파일에서만 쓰는 타입은 그 파일에 두고 거기서 export한다 (lane-assignment가 `LaneAssignmentResult`를 `lane-simple.ts`에 두는 방식).
- **유틸 분리**: 독립적으로 재사용 가능한 헬퍼 함수는 별도 파일로 뺀다 (stacked의 `result.ts`처럼).
- **배럴 `src/index.ts`**: 공개할 클래스/함수/타입만 re-export. 내부 헬퍼(`Resolver` 같은)는 노출하지 않는다.
- **명시적 반환 타입**, strict TypeScript, 코드 내 문자열은 영어.
- **불필요한 인라인 주석/영역 구분 주석 금지.** 의미 있는 설명은 JSDoc으로.
- `package.json`의 패키지 이름이 이미 있으면 **보존**한다 (예: `stacked` 폴더 → `@eunsoolib/stacked-pr`). 없으면 `@eunsoolib/<folder-name>`.

## 절차

1. **대상 폴더 확정.** `packages/<name>/` 전체 파일을 읽는다. 무엇이 메인 구현·타입·유틸·데모·테스트·README인지 파악한다.

2. **`src/` 구성.** 기존 flat 파일을 옮기고 관심사별로 분리한다.
   - 메인 클래스/함수 → `src/<feature>.ts`
   - 공유 타입 → `src/types.ts` (공유될 때만)
   - 헬퍼 함수 → `src/<feature>.utils.ts` 또는 의미 있는 이름의 파일
   - 데모/예제 → `src/demo.ts` 또는 `.example.ts`
   - 배럴 → `src/index.ts`
   - import 경로를 새 분리에 맞게 갱신한다.
   - 파일 이동은 가능하면 `git mv`로 히스토리를 보존한다.

3. **테스트를 Vitest로 변환.** `test.ts`가 `console.log` 기반 실행 스크립트(= `describe`/`it` 없음)이면, 동일 시나리오를 `describe`/`it`/`expect` 기반 **결정적 테스트**로 재작성한다.
   - 파일명은 `src/<feature>.test.ts`.
   - 테스트 설명은 **한국어** (예: `'writer가 hold 중이면 다른 writer는 release까지 대기해야 함'`).
   - 타이머(`setTimeout`/`sleep`)에 의존한 단언 대신, 상태 조회(`inspect()` 등)와 실행 순서(`order: string[]`)로 결정적으로 검증한다.
   - `expect(true).toBe(true)` 같은 무의미한 테스트는 만들지 않는다.
   - 스냅샷 테스트가 있으면 `__snapshots__/<test-file>.snap`으로 파일명을 새 테스트 파일명에 **정확히 맞춰** 이동한다 (vitest가 파일명으로 스냅샷을 찾음).

4. **`package.json` / `tsconfig.json` 보강.** 없으면 `scripts/create-package.sh`의 템플릿과 동일하게 생성한다.
   - `package.json`: `name`(기존 보존 또는 `@eunsoolib/<name>`), `version: 0.0.1`, `type: module`, `main`/`types`/`exports` 모두 `./src/index.ts`.
   - `tsconfig.json`: `extends: ../../tsconfig.json`, `outDir: ./dist`, `rootDir: ./src`, `include: ["src"]`.

5. **README 정리.** `lane-assignment/README.md` 패턴을 따른다 — `# @eunsoolib/<name>` 제목 + 한 줄 설명, `## 설치`(pnpm), 사용법/API 섹션. 본문이 채팅 로그 형태면 정식 문서로 재구성한다. **파일 경로 참조(테스트 파일명 등)와 설치 스니펫을 새 구조에 맞게 갱신**한다.

6. **불필요해진 원본 파일 제거.** flat한 `index.ts`/`test.ts`/`__snapshots__/` 등 src로 옮겨간 원본을 삭제한다.

7. **검증.** `pnpm test:run packages/<name>` 으로 테스트 통과를 확인한다. 실패하면 고친다.

8. **보고.** before → after 디렉터리 트리와 핵심 변경점(분리한 파일, 테스트 변환 여부, 추가한 설정)을 요약한다.

## 참고 명령

```bash
# 대상 폴더 구조 확인
find packages/<name> -type f -not -path '*/node_modules/*' | sort

# 검증
pnpm test:run packages/<name>
```
