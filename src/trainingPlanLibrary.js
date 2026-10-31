import { STANDARD_PLANS, FOCUS_PLANS, ADDITIONAL_PLANS, VOLLEYBALL_PLANS } from './volleyballTraining.js'

export const BUILT_IN_PLANS = [...STANDARD_PLANS, ...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
const builtInIds = new Set(BUILT_IN_PLANS.map((plan) => plan.id))
const comparePlanNames = (left, right) => left.name.localeCompare(right.name, 'de-DE')
  || left.id.localeCompare(right.id, 'de-DE')

export function isBuiltInPlan(plan) {
  return builtInIds.has(plan.id)
}

export function visibleTrainingPlans(personalPlans) {
  const personalById = new Map(personalPlans.map((plan) => [plan.id, plan]))
  return [
    ...personalPlans.filter((plan) => !builtInIds.has(plan.id)).sort(comparePlanNames),
    ...BUILT_IN_PLANS.map((plan) => personalById.get(plan.id) ?? plan).sort(comparePlanNames),
  ].filter((plan) => !plan.hidden && plan.category !== 'Regeneration'
    && !plan.categories?.includes('Regeneration'))
}

export function plansForCategory(plans, category) {
  return plans.filter((plan) => (plan.categories ?? [plan.category]).includes(category))
}

export function groupedTrainingPlans(plans) {
  const groups = new Map()
  for (const plan of plans) {
    const key = isBuiltInPlan(plan) ? 'App-Vorlagen' : 'Eigene Vorlagen'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(plan)
  }
  return ['Eigene Vorlagen', 'App-Vorlagen']
    .filter((category) => groups.has(category))
    .map((category) => ({ category, plans: groups.get(category).sort(comparePlanNames) }))
}

export function removeTrainingPlan(personalPlans, plan) {
  const remaining = personalPlans.filter((item) => item.id !== plan.id)
  const original = BUILT_IN_PLANS.find((item) => item.id === plan.id)
  return original ? [...remaining, { ...original, hidden: true }] : remaining
}

export function restoreBuiltInPlans(personalPlans) {
  return personalPlans.filter((plan) => !(builtInIds.has(plan.id) && plan.hidden))
}
