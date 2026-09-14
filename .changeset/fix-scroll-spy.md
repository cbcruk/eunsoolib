---
'@cbcruk/scroll-spy': minor
---

`generateToc`와 `useScrollSpyHeadings`가 자동으로 붙이는 헤딩 id가 문서 안에서 겹치지 않도록 `-2`, `-3` 접미사를 붙이고, 한글 등 영문 외 제목도 순번(`section-0`) 대신 텍스트로 id를 만듭니다. 기존에 생성되던 `section-<n>` id는 바뀝니다. (#32)
