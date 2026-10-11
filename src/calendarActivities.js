import { canonicalCategory, exerciseMeasurement, hasLegacyValues, isConfirmedSet } from './trainingModel.js'

const categorySymbols = {
  Krafttraining: { emoji: '🏋️', label: 'Krafttraining' },
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

export function calendarActivities(entries) {
  const symbols = new Map()
  for (const entry of entries) {
    if (entry.type === 'beach' || entry.type === 'indoor') {
      symbols.set('🏐', { emoji: '🏐', label: 'Volleyball' })
    } else if (entry.type === 'training') {
      for (const category of trainedCategories(entry.item)) {
        const symbol = categorySymbols[category]
        if (symbol) symbols.set(symbol.emoji, symbol)
      }
    }
  }
  return [...symbols.values()]
}
