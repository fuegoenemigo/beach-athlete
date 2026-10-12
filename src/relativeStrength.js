import { exerciseMeasurement, isConfirmedSet, isOpenTraining } from './trainingModel.js'

const positive = (value) => value !== '' && value != null
  && Number.isFinite(Number(value)) && Number(value) > 0
const loadedBodyweightLifts = new Set(['volleyball:squat', 'volleyball:lunge',
  'volleyball:split-squat', 'gym:front-squat', 'gym:goblet-squat',
  'gym:reverse-lunge', 'gym:step-up'])

function sessionResults(session, profileWeight) {
  const results = []
  for (const exercise of session.exercises ?? []) {
    if (!exercise.libraryId || exercise.category !== 'Krafttraining'
      || exerciseMeasurement(exercise) !== 'strength'
      || (exercise.loadMode === 'bodyweight'
        && !loadedBodyweightLifts.has(exercise.libraryId))) continue
    const entries = (exercise.entries ?? []).filter((entry) =>
      isConfirmedSet(entry, 'strength') && positive(entry.weightKg)
      && Number(entry.reps) >= 1 && Number(entry.reps) <= 10)
    if (!entries.length) continue
    const best = entries.reduce((current, entry) => {
      const estimate = Number(entry.reps) === 1 ? Number(entry.weightKg)
        : Number(entry.weightKg) * (1 + Number(entry.reps) / 30)
      return !current || estimate > current.estimate ? { entry, estimate } : current
    }, null)
    const bodyweight = positive(best.entry.bodyweightKg)
      ? Number(best.entry.bodyweightKg) : profileWeight
    if (!positive(bodyweight)) continue
    results.push({ libraryId: exercise.libraryId, name: exercise.name,
      date: session.date, estimateKg: best.estimate,
      ratio: best.estimate / bodyweight,
      bodyweightKg: bodyweight, usesCurrentBodyweight: !positive(best.entry.bodyweightKg) })
  }
  return results
}

export function relativeStrengthByExercise(sessions, athleteProfile) {
  const profileWeight = positive(athleteProfile?.bodyweightKg)
    ? Number(athleteProfile.bodyweightKg) : null
  const ordered = sessions.filter((session) => !isOpenTraining(session))
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  const latest = new Map()
  for (const session of ordered) {
    for (const result of sessionResults(session, profileWeight)) {
      const previous = latest.get(result.libraryId)
      latest.set(result.libraryId, { ...result, previousRatio: previous?.ratio ?? null })
    }
  }
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
