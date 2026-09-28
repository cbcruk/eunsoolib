import { planCamera } from './plan-camera'

describe('planCamera', () => {
  it('점이 없으면 카메라를 유지한다', () => {
    expect(planCamera([])).toEqual({ type: 'keep' })
  })

  it('점이 하나면 그 점을 고정 줌으로 중심에 둔다', () => {
    expect(planCamera([{ lat: 37.5, lng: 127 }], { singleZoom: 15 })).toEqual({
      type: 'center',
      at: { lat: 37.5, lng: 127 },
      zoom: 15,
    })
  })

  it('점이 여럿이면 남서·북동 모서리를 계산한다', () => {
    const plan = planCamera([
      { lat: 37.5, lng: 127.1 },
      { lat: 37.4, lng: 127.3 },
      { lat: 37.6, lng: 127.2 },
    ])
    expect(plan).toEqual({
      type: 'fit',
      sw: { lat: 37.4, lng: 127.1 },
      ne: { lat: 37.6, lng: 127.3 },
    })
  })

  it('같은 좌표 두 곳은 minSpan만큼 넓혀 가운데에 둔다', () => {
    const plan = planCamera(
      [
        { lat: 37.5, lng: 127 },
        { lat: 37.5, lng: 127 },
      ],
      { minSpan: 0.004 },
    )
    if (plan.type !== 'fit') throw new Error('fit이어야 함')
    expect(plan.ne.lat - plan.sw.lat).toBeCloseTo(0.004)
    expect(plan.ne.lng - plan.sw.lng).toBeCloseTo(0.004)
    expect((plan.ne.lat + plan.sw.lat) / 2).toBeCloseTo(37.5)
  })

  it('이미 minSpan보다 넓은 축은 넓히지 않는다', () => {
    const plan = planCamera(
      [
        { lat: 37.4, lng: 127 },
        { lat: 37.6, lng: 127 },
      ],
      { minSpan: 0.004 },
    )
    if (plan.type !== 'fit') throw new Error('fit이어야 함')
    expect(plan.sw.lat).toBe(37.4)
    expect(plan.ne.lat).toBe(37.6)
    expect(plan.ne.lng - plan.sw.lng).toBeCloseTo(0.004)
  })

  it('점이 많아도 스택을 넘기지 않는다', () => {
    const points = Array.from({ length: 200_000 }, (_, i) => ({
      lat: 37 + i / 1e6,
      lng: 127,
    }))
    expect(planCamera(points).type).toBe('fit')
  })
})
