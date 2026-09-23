// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ImageMeasurements } from './joolja.types'
import { toScssSprite, toScssVariables } from './scss'

const images: ImageMeasurements = {
  img_1x1: { file: 'img_1x1.png', width: 1, height: 1, type: 'png' },
  hero_banner: { file: 'Hero Banner.jpg', width: 320, height: 96, type: 'jpg' },
}

describe('toScssVariables', () => {
  it('이미지 크기를 SCSS 맵 하나로 만들어야 함', () => {
    expect(toScssVariables(images)).toBe(
      '$images: ("img_1x1": (1, 1), "hero_banner": (320, 96));\n',
    )
  })

  it('이미지가 없으면 빈 맵을 만들어야 함', () => {
    expect(toScssVariables({})).toBe('$images: ();\n')
  })
})

describe('toScssSprite', () => {
  it('이미지마다 크기와 배경 이미지를 가진 클래스를 만들어야 함', () => {
    expect(toScssSprite(images)).toBe(
      [
        '.img_1x1 {',
        '  width: 1px;',
        '  height: 1px;',
        '  background-image: url("img_1x1.png");',
        '}',
        '',
        '.hero_banner {',
        '  width: 320px;',
        '  height: 96px;',
        '  background-image: url("Hero Banner.jpg");',
        '}',
        '',
      ].join('\n'),
    )
  })

  it('url에 키가 아니라 원본 파일 이름을 써야 함', () => {
    expect(toScssSprite(images)).toContain('url("Hero Banner.jpg")')
  })
})
