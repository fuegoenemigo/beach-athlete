import { isCurrentJumpMeasurement } from './jumpMeasurements.js'

// App calibration, not population norms. The 96 reach anchors stay within
// results documented by Volleyball Canada's indoor senior test records:
// https://volleyball.ca/uploads/About/LTAD/VDM_Nov_5_2025_EN.pdf
export const JUMP_STANDARDS = {
  women: {
    standingLong: [130, 245],
    approach: [250, 320],
    standingArms: [240, 300],
  },
  men: {
    standingLong: [150, 285],
    approach: [280, 375],
    standingArms: [270, 350],
  },
}

const clamp = (value) => Math.max(55, Math.min(96, value))

export function jumpTestScore(testId, valueCm, ratingGroup) {
  const anchors = JUMP_STANDARDS[ratingGroup]?.[testId]
  if (!anchors || !Number.isFinite(Number(valueCm))) return null
  const [low, high] = anchors
  return clamp(55 + 41 * (Number(valueCm) - low) / (high - low))
}

export function measuredJumpScore(measurements, ratingGroup, asOfDate) {
  const standards = JUMP_STANDARDS[ratingGroup]
  if (!standards) return null
  const best = new Map()
  for (const item of measurements) {
    if (item.date > asOfDate || !isCurrentJumpMeasurement(item)
      || !Object.hasOwn(standards, item.testId)) continue
    best.set(item.testId, Math.max(best.get(item.testId) ?? 0, Number(item.valueCm)))
  }
  const scores = Object.keys(standards).map((id) => best.has(id)
    ? jumpTestScore(id, best.get(id), ratingGroup) : 55)
  return { score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
    measuredTests: best.size }
}
