import { canonicalCategory, exerciseMeasurement, hasLegacyValues, isConfirmedSet } from './trainingModel.js'

const categorySymbols = {
  Krafttraining: { icon: 'barbell', label: 'Krafttraining' },
  'Sprungkraft und Agilität': { emoji: '⚡', label: 'Sprungkraft und Agilität' },
  Ausdauer: { emoji: '🏃', label: 'Ausdauer' },
  'Core und Mobility': { emoji: '🧘', label: 'Core und Mobility' },
  'Beach-Training': { emoji: '🏐', label: 'Beach-Training' },
  Hallentraining: { emoji: '🏐', label: 'Hallentraining' },
  Regeneration: { emoji: '🌿', label: 'Regeneration' },
}

function trainedCategories(session) {
  const completedExercises = (session.exercises ?? []).filter((exercise) =>
    (exercise.entries ?? []).some((entry) => isConfirmedSet(entry, exerciseMeasurement(exercise)))
      || hasLegacyValues(exercise))
  if (!completedExercises.length) return [canonicalCategory(session.category, session.subcategory)]
  return [...new Set(completedExercises.map((exercise) =>
    canonicalCategory(exercise.category ?? session.category, session.subcategory)))]
}

export function calendarDayActivity(entries) {
  const training = entries.find((entry) => entry.type === 'training')
  if (training) {
    const categories = trainedCategories(training.item)
    const primary = canonicalCategory(training.item.category, training.item.subcategory)
    return categorySymbols[categories.includes(primary) ? primary : categories[0]]
      ?? { emoji: '💪', label: 'Training' }
  }
  const volleyball = entries.filter((entry) => entry.type === 'beach' || entry.type === 'indoor')
  if (volleyball.some((entry) => entry.item.gameType === 'tournament'))
    return { emoji: '🏆', label: 'Volleyball-Turnier' }
  if (volleyball.some((entry) => entry.item.gameType === 'testMatch'))
    return { emoji: '🤝', label: 'Testspiel' }
  return volleyball.length ? { emoji: '🏐', label: 'Volleyball' } : null
}
