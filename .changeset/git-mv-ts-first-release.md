---
'@cbcruk/git-mv-ts': minor
---

`.js`/`.jsx`를 JSX 유무에 따라 `.ts`/`.tsx`로 옮기는 `git-mv-ts` CLI를 추가합니다. 예전 `cbcruk/cli-` 저장소에서 옮겨 오면서 JSX 판별과 경로 변환을 순수 함수로 분리하고, `git ls-files`로 대상을 고르도록 바꿨습니다.
