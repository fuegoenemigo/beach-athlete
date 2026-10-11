import { exerciseMeasurement, hasLegacyValues, isConfirmedSet, isOpenTraining } from './trainingModel.js'

const positive = (value) => value !== '' && value != null && Number(value) > 0
const seconds = (value, unit) => Number(value) * (unit === 'min' ? 60 : 1)
const meters = (value, unit) => Number(value) * (unit === 'km' ? 1000 : 1)

function bestMetric(exercise) {
  const type = exerciseMeasurement(exercise)
  const entries = (exercise.entries ?? []).filter((entry) => isConfirmedSet(entry, type))
  if (!entries.length) return null

  if (type === 'strength' || type === 'reps') {
    const weighted = entries.filter((entry) => positive(entry.reps)
      && (positive(entry.weightKg) || (exercise.loadMode === 'bodyweight' && positive(entry.bodyweightKg))))
    if (weighted.length) return { key: 'estimatedStrength', value: Math.max(...weighted.map((entry) => {
      const load = Number(entry.weightKg || 0) + (exercise.loadMode === 'bodyweight' ? Number(entry.bodyweightKg || 0) : 0)
      return load * (1 + Number(entry.reps) / 30)
    })) }
    const reps = entries.filter((entry) => positive(entry.reps))
    return reps.length ? { key: 'reps', value: Math.max(...reps.map((entry) => Number(entry.reps))) } : null
  }
  if (type === 'jump') {
    const heights = entries.filter((entry) => positive(entry.heightCm))
    return heights.length ? { key: 'jumpHeight', value: Math.max(...heights.map((entry) => Number(entry.heightCm))) } : null
  }
  if (type === 'duration' && exercise.muscleGroup === 'Core') {
    const holds = entries.filter((entry) => positive(entry.durationValue))
    return holds.length ? { key: 'coreHold', value: Math.max(...holds.map((entry) => seconds(entry.durationValue, entry.durationUnit))) } : null
  }
  if (type === 'distance' || type === 'carry') {
    const timed = entries.filter((entry) => positive(entry.distanceValue) && positive(entry.durationValue))
    if (!timed.length) return null
    const measured = timed.map((entry) => {
      const distance = meters(entry.distanceValue, entry.distanceUnit)
      const load = type === 'carry' ? Number(entry.weightKg || 0) : 0
      return { key: `${type}:${distance}:${load}`, value: distance / seconds(entry.durationValue, entry.durationUnit) }
    })
    return measured.reduce((best, item) => item.value > best.value ? item : best)
  }
  return null
}

function completedExercises(session) {
  return (session.exercises ?? []).filter((exercise) =>
    exercise.libraryId && ((exercise.entries ?? []).some((entry) =>
      isConfirmedSet(entry, exerciseMeasurement(exercise))) || hasLegacyValues(exercise)))
}

function evaluateDay(exercises, previousById) {
  const comparisons = []
  for (const exercise of exercises.values()) {
    const current = bestMetric(exercise)
    if (!current) continue
    const previous = previousById.get(exercise.libraryId)
    const baseline = previous && bestMetric(previous.exercise)
    if (!baseline || baseline.key !== current.key || !positive(baseline.value)) continue
    comparisons.push({ libraryId: exercise.libraryId, name: exercise.name,
      previousDate: previous.date, changePercent: ((current.value - baseline.value) / baseline.value) * 100 })
  }
  if (!comparisons.length) return { status: 'unrated', comparisons, total: exercises.size }
  const changePercent = comparisons.reduce((sum, item) => sum + item.changePercent, 0) / comparisons.length
  const roundedChange = Math.round(changePercent * 100) / 100
  const status = roundedChange < -1 ? 'decline' : roundedChange <= 1 ? 'unchanged'
    : 'improved'
  return { status, changePercent, comparisons, total: exercises.size }
}

export function trainingDayPerformances(sessions) {
  const ordered = sessions.filter((session) => !isOpenTraining(session))
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  const byDate = new Map()
  for (const session of ordered) {
    if (!byDate.has(session.date)) byDate.set(session.date, new Map())
    for (const exercise of completedExercises(session)) byDate.get(session.date).set(exercise.libraryId, exercise)
  }
  const results = new Map()
  const previousById = new Map()
  for (const [date, exercises] of byDate) {
    results.set(date, evaluateDay(exercises, previousById))
    for (const exercise of exercises.values()) previousById.set(exercise.libraryId, { exercise, date })
  }
  return results
}
