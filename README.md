# eunsoolib

예전에 프로젝트에서 쓰던 작은 유틸리티·React 컴포넌트·도메인 모델을 모아 둔 TypeScript 모노레포입니다.

**문서: https://cbcruk.github.io/eunsoolib/**

각 패키지의 `README.md`가 문서 원본이고, `main`에 반영되면 문서 사이트가 자동으로 다시 배포됩니다.

## 패키지

`packages/` 아래 40개 패키지가 있고, `package.json`의 `eunsoolib.category`로 분류합니다.

| 분류                                                                | 내용                                                  | 개수 |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ---- |
| [react](https://cbcruk.github.io/eunsoolib/docs/#react-컴포넌트훅)  | React 컴포넌트·훅                                     | 8    |
| [dom](https://cbcruk.github.io/eunsoolib/docs/#domcss-브라우저-api) | DOM·CSS 브라우저 API                                  | 5    |
| [state](https://cbcruk.github.io/eunsoolib/docs/#상태저장소)        | 상태·저장소                                           | 3    |
| [async](https://cbcruk.github.io/eunsoolib/docs/#비동기서버)        | 비동기·서버                                           | 5    |
| [auth](https://cbcruk.github.io/eunsoolib/docs/#인증신원)           | 인증·신원                                             | 2    |
| [media](https://cbcruk.github.io/eunsoolib/docs/#이미지미디어)      | 이미지·미디어                                         | 7    |
| [utils](https://cbcruk.github.io/eunsoolib/docs/#날짜포맷-유틸)     | 날짜·포맷 유틸                                        | 3    |
| [devtools](https://cbcruk.github.io/eunsoolib/docs/#개발-도구)      | 개발 도구                                             | 2    |
| [lab](https://cbcruk.github.io/eunsoolib/docs/#lab-도메인-모델게임) | 도메인 모델·게임 (재사용 라이브러리가 아닌 설계 실험) | 5    |

lab을 뺀 패키지는 npm에 `@cbcruk/<name>`으로 배포됩니다. lab 패키지는 배포하지 않습니다.

```bash
pnpm add @cbcruk/sync-store
```

## 개발

pnpm 11과 Node.js 24 기준입니다.

```bash
pnpm install

pnpm test:run          # 전체 테스트 (Vitest)
pnpm check:readme      # 패키지 README 형식 검사
pnpm docs:dev          # 문서 사이트 로컬 실행 (apps/docs)
pnpm docs:build        # 문서 사이트 정적 빌드 → apps/docs/out
pnpm create-package <name>  # 새 패키지 생성

pnpm build             # 배포 대상 패키지 빌드 → packages/*/dist
pnpm check:packages    # 배포될 tarball 검사 (메타데이터·d.ts·publint·attw)
pnpm changeset         # 릴리스할 변경 기록
```

## 릴리스

[changesets](https://changesets.dev)로 패키지별 버전과 CHANGELOG를 관리합니다.

1. 사용자에게 영향이 있는 변경이면 PR에 `pnpm changeset`으로 changeset을 추가합니다.
2. PR이 `main`에 머지되면 Release 워크플로가 버전을 올린 "Version Packages" PR을 만듭니다.
3. 그 PR을 머지하면 Release 워크플로가 npm Trusted Publishing(OIDC)으로 배포하고 git 태그와 GitHub Release를 만듭니다.

npm 토큰은 쓰지 않습니다. 2FA를 우회하는 쓰기 토큰은 npm이 삭제·무효화합니다.

새 패키지는 CI가 처음 배포할 수 없어서(npm에 있어야 신뢰 게시자를 등록할 수 있음) 로컬에서 `npm login` 후 한 번 배포(`pnpm build && pnpm check:packages && pnpm changeset publish`, `git push --follow-tags`)하고 `./scripts/setup-npm-trust.sh <name>`으로 등록합니다.

## 구조

```
packages/<name>/   패키지 (src/, 테스트, README.md, package.json)
apps/docs/         Fumadocs 문서 사이트 — packages/*/README.md에서 콘텐츠 생성
scripts/           패키지 생성, README 템플릿과 검사 스크립트
```

새 패키지와 README 작성 규칙은 [`CLAUDE.md`](./CLAUDE.md)와 [`scripts/templates/README.md`](./scripts/templates/README.md)를 따릅니다.

## 라이선스

MIT
