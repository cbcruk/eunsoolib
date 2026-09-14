# JSDoc Rules

Rules for writing JSDoc comments on exported symbols in `packages/*/src`.
Apply every rule to every symbol you write or edit.

## Where JSDoc is read

- **Editor hovers and autocomplete** — from `src` inside this workspace, and from
  `dist/*.d.ts` for npm consumers (tsdown keeps JSDoc in the emitted declarations).
- **Docs site type tables** — `apps/docs` renders `AutoTypeTable` for the
  interfaces listed in `apps/docs/lib/type-tables.ts`, using each property's
  description and its `@default`, `@param`, `@returns`, and `@internal` tags.

The package `README.md` stays the primary documentation. When a change touches
an API that the README's `## API` section describes, update both in the same
change so they don't disagree.

## Language

- Write JSDoc in Korean by default, matching the READMEs and test descriptions.
- If a package's JSDoc is already written in English throughout, keep that
  package in English. Never mix languages within one package; check the
  package's existing comments before writing.
- Identifiers, code, and string literals inside examples stay in English.

## Summary line

The first paragraph is the only part shown in autocomplete lists. Write it as
one concise sentence describing what the symbol does, so a reader scanning the
list can pick the right symbol without opening anything else.

Put implementation details, caveats, and rationale in later paragraphs.

```ts
/** 문자열의 공백을 모두 밑줄로 바꾼다. */
```

## Types and tags

Carry type information in the TypeScript signature. Describe meaning in the
comment: what the value represents, its valid range, units, and any sentinel
value.

```ts
/**
 * 문자열에서 부분 문자열을 찾아 첫 위치를 반환한다.
 *
 * @param value - 검색할 문자열
 * @param needle - 찾을 부분 문자열
 * @returns 첫 위치. 없으면 `-1`
 */
declare function find(value: string, needle: string): number
```

- Reserve `@param` and `@returns` for facts the signature cannot state — the
  `-1` above is the case that earns the tag.
- Always separate the name and description with `-` (`@param name - 설명`).
  The docs type table splits on the hyphen; without it the whole text becomes
  the parameter name.
- Use `@template T - 설명` for type parameters (not `@typeParam`).
- Use `@throws` to describe when the function throws, and `@deprecated` with the
  replacement to use.

## Defaults

Document option defaults with `@default` followed by the literal value, without
backticks. The docs type table renders the value as code, so backticks would
show up literally.

```ts
interface DebounceOptions {
  /** 마지막 호출 뒤 실행까지 기다리는 시간(ms). @default 100 */
  wait?: number
  /** 대기 시작 시점에도 한 번 실행할지 여부. @default false */
  leading?: boolean
}
```

## Examples

Add `@example` for symbols with several parameters or non-obvious behaviour.
Write one example per distinct use case.

- Import from the published package name — `@cbcruk/<name>`, or its subpath
  (`@cbcruk/highlight-kit/react`) — never a relative path, so the block works
  when pasted into a consumer project.
- A short title on the `@example` line is optional; it reads as a plain line in
  editor hovers, so keep it to a few words.
- Examples are not type-checked by any script. Write them against the current
  signature and re-read them whenever the signature changes.
- Don't reference demo components (`demo.tsx`, `*.example.ts`); they are not
  exported.

````ts
/**
 * 실패 상태의 쿼리만 받는 타입.
 *
 * @example 재시도 라벨
 * ```ts
 * import type { QueryStateOf } from '@cbcruk/query-view'
 *
 * function retryLabel(state: QueryStateOf<unknown, 'failed'>): string {
 *   return `Retry (${state.failureCount})`
 * }
 * ```
 */
````

## Coverage

- Document every symbol exported from a package entry (`src/index.ts` and any
  subpath entry listed in `exports`, such as `src/react.tsx`): functions,
  classes, interfaces, type aliases, React components and hooks.
- For classes and interfaces, document the symbol itself plus each public
  constructor, method, and property. Interfaces listed in
  `apps/docs/lib/type-tables.ts` must have a description on every property.
- Mark properties that exist for internal wiring or tests with `@internal`; the
  docs type table hides them.
- Internal helpers not re-exported from an entry, tests, stories, and demo files
  don't need JSDoc.
- Don't add `@module` comments; nothing in this repo renders them.

## Markdown and links

- Write comment bodies in Markdown: lists, bold, inline code, and fenced code
  blocks render in editor hovers and in the docs type table.
- Link to other symbols with `{@link}` or `{@linkcode}`; they are clickable in
  editor hovers. The docs type table flattens every link tag to plain text, so
  write sentences that still read correctly without the link styling.

## Syntax to avoid

- GitHub/JSR alert blocks (`> [!IMPORTANT]`) — no renderer here supports them.
- `@typeParam` — use `@template`.
- `@defaultValue` — use `@default`, which the repo already uses.

## Freshness

Edit the JSDoc in the same change as the code it describes. There is no JSDoc
lint script, so verify by hand for the packages you touched:

- `pnpm --filter @cbcruk/<name> build` and `pnpm check:packages <name>` — the
  declarations still emit and the tarball passes publint/attw.
- `pnpm test:run packages/<name>`.
- `pnpm docs:build` when you changed an interface listed in
  `apps/docs/lib/type-tables.ts`.
