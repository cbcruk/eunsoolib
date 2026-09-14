# @cbcruk/{{name}}

{{description}}

<!--
선택: 왜 필요한지, 무엇을 해결하는지 2~5줄. 긴 배경·원리는 아래 "설계 노트"로 보낸다.

규칙 (scripts/check-readmes.mjs가 검사)
- 제목은 package.json의 name과 같게: `# @cbcruk/<name>`
- 제목 바로 아래 한 줄 설명은 package.json의 description과 같은 뜻으로
- `## 설치` → `## 사용법` → `## API` 세 섹션은 필수, 이 순서
- 사용법이 여러 갈래면 `## 사용법` 아래 `###`로 나누고, 개념 설명이 먼저 필요하면
  `## 설치`와 `## 사용법` 사이에 둔다
- 설계 노트·동작 방식·제약·브라우저 지원·참고 자료 같은 부가 섹션은 `## API` 뒤에 둔다
- 라이선스 섹션은 두지 않는다 (루트 package.json의 MIT)
- 모든 설명은 한국어, 코드 식별자·코드 주석은 원문 유지
-->

## 설치

```bash
pnpm add @cbcruk/{{name}}
```

<!-- peer dependency나 실행 환경(browser / node / edge) 제약이 있으면 여기에 적는다 -->

## 사용법

```ts
import { example } from '@cbcruk/{{name}}'

example()
```

## API

### `example(input, options?)`

무엇을 반환하는지 한두 문장.

| 옵션     | 타입     | 기본값 | 설명 |
| -------- | -------- | ------ | ---- |
| `option` | `string` | —      | 설명 |

## 설계 노트

<!-- 선택: 동작 방식, 제약, 의도적으로 뺀 것, 브라우저 지원, 참고 자료 -->
