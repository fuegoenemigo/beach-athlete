import { bestMetric } from './calendarPerformance.js'
import { canonicalCategory, exerciseMeasurement, isConfirmedSet, isOpenTraining,
  isSportTrainingAttendance, isBodyweightOnly, effectiveTrainingWeight } from './trainingModel.js'
import { STRENGTH_GROUPS, ARM_SUBGROUPS, strengthGroupFor, strengthGroupQualified,
  strengthMuscleFor, strengthRoleFor, weightedStrengthMean } from './strengthClassification.js'
import { STRENGTH_LOAD_STANDARDS, STRENGTH_REP_STANDARDS } from './strengthStandards.js'

export const RATING_ATTRIBUTES = [
  { id: 'strength', name: 'Kraft' },
  { id: 'jump', name: 'Sprungkraft & Explosivität' },
  { id: 'agility', name: 'Schnelligkeit & Agilität' },
  { id: 'endurance', name: 'Ausdauer' },
  { id: 'control', name: 'Körperkontrolle' },
]

const START = 60
const MAX = 99
const LEARNING_RATE = 0.18
const INACTIVITY_DAYS = 11
const clamp = (value) => Math.max(START, Math.min(MAX, value))
const strengthTarget = (value) => Math.min(96, clamp(value))
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length
const positive = (value) => value !== '' && value != null && Number.isFinite(Number(value))
  && Number(value) > 0
const seconds = (entry) => Number(entry.durationValue) * (entry.durationUnit === 'min' ? 60 : 1)

function monday(date) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7)
  return day.toISOString().slice(0, 10)
}

function track(name, initial = START) {
  return { name, score: initial, startScore: initial, series: [], observations: 0,
    week: null, weekStart: initial }
}

function previousDate(date) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

function recordScore(trackState, date, value) {
  if (!trackState.series.length) trackState.series.push({ date: previousDate(date),
    value: trackState.startScore })
  if (trackState.series.at(-1).date === date) trackState.series.at(-1).value = value
  else trackState.series.push({ date, value })
}

function update(trackState, date, target) {
  if (!trackState.series.length) trackState.series.push({ date: previousDate(date),
    value: trackState.startScore })
  const week = monday(date)
  if (trackState.week !== week) {
    trackState.week = week
    trackState.weekStart = trackState.score
  }
  const desired = trackState.score + LEARNING_RATE * (clamp(target) - trackState.score)
  // The first 20 points are easier to earn; above 80, at most two points per week.
  const weeklyCeiling = Math.max(80, trackState.weekStart) + 2
  trackState.score = clamp(Math.min(desired, weeklyCeiling))
  trackState.observations += 1
  trackState.series.push({ date, value: trackState.score })
}

function attributeFor(exercise) {
  const category = canonicalCategory(exercise.category)
  if (category === 'Krafttraining') return 'strength'
  if (category === 'Ausdauer') return 'endurance'
  if (category === 'Core und Mobility') return exercise.muscleGroup === 'Mobility'
    || exercise.muscleGroup === 'Ganzkörper'
    || /mobility|mobilisation|dehnung|stretch/i.test(exercise.libraryId ?? '')
    ? 'mobility' : 'control'
  if (category === 'Sprungkraft und Agilität') return ['Agilität', 'Schnelligkeit']
    .includes(exercise.muscleGroup) || exerciseMeasurement(exercise) === 'distance'
    ? 'agility' : 'jump'
  return null
}

function confirmedEntries(exercise) {
  const type = exerciseMeasurement(exercise)
  return (exercise.entries ?? []).filter((entry) => isConfirmedSet(entry, type))
}

function comparableMetric(exercise, metric, profileWeight) {
  if (canonicalCategory(exercise.category) !== 'Krafttraining'
    || !metric.key.startsWith('estimatedStrength')) return metric
  const savedWeight = confirmedEntries(exercise).find((entry) => positive(entry.bodyweightKg))
    ?.bodyweightKg
  const bodyweight = savedWeight ?? profileWeight
  return positive(bodyweight) ? { ...metric, value: metric.value / Number(bodyweight) } : metric
}

function benchmark(exercise, metric, profileWeight) {
  if (isBodyweightOnly(exercise) && metric.key === 'reps') {
    const [regular, exceptional] = STRENGTH_REP_STANDARDS[exercise.libraryId]
    return strengthTarget(START + 35 * (metric.value - regular) / (exceptional - regular))
  }
  if (canonicalCategory(exercise.category) === 'Krafttraining') {
    const entries = confirmedEntries(exercise)
    const weight = entries.find((entry) => positive(entry.bodyweightKg))?.bodyweightKg
      ?? profileWeight
    if (exercise.libraryId === 'gym:assisted-pullup' && metric.key === 'reps')
      return strengthTarget(Math.min(80, START + 20 * (metric.value - 8) / 12))
    if (['volleyball:calf', 'gym:back-extension'].includes(exercise.libraryId)
      && positive(weight)) {
      const requiredReps = exercise.libraryId === 'volleyball:calf' ? 15 : 12
      const exceptional = exercise.libraryId === 'volleyball:calf' ? 0.8 : 0.65
      const best = Math.max(0, ...entries.filter((entry) => positive(entry.reps)
        && Number(entry.reps) >= requiredReps).map((entry) =>
        effectiveTrainingWeight(entry, exercise) / Number(weight)
          * (1 + Number(entry.reps) / 30) / (1 + requiredReps / 30)))
      return strengthTarget(START + 35 * best / exceptional)
    }
    if (exercise.libraryId === 'gym:farmers-carry' && positive(weight)) {
      const best = Math.max(0, ...entries.filter((entry) => positive(entry.distanceValue)
        && positive(entry.durationValue) && positive(entry.weightKg)
        && Number(entry.distanceValue) * (entry.distanceUnit === 'km' ? 1000 : 1) >= 30
        && seconds(entry) <= 45).map((entry) =>
        effectiveTrainingWeight(entry, exercise) / Number(weight)))
      return strengthTarget(START + 35 * (best - 0.6) / 1.2)
    }
    const reference = STRENGTH_LOAD_STANDARDS[exercise.libraryId]
    if (reference && positive(weight) && metric.key.startsWith('estimatedStrength')) {
      const standardReps = exercise.libraryId === 'gym:kettlebell-swing' ? 15 : 8
      const workingRatio = metric.value / Number(weight) / (1 + standardReps / 30)
      return strengthTarget(START + 35 * (workingRatio - reference[0])
        / (reference[1] - reference[0]))
    }
  }
  if (metric.key === 'jumpHeight') return clamp(START + 35 * Math.log2(metric.value / 35))
  if (metric.key === 'coreHold') return clamp(START + 18 * Math.log(metric.value / 45))
  if (exercise.guidedEndurance && metric.key.startsWith('guided')) {
    const protocol = exercise.guidedProtocolId ?? ''
    if (protocol.includes('advanced')) return 92
    if (protocol.includes('intermediate')) return 80
    if (protocol.includes('beginner')) return 68
    return 69
  }
  if (metric.key.startsWith('distance:')) {
    const distance = Number(metric.key.split(':')[1])
    if (exercise.libraryId === 'volleyball:sprint' && distance === 30)
      return clamp(START + 110 * Math.log(metric.value / 5))
    if (exercise.libraryId === 'volleyball:shuttle' && distance === 20)
      return clamp(START + 100 * Math.log(metric.value / 3.6))
    const eligible = confirmedEntries(exercise).filter((item) => positive(item.durationValue)
      && seconds(item) >= 600 && positive(item.distanceValue))
    if (eligible.length && canonicalCategory(exercise.category) === 'Ausdauer') {
      const bike = /bike|radfahren/i.test(exercise.libraryId ?? '')
      const speed = Math.max(...eligible.map((item) => Number(item.distanceValue)
        * (item.distanceUnit === 'km' ? 1000 : 1) / seconds(item)))
      return clamp(START + 42 * Math.log(speed / (bike ? 5 : 2.5)))
    }
  }
  return null
}

function mobilityDuration(exercise) {
  return confirmedEntries(exercise).filter((entry) => positive(entry.durationValue))
    .reduce((sum, entry) => sum + seconds(entry), 0)
}

function datedSessions(sessions) {
  return sessions.filter((session) => session?.date && !isOpenTraining(session)
    && !isSportTrainingAttendance(session) && session.category !== 'Regeneration')
    .sort((a, b) => a.date.localeCompare(b.date)
      || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

export function athleteRating(sessions, athleteProfile = {}, asOfDate = new Date().toLocaleDateString('sv-SE')) {
  const attributes = new Map(RATING_ATTRIBUTES.map(({ id, name }) => [id, track(name)]))
  const groups = new Map(STRENGTH_GROUPS.map((name) => [name, { ...track(name), penalty: 0,
    qualified: false, compoundCount: 0, isolationCount: 0, missingArmMuscles: [...ARM_SUBGROUPS] }]))
  const strengthExercises = new Map()
  const strengthObserved = new Map(STRENGTH_GROUPS.map((name) => [name, new Map()]))
  const baselines = new Map()
  const mobilityDays = []
  const overall = track('Gesamtwert')
  const byDay = new Map()
  const nextInactivityDate = new Map()

  function recordOverall(date) {
    overall.score = average([...attributes.values()].map((attribute) => attribute.score))
    recordScore(overall, date, overall.score)
  }

  function refreshStrength(date, activeGroups) {
    for (const name of activeGroups) {
      const group = groups.get(name)
      const observed = [...strengthObserved.get(name).values()]
      group.compoundCount = observed.filter((exercise) =>
        strengthRoleFor(exercise) === 'compound').length
      group.isolationCount = observed.length - group.compoundCount
      group.missingArmMuscles = name === 'Arme' ? ARM_SUBGROUPS.filter((muscle) =>
        !observed.some((exercise) => strengthMuscleFor(exercise) === muscle)) : []
      group.qualified = strengthGroupQualified(observed, name)
      group.penalty *= 1 - LEARNING_RATE
      if (group.qualified) {
        const score = name === 'Arme'
          ? average(ARM_SUBGROUPS.map((muscle) => weightedStrengthMean(observed
            .filter((exercise) => strengthMuscleFor(exercise) === muscle))))
          : weightedStrengthMean(observed)
        group.score = clamp(score - group.penalty)
      }
      group.observations += 1
      recordScore(group, date, group.score)
    }
    const strength = attributes.get('strength')
    strength.score = average([...groups.values()].map((group) => group.score))
    strength.observations += 1
    recordScore(strength, date, strength.score)
  }

  function applyInactivityThrough(date, activeIds = new Set()) {
    const due = new Map()
    for (const [id, nextDate] of nextInactivityDate) {
      let dueDate = nextDate
      while (dueDate < date || (dueDate === date && !activeIds.has(id))) {
        if (!due.has(dueDate)) due.set(dueDate, [])
        due.get(dueDate).push(id)
        dueDate = addDays(dueDate, INACTIVITY_DAYS)
      }
      nextInactivityDate.set(id, dueDate)
    }
    for (const [dueDate, ids] of [...due].sort(([a], [b]) => a.localeCompare(b))) {
      let changed = false
      let strengthChanged = false
      for (const id of ids) {
        const group = id.startsWith('strength:') ? groups.get(id.slice(9)) : null
        const trackState = group ?? attributes.get(id)
        if (!trackState) continue
        const decayed = clamp(trackState.score - 1)
        if (decayed === trackState.score) continue
        if (group) {
          group.penalty += trackState.score - decayed
          strengthChanged = true
        }
        trackState.score = decayed
        recordScore(trackState, dueDate, decayed)
        changed = true
      }
      if (strengthChanged) {
        const strength = attributes.get('strength')
        strength.score = average([...groups.values()].map((group) => group.score))
        recordScore(strength, dueDate, strength.score)
      }
      if (changed) recordOverall(dueDate)
    }
  }
  for (const session of datedSessions(sessions)) {
    if (!byDay.has(session.date)) byDay.set(session.date, new Map())
    for (const exercise of session.exercises ?? []) {
      if (exercise.libraryId && exercise.performanceRole !== 'support'
        && confirmedEntries(exercise).length) byDay.get(session.date).set(exercise.libraryId,
        { ...exercise, category: exercise.category ?? session.category })
    }
  }

  for (const [date, exercises] of byDay) {
    const activeStrengthGroups = new Set([...exercises.values()]
      .filter((exercise) => attributeFor(exercise) === 'strength')
      .map(strengthGroupFor).filter(Boolean))
    const activeIds = new Set([...exercises.values()].map((exercise) => {
      const id = attributeFor(exercise)
      return id === 'mobility' ? 'control' : id === 'strength'
        ? strengthGroupFor(exercise) ? `strength:${strengthGroupFor(exercise)}` : null : id
    }).filter(Boolean))
    applyInactivityThrough(date, activeIds)
    for (const id of activeIds) nextInactivityDate.set(id, addDays(date, INACTIVITY_DAYS))
    const dayTargets = new Map()
    let mobilitySeconds = 0
    let mobilityExercises = 0
    for (const exercise of exercises.values()) {
      const id = attributeFor(exercise)
      if (id === 'mobility') {
        mobilitySeconds += mobilityDuration(exercise)
        mobilityExercises += 1
        continue
      }
      if (!id) continue
      if (id === 'strength') {
        const groupName = strengthGroupFor(exercise)
        if (!groupName) continue
        if (!strengthExercises.has(exercise.libraryId)) strengthExercises.set(exercise.libraryId,
          { ...track(exercise.name), libraryId: exercise.libraryId,
            muscleGroup: strengthMuscleFor(exercise), strengthRole: strengthRoleFor(exercise) })
        strengthObserved.get(groupName).set(exercise.libraryId,
          strengthExercises.get(exercise.libraryId))
      }
      const measured = bestMetric(exercise)
      if (!measured) continue
      const metric = comparableMetric(exercise, measured, athleteProfile.bodyweightKg)
      const baseline = baselines.get(exercise.libraryId)
      if (!baseline || baseline.key !== metric.key) baselines.set(exercise.libraryId, metric)
      const reference = baselines.get(exercise.libraryId)
      const absolute = benchmark(exercise, measured, athleteProfile.bodyweightKg)
      const relative = reference.key === metric.key && reference.value > 0
        ? (id === 'strength' ? strengthTarget : clamp)(START
          + 35 * Math.log2(metric.value / reference.value)) : null
      const target = absolute ?? (baseline ? relative : null)
      if (target == null) continue
      if (id === 'strength') {
        update(strengthExercises.get(exercise.libraryId), date, target)
        continue
      }
      if (!dayTargets.has(id)) dayTargets.set(id, new Map())
      if (!dayTargets.get(id).has(id)) dayTargets.get(id).set(id, [])
      dayTargets.get(id).get(id).push(target)
    }
    if (mobilitySeconds >= 120 || mobilityExercises >= 2) mobilityDays.push(date)
    while (mobilityDays.length && Date.parse(`${date}T00:00:00Z`)
      - Date.parse(`${mobilityDays[0]}T00:00:00Z`) >= 28 * 86400000) mobilityDays.shift()

    if (activeStrengthGroups.size) refreshStrength(date, activeStrengthGroups)
    for (const [id, groupTargets] of dayTargets) {
      if (id !== 'control') update(attributes.get(id), date,
        average([...groupTargets.values()].map(average)))
    }
    if (mobilityDays.includes(date) || dayTargets.has('control')) {
      const control = attributes.get('control')
      const mobilityTarget = clamp(START + Math.min(30, mobilityDays.length * 3))
      const coreTarget = dayTargets.has('control')
        ? average([...dayTargets.get('control').values()].map(average)) : control.score
      const target = dayTargets.has('control')
        ? coreTarget + Math.min(12, mobilityDays.length * 2) : mobilityTarget
      update(control, date, target)
    }
    if ([...attributes.values()].some((attribute) => attribute.series.at(-1)?.date === date)) {
      recordOverall(date)
    }
  }
  applyInactivityThrough(asOfDate)
  return { overall, attributes: RATING_ATTRIBUTES.map(({ id }) => ({ id, ...attributes.get(id),
    groups: id === 'strength' ? [...groups.values()] : [] })) }
}
