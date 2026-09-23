# @cbcruk/git-mv-ts

git mv로 .js/.jsx 파일을 JSX 유무에 따라 .ts/.tsx로 옮기는 도구

타입스크립트로 옮기는 첫 단계인 확장자 변경만 담당한다. 파일 내용은 건드리지
않고, `git mv`를 쓰기 때문에 이름 변경 이력이 남는다. JSX가 들어 있는 파일만
`.tsx`가 되고 나머지는 `.ts`가 된다.

## 설치

```bash
pnpm add -D @cbcruk/git-mv-ts
```

Node 전용이며, git 저장소 안에서 실행해야 한다.

## 사용법

### CLI

```bash
# 무엇이 바뀔지 먼저 확인한다
pnpm git-mv-ts --dry-run

# src와 app 아래만 옮긴다
pnpm git-mv-ts src app

# 저장소 전체를 옮긴다
pnpm git-mv-ts
```

`git ls-files`로 대상을 고르기 때문에 `node_modules`나 `.gitignore` 대상,
추적하지 않는 파일은 처음부터 빠진다.

### 프로그래밍 방식

```ts
import { gitMvTs } from '@cbcruk/git-mv-ts'

const { renamed, skipped } = await gitMvTs({ paths: ['src'], dryRun: true })
```

JSX 판별만 따로 쓸 수도 있다.

```ts
import { hasJsx, toTypeScriptPath } from '@cbcruk/git-mv-ts'

const jsx = hasJsx(source)
const target = toTypeScriptPath('src/App.js', jsx) // 'src/App.tsx'
```

## API

### CLI 옵션

| 옵션              | 설명                                 |
| ----------------- | ------------------------------------ |
| `[paths...]`      | 대상 경로 (기본값: 저장소 전체)      |
| `-n`, `--dry-run` | 옮기지 않고 무엇이 바뀔지만 출력한다 |
| `-h`, `--help`    | 도움말을 출력한다                    |
| `-v`, `--version` | 버전을 출력한다                      |

### `gitMvTs(options?)`

대상 파일을 옮기고, 옮긴 목록과 건너뛴 목록을 반환한다.

| 옵션     | 타입       | 기본값          | 설명                           |
| -------- | ---------- | --------------- | ------------------------------ |
| `cwd`    | `string`   | `process.cwd()` | 명령을 실행할 디렉터리         |
| `paths`  | `string[]` | `[]`            | 대상을 좁힐 경로 (비우면 전체) |
| `dryRun` | `boolean`  | `false`         | 옮기지 않고 계획만 만든다      |

```ts
{
  renamed: [{ from: 'src/App.js', to: 'src/App.tsx' }],
  skipped: [{ file: 'src/legacy.js', reason: "Unexpected token (3:10)" }]
}
```

### `hasJsx(source)`

소스에 JSX가 있는지 판별한다. acorn으로 파싱해서 보기 때문에 문자열이나 주석 안의
`<div />`는 세지 않고, 프래그먼트(`<>…</>`)만 쓴 파일도 JSX로 본다. 파싱에
실패하면 던진다.

### `toTypeScriptPath(file, jsx)`

경로 끝의 `.js`·`.jsx`를 `.ts`·`.tsx`로 바꾼다.

### `planRename(file, source)` / `isRename(value)`

파일 하나의 계획을 만든다. 파싱에 실패하면 던지지 않고 `{ file, reason }`을
돌려주며, `isRename`으로 둘을 가른다.

### `listTrackedSources(cwd, paths?)` / `gitMv(cwd, from, to)`

git 명령을 감싼 얇은 함수들. 직접 파이프라인을 짤 때 쓴다.

## 제약

- 확장자만 바꾼다. import 경로 수정, 타입 추가, `tsconfig.json` 설정은 하지 않는다.
- `.mjs`·`.cjs`는 다루지 않는다. JSX는 `.tsx`에서만 쓸 수 있어 `.mts`·`.cts`로
  옮길 수 없는 경우가 생기기 때문이다.
- acorn이 읽지 못하는 문법(Flow 타입 주석, 데코레이터 등)이 있는 파일은 건너뛴다.
  전체 작업을 멈추지는 않고, 끝난 뒤 이유와 함께 보여 준다.
- 옮긴 뒤에는 타입 오류가 남는다. `--dry-run`으로 먼저 확인하고, 커밋 전에
  타입 체크를 돌리는 것을 권한다.
