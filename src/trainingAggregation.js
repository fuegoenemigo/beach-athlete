import { canonicalCategory } from './trainingModel.js'

export const SCORED_TRAINING_CATEGORIES = [
  'Krafttraining', 'Sprungkraft und Agilität', 'Ausdauer', 'Core und Mobility',
]

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

export function changeStatus(changePercent) {
  if (changePercent == null) return 'unrated'
  const rounded = Math.round(changePercent * 100) / 100
  return rounded < -1 ? 'decline' : rounded <= 1 ? 'unchanged' : 'improved'
}

export function aggregateTrainingComparisons(comparisons) {
  const categories = SCORED_TRAINING_CATEGORIES.flatMap((name) => {
    const exercises = comparisons.filter((item) => canonicalCategory(item.category) === name)
    if (!exercises.length) return []
    if (name !== 'Krafttraining') return [{ name, exercises,
      changePercent: average(exercises.map((item) => item.changePercent)), groups: [] }]
    const byGroup = new Map()
    for (const exercise of exercises) {
      const group = exercise.muscleGroup || 'Ohne Muskelgruppe'
      if (!byGroup.has(group)) byGroup.set(group, [])
      byGroup.get(group).push(exercise)
    }
    const groups = [...byGroup].map(([group, items]) => ({ name: group, exercises: items,
      changePercent: average(items.map((item) => item.changePercent)) }))
    return [{ name, exercises, groups,
      changePercent: average(groups.map((group) => group.changePercent)) }]
  })
  return { categories, changePercent: categories.length
    ? average(categories.map((category) => category.changePercent)) : null }
}
