export function formatTimeFromSeconds(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return [h > 0 ? `${h}시간` : '', m > 0 ? `${m}분` : '', s > 0 ? `${s}초` : '']
    .filter(Boolean)
    .join(' ')
}
