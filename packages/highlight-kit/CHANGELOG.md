# @cbcruk/highlight-kit

## 0.2.0

### Minor Changes

- 946820c: `OpaqueRange` 기반 form control 하이라이트 추가 — `<input>`/`<textarea>` 안의 값을
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

## 0.1.0

### Minor Changes

- 8ba7ef7: `rangesFromOffsets`가 공백만 있는 텍스트 노드를 건너뛰지 않고 `root.textContent` 기준으로 오프셋을 계산하도록 고쳐, 요소 사이에 줄바꿈·들여쓰기가 있어도 `textContent`나 서버에서 구한 위치가 그대로 맞습니다. 이전 기준(공백 노드 제외)으로 계산한 오프셋은 다시 계산해야 합니다. (#31)
