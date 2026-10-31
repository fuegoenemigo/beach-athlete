import { exerciseMeasurement, hasLegacyValues, isConfirmedSet, isOpenTraining,
  isSportTrainingAttendance, effectiveTrainingWeight, isBodyweightOnly,
  dumbbellCount } from './trainingModel.js'
import { aggregateTrainingComparisons } from './trainingAggregation.js'

const positive = (value) => value !== '' && value != null && Number(value) > 0
const seconds = (value, unit) => Number(value) * (unit === 'min' ? 60 : 1)
const meters = (value, unit) => Number(value) * (unit === 'km' ? 1000 : 1)

export function calendarChangeStatus(changePercent) {
  if (changePercent == null) return 'unrated'
  if (changePercent <= -15) return 'strong-decline'
  if (changePercent < -5) return 'decline'
  if (changePercent <= 5) return 'unchanged'
  if (changePercent < 15) return 'improved'
  return 'strong-improved'
}

export function bestMetric(exercise, profileWeight = '') {
  const type = exerciseMeasurement(exercise)
  const entries = (exercise.entries ?? []).filter((entry) => isConfirmedSet(entry, type))
  if (!entries.length) return null

  if (type === 'strength' || type === 'reps') {
    if (exercise.libraryId === 'gym:assisted-pullup') {
      const assisted = entries.filter((entry) => positive(entry.reps)
        && entry.assistanceKg !== '' && entry.assistanceKg != null
        && Number.isFinite(Number(entry.assistanceKg)) && Number(entry.assistanceKg) >= 0)
        .map((entry) => {
          const bodyweight = Number(entry.bodyweightKg || profileWeight)
          const assistance = Number(entry.assistanceKg)
          if (!Number.isFinite(bodyweight) || bodyweight <= 0 || assistance >= bodyweight) return null
          const share = (bodyweight - assistance) / bodyweight
          return Math.min(Number(entry.reps), 20) * share * share
        }).filter((value) => value != null)
      return assisted.length ? { key: 'assistedPullupReps', value: Math.max(...assisted) } : null
    }
    if (isBodyweightOnly(exercise)) {
      const reps = entries.filter((entry) => positive(entry.reps))
      return reps.length ? { key: 'reps', value: Math.max(...reps.map((entry) =>
        Number(entry.reps))) } : null
    }
    const weighted = entries.filter((entry) => positive(entry.reps)
      && positive(entry.weightKg))
    if (weighted.length) return weighted.map((entry) => {
      const load = effectiveTrainingWeight(entry, exercise)
      return { key: dumbbellCount(exercise) && entry.weightBasis === 'perDumbbell'
        ? 'estimatedStrength:perDumbbell' : 'estimatedStrength',
      value: load * (1 + Number(entry.reps) / 30) }
    }).reduce((best, item) => item.value > best.value ? item : best)
    const reps = entries.filter((entry) => positive(entry.reps))
    return reps.length ? { key: 'reps', value: Math.max(...reps.map((entry) => Number(entry.reps))) } : null
  }
  if (type === 'jump') {
    const heights = entries.filter((entry) => positive(entry.heightCm))
    return heights.length ? { key: 'jumpHeight', value: Math.max(...heights.map((entry) => Number(entry.heightCm))) } : null
  }
  if (type === 'duration' && exercise.muscleGroup === 'Core') {
    const holds = entries.filter((entry) => positive(entry.durationValue))
    return holds.length ? { key: 'coreHold', value: Math.max(...holds.map((entry) =>
      seconds(entry.durationValue, entry.durationUnit))) } : null
  }
  if (type === 'distance' || type === 'carry') {
    if (exercise.guidedEndurance) {
      const sprint = entries.find((entry) => entry.guidedCompletion
        && positive(entry.averageSprintSeconds) && positive(entry.completedSprints)
        && entry.completedSprints === entry.prescribedSprints)
      if (sprint) return { key: `guidedSprint:${exercise.guidedProtocolId}:${sprint.prescribedSprints}`,
        value: 1 / Number(sprint.averageSprintSeconds) }
      const guided = entries.find((entry) => entry.guidedCompletion
        && positive(entry.distanceValue) && positive(entry.durationValue))
      if (!guided) return null
      return { key: `guidedDistance:${exercise.guidedProtocolId}:${seconds(guided.durationValue,
        guided.durationUnit)}`, value: meters(guided.distanceValue, guided.distanceUnit) }
    }
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
    exercise.libraryId && exercise.performanceRole !== 'support'
    && ((exercise.entries ?? []).some((entry) =>
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
      category: exercise.category, muscleGroup: exercise.muscleGroup,
      previousDate: previous.date, changePercent: ((current.value - baseline.value) / baseline.value) * 100 })
  }
  const aggregate = aggregateTrainingComparisons(comparisons)
  const changePercent = comparisons.length
    ? comparisons.reduce((sum, item) => sum + item.changePercent, 0) / comparisons.length
    : null
  return { status: calendarChangeStatus(changePercent), changePercent,
    groupedChangePercent: aggregate.changePercent,
    comparisons, categories: aggregate.categories, total: exercises.size }
}

export function trainingDayPerformances(sessions) {
  const ordered = sessions.filter((session) => !isOpenTraining(session)
    && session.category !== 'Regeneration'
    && !isSportTrainingAttendance(session))
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  const byDate = new Map()
  for (const session of ordered) {
    if (!byDate.has(session.date)) byDate.set(session.date, new Map())
    for (const exercise of completedExercises(session)) byDate.get(session.date).set(exercise.libraryId,
      { ...exercise, category: exercise.category ?? session.category })
  }
  const results = new Map()
  const previousById = new Map()
  for (const [date, exercises] of byDate) {
    results.set(date, evaluateDay(exercises, previousById))
    for (const exercise of exercises.values()) previousById.set(exercise.libraryId, { exercise, date })
  }
  return results
}
