import { TRAINING_CATEGORIES, canonicalCategory } from './trainingModel.js'
import { STANDARD_PLANS, FOCUS_PLANS, ADDITIONAL_PLANS, VOLLEYBALL_PLANS } from './volleyballTraining.js'

export const BUILT_IN_PLANS = [...STANDARD_PLANS, ...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
const builtInIds = new Set(BUILT_IN_PLANS.map((plan) => plan.id))

export function isBuiltInPlan(plan) {
  return builtInIds.has(plan.id)
}

export function visibleTrainingPlans(personalPlans) {
  const personalById = new Map(personalPlans.map((plan) => [plan.id, plan]))
  return [
    ...BUILT_IN_PLANS.map((plan) => personalById.get(plan.id) ?? plan),
    ...personalPlans.filter((plan) => !builtInIds.has(plan.id)),
  ].filter((plan) => !plan.hidden && plan.category !== 'Regeneration'
    && !plan.categories?.includes('Regeneration'))
}

export function plansForCategory(plans, category) {
  return plans.filter((plan) => (plan.categories ?? [plan.category]).includes(category))
}

export function groupedTrainingPlans(plans) {
  const groups = new Map()
  for (const plan of plans) {
    const category = canonicalCategory(plan.category, plan.name)
    const key = TRAINING_CATEGORIES.includes(category) ? category : 'Weitere Vorlagen'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(plan)
  }
  return [...TRAINING_CATEGORIES, 'Weitere Vorlagen']
    .filter((category) => groups.has(category))
    .map((category) => ({ category, plans: groups.get(category) }))
}

export function removeTrainingPlan(personalPlans, plan) {
  const remaining = personalPlans.filter((item) => item.id !== plan.id)
  const original = BUILT_IN_PLANS.find((item) => item.id === plan.id)
  return original ? [...remaining, { ...original, hidden: true }] : remaining
}

export function restoreBuiltInPlans(personalPlans) {
  return personalPlans.filter((plan) => !(builtInIds.has(plan.id) && plan.hidden))
}
