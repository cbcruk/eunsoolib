import { describe, expect, test } from 'vitest'
import {
  corsHeaders,
  isOriginAllowed,
  isTargetAllowed,
} from './cors-image-proxy.utils'

describe('isOriginAllowed', () => {
  const allowed = ['http://localhost:3000', '*.vercel.app']

  test('origin이 null이면 false를 반환한다', () => {
    expect(isOriginAllowed(null, allowed)).toBe(false)
  })

  test('정확히 일치하는 origin을 허용한다', () => {
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true)
  })

  test('와일드카드 서브도메인을 허용한다', () => {
    expect(isOriginAllowed('https://app.vercel.app', allowed)).toBe(true)
  })

  test('와일드카드 apex 도메인을 허용한다', () => {
    expect(isOriginAllowed('https://vercel.app', allowed)).toBe(true)
  })

  test('목록에 없는 origin은 거부한다', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false)
  })

  test('와일드카드 접미사를 가장한 origin은 거부한다', () => {
    expect(isOriginAllowed('https://evilvercel.app', allowed)).toBe(false)
  })
})

describe('isTargetAllowed', () => {
  const allowed = ['s3.amazonaws.com', 'your-cdn.cloudfront.net']

  test('정확히 일치하는 호스트를 허용한다', () => {
    expect(
      isTargetAllowed(new URL('https://s3.amazonaws.com/a'), allowed),
    ).toBe(true)
  })

  test('하위 도메인을 허용한다', () => {
    expect(
      isTargetAllowed(new URL('https://bucket.s3.amazonaws.com/a'), allowed),
    ).toBe(true)
  })

  test('허용되지 않은 호스트는 거부한다', () => {
    expect(isTargetAllowed(new URL('https://evil.com/a'), allowed)).toBe(false)
  })
})

describe('corsHeaders', () => {
  test('주어진 origin으로 CORS 헤더를 구성한다', () => {
    const headers = corsHeaders('http://localhost:3000')
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, HEAD, OPTIONS')
  })
})
