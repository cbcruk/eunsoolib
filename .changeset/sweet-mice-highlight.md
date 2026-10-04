---
'@cbcruk/highlight-kit': minor
---

`OpaqueRange` 기반 form control 하이라이트 추가 — `<input>`/`<textarea>` 안의 값을
토큰화해 칠할 수 있습니다.

- core: `createValueHighlighter`, `createValueRangeRegistry`, `tokenizeValue`,
  `groupTokens`, `createValueRanges`, `disconnectValueRanges`,
  `scrollValueRangeIntoView`, `isValueRangeSupported`, `supportsValueRange`,
  `isValueRange`
- react: `useValueTokens`, `useValueHighlight`, `useValueHighlightSearch`

value range는 live라서 control이 발급한 Range를 전부 보관하며 편집마다 갱신합니다.
재매칭할 때마다 이전 세대를 `disconnect()`하지 않으면 키 입력마다 live Range가
쌓이므로, 세대 교체를 라이브러리가 처리합니다.

`HighlightSink.commit`과 `HighlightController.set`/`getRanges`의 `Range[]`가
`HighlightRange[]`(`Range | ValueRange`)로 넓어졌습니다. 직접 sink를 구현했거나
`getRanges()` 결과에서 `startContainer`를 읽는 코드는 `isValueRange()`로 좁혀야
합니다.
