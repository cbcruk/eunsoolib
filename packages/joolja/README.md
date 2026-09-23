# @cbcruk/joolja

이미지 크기를 재서 JSON·SCSS 변수·스프라이트 클래스를 만드는 줄자

디렉터리에 있는 이미지를 훑어 가로·세로를 재고, 그 결과를 `result.json`,
`$images` 맵(`_variables.scss`), 이미지마다 클래스 하나인 `_sprite.scss`로
저장한다. CSS에 크기를 손으로 적어 두고 이미지만 바뀌어 어긋나는 일을 막기 위한
도구다.

## 설치

```bash
pnpm add -D @cbcruk/joolja
```

Node 전용이며, 브라우저에서는 쓸 수 없다.

## 사용법

### CLI

```bash
# 현재 디렉터리를 재서 SCSS를 만든다
pnpm joolja . --scss

# assets/를 재서 src/styles/에 JSON과 SCSS를 함께 만든다
pnpm joolja ./assets --json --scss --out-dir ./src/styles

# 이미지가 바뀔 때마다 다시 만든다
pnpm joolja ./assets --scss --watch
```

인자를 주지 않으면 도움말을 출력한다.

### 프로그래밍 방식

```ts
import { joolja } from '@cbcruk/joolja'

const { images, written } = await joolja({
  dir: './assets',
  outDir: './src/styles',
  scss: true,
})
```

측정만 하고 파일 생성은 직접 하고 싶다면 순수 함수를 따로 쓸 수 있다.

```ts
import { buildOutputs, measureImages, toScssSprite } from '@cbcruk/joolja'

const images = await measureImages({ dir: './assets' })
const css = toScssSprite(images)
const files = buildOutputs(images, { json: true })
```

## API

### CLI 옵션

| 옵션              | 설명                                          |
| ----------------- | --------------------------------------------- |
| `[dir]`           | 측정할 디렉터리 (기본값: 현재 디렉터리)       |
| `-j`, `--json`    | `result.json`을 저장한다                      |
| `-s`, `--scss`    | `_variables.scss`와 `_sprite.scss`를 저장한다 |
| `-w`, `--watch`   | 이미지가 바뀌면 다시 실행한다                 |
| `-o`, `--out-dir` | 저장 경로 (기본값: 측정한 디렉터리)           |
| `-h`, `--help`    | 도움말을 출력한다                             |
| `-v`, `--version` | 버전을 출력한다                               |

### `joolja(options?)`

이미지를 재고 요청한 파일을 저장한 뒤, 측정 결과와 저장한 파일 경로를 반환한다.

| 옵션         | 타입       | 기본값                                      | 설명                                  |
| ------------ | ---------- | ------------------------------------------- | ------------------------------------- |
| `dir`        | `string`   | `process.cwd()`                             | 이미지를 찾을 디렉터리                |
| `outDir`     | `string`   | `dir`                                       | 생성한 파일을 저장할 디렉터리         |
| `json`       | `boolean`  | `false`                                     | `result.json` 생성 여부               |
| `scss`       | `boolean`  | `false`                                     | `_variables.scss`·`_sprite.scss` 생성 |
| `extensions` | `string[]` | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` | 측정할 확장자                         |

### `measureImages(options?)`

디렉터리의 이미지 크기를 재서 키로 정리한 객체를 반환한다. 키는 파일 이름에서
확장자를 떼고 공백을 `_`로 바꾼 소문자다.

```ts
{ img_1x1: { file: 'img_1x1.png', width: 1, height: 1, type: 'png' } }
```

### `buildOutputs(images, options?)`

측정 결과로 저장할 `{ name, content }` 목록을 만든다. 파일을 쓰지는 않는다.

### `toScssVariables(images)` / `toScssSprite(images)`

측정 결과를 각각 `$images` 맵 한 줄과 클래스 규칙 모음으로 만든다.

### `toKey(file)`

파일 이름을 SCSS에서 쓸 키로 바꾼다.

### `parseCliArgs(argv)`

`joolja` 명령의 인자를 실행 계획으로 바꾼다. CLI를 감싸는 다른 스크립트를 만들 때
쓴다.

## 제약

- 하위 디렉터리는 훑지 않는다. 한 디렉터리만 본다.
- 두 파일이 같은 키가 되면(`Hero Banner.png`와 `hero_banner.png`) 조용히 덮어쓰지
  않고 에러를 던진다.
- `_sprite.scss`의 `background-image` 경로는 파일 이름 그대로다. 저장 경로를
  이미지와 다르게 두면 경로를 직접 맞춰야 한다.
- watch 모드는 대상 디렉터리만 지켜보며, 자신이 만든 파일은 무시한다.
