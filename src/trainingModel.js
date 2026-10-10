export const TRAINING_CATEGORIES = [
  'Krafttraining', 'Sprungkraft & Explosivität', 'Schnelligkeit & Agilität',
  'Ausdauer', 'Core & Stabilität', 'Mobility', 'Sport', 'Regeneration',
]

export const MUSCLE_GROUPS = [
  'Brust', 'Rücken', 'Schultern', 'Beine', 'Bizeps', 'Trizeps', 'Core', 'Ganzkörper',
]

export const SPORTS = [
  'Beachvolleyball', 'Hallenvolleyball', 'Schwimmen', 'Laufen', 'Radfahren', 'Sonstiger Sport',
]

export const MEASUREMENT_TYPES = [
  ['strength', 'Gewicht und Wiederholungen'],
  ['reps', 'Wiederholungen'],
  ['duration', 'Dauer'],
  ['distance', 'Distanz und Dauer'],
  ['jump', 'Sprunghöhe und Wiederholungen'],
]

export function defaultMeasurement(category) {
  return {
    Krafttraining: 'strength', 'Sprungkraft & Explosivität': 'jump',
    'Schnelligkeit & Agilität': 'distance', Ausdauer: 'distance',
    'Core & Stabilität': 'duration', Mobility: 'duration', Sport: 'duration',
    Regeneration: 'duration',
  }[category] ?? 'duration'
}

export function exerciseIdentity(item) {
  return item.id ?? `legacy:${item.category}:${item.name.trim().toLocaleLowerCase('de-DE')}`
}

export function exerciseMeasurement(item) {
  return item.type === 'volleyball' ? 'duration' :
    MEASUREMENT_TYPES.some(([type]) => type === item.type)
      ? item.type : defaultMeasurement(item.category)
}

export function createLoggedExercise(item) {
  return {
    id: crypto.randomUUID(), libraryId: exerciseIdentity(item), name: item.name,
    category: item.category, type: exerciseMeasurement(item),
    ...(item.muscleGroup ? { muscleGroup: item.muscleGroup } : {}),
    entries: [], notes: '',
  }
}

export function createTrainingSet(type = 'strength') {
  const base = { id: crypto.randomUUID() }
  if (type === 'strength') return { ...base, reps: '', weightKg: '' }
  if (type === 'reps') return { ...base, reps: '' }
  if (type === 'jump') return { ...base, reps: '', heightCm: '' }
  if (type === 'distance') return { ...base, distanceValue: '', distanceUnit: 'm',
    durationValue: '', durationUnit: 's' }
  return { ...base, durationValue: '', durationUnit: 's' }
}

export function hasLegacyValues(exercise) {
  return ['sets', 'reps', 'weight', 'duration', 'distance', 'result']
      .some((field) => exercise[field] !== '' && exercise[field] != null)
}

export function isTrainingPlan(plan) {
  return plan && typeof plan.id === 'string' && typeof plan.name === 'string'
    && plan.name.trim() && TRAINING_CATEGORIES.includes(plan.category)
    && Array.isArray(plan.exercises)
    && plan.exercises.every((item) => item && typeof item.libraryId === 'string'
      && typeof item.name === 'string')
}

const nonnegative = (value) => value === '' || value == null
  || ((typeof value === 'string' || typeof value === 'number')
    && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)

export function isLoggedTrainingExercise(exercise) {
  return exercise && typeof exercise === 'object'
    && (exercise.entries === undefined || (Array.isArray(exercise.entries)
      && exercise.entries.every((entry) => entry && typeof entry.id === 'string'
        && (entry.durationUnit === undefined || ['s', 'min'].includes(entry.durationUnit))
        && (entry.distanceUnit === undefined || ['m', 'km'].includes(entry.distanceUnit))
        && ['reps', 'weightKg', 'durationValue', 'distanceValue', 'heightCm']
          .every((field) => nonnegative(entry[field])))))
}

export function previousExercise(sessions, currentSession, exercise) {
  return sessions.filter((session) => session.id !== currentSession.id
    && session.category === currentSession.category
    && (session.date < currentSession.date
      || (session.date === currentSession.date
        && (session.createdAt ?? '') < (currentSession.createdAt ?? ''))))
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .flatMap((session) => session.exercises.map((item) => ({ session, item })))
    .find(({ item }) => Array.isArray(item.entries) && item.entries.length
      && (item.libraryId && exercise.libraryId
        ? item.libraryId === exercise.libraryId
        : item.name === exercise.name)) ?? null
}

export function formatTrainingEntry(entry, type) {
  const duration = entry.durationValue
    ? `${entry.durationValue} ${entry.durationUnit === 'min' ? 'Min.' : 'Sek.'}` : ''
  if (type === 'strength') return [
    entry.reps ? `${entry.reps} Wdh.` : '',
    entry.weightKg ? `${entry.weightKg} kg` : '',
  ].filter(Boolean).join(' · ')
  if (type === 'reps') return entry.reps ? `${entry.reps} Wdh.` : ''
  if (type === 'jump') return [
    entry.reps ? `${entry.reps} Wdh.` : '',
    entry.heightCm ? `${entry.heightCm} cm` : '',
  ].filter(Boolean).join(' · ')
  if (type === 'distance') return [
    entry.distanceValue ? `${entry.distanceValue} ${entry.distanceUnit || 'm'}` : '', duration,
  ].filter(Boolean).join(' · ')
  return duration
}
