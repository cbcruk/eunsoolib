---
'@cbcruk/scroll-end': patch
---

`useScrollEnd`가 조건부 렌더 등으로 나중에 마운트되거나 다른 노드로 교체된 대상 요소를 따라가 구독하도록 고쳤고, `target`에 요소(`HTMLElement | null`)를 직접 넘길 수도 있습니다. (#33)
