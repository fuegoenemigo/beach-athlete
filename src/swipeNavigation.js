export const MAIN_AREAS = ['home', 'beach', 'indoor', 'training']

export function swipeDirection(start, end, minimumDistance = 65) {
  if (!start || !end) return null
  const horizontal = end.x - start.x
  const vertical = end.y - start.y
  if (Math.abs(horizontal) < minimumDistance
    || Math.abs(horizontal) < Math.abs(vertical) * 1.5) return null
  return horizontal < 0 ? 'left' : 'right'
}

export function adjacentArea(current, direction) {
  const index = MAIN_AREAS.indexOf(current)
  if (index < 0 || !direction) return current
  const nextIndex = index + (direction === 'left' ? 1 : -1)
  return MAIN_AREAS[Math.max(0, Math.min(MAIN_AREAS.length - 1, nextIndex))]
}
