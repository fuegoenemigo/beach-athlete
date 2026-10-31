export const TRAINING_CATEGORIES = [
  'Krafttraining', 'Sprungkraft und Agilität', 'Ausdauer', 'Core und Mobility',
  'Beach-Training', 'Hallentraining',
]

export const LEGACY_TRAINING_CATEGORIES = [
  'Sprungkraft & Explosivität', 'Schnelligkeit & Agilität',
  'Core & Stabilität', 'Mobility', 'Sport', 'Regeneration',
]

export const isOpenTraining = (session) => session?.status === 'ongoing'

export const isSportTrainingCategory = (category) =>
  category === 'Beach-Training' || category === 'Hallentraining'

export const isSportTrainingAttendance = (session) =>
  isSportTrainingCategory(session?.category) && session.status === 'completed'
  && (session.attendanceOnly === true
    || Boolean(session.startTime && session.endTime && session.exercises?.length === 0))

export function createSportTrainingSession({ id, date, category, timestamp }) {
  if (!id || !date || !isSportTrainingCategory(category)) return null
  return {
    id, date, category, categories: [category], subcategory: '', planId: null, planName: '',
    durationMinutes: '', intensity: '', notes: '', attendanceOnly: true,
    status: 'completed', exercises: [], createdAt: timestamp, completedAt: timestamp,
  }
}

export function addTrainingIfNoOpen(sessions, session) {
  return sessions.some(isOpenTraining) ? sessions : [...sessions, session]
}

export function trainingWithAddedExercise(session, exercise, enduranceFlow = null) {
  const firstIndividualExercise = !session.planId && !(session.exercises ?? []).length
  const category = firstIndividualExercise ? exercise.category : session.category
  return { category,
    categories: [...new Set([...(firstIndividualExercise ? [category]
      : session.categories ?? [session.category]), exercise.category])],
    exercises: [...(session.exercises ?? []), exercise],
    ...(enduranceFlow ? { enduranceFlow } : {}) }
}

export function canonicalCategory(category, subcategory = '') {
  if (['Sprungkraft & Explosivität', 'Schnelligkeit & Agilität'].includes(category))
    return 'Sprungkraft und Agilität'
  if (['Core & Stabilität', 'Mobility'].includes(category)) return 'Core und Mobility'
  if (category === 'Sport') {
    if (['Beachvolleyball', 'Beach-Training'].includes(subcategory)) return 'Beach-Training'
    if (['Hallenvolleyball', 'Hallentraining'].includes(subcategory)) return 'Hallentraining'
  }
  return category
}

export const MUSCLE_GROUPS = [
  'Brust', 'Rücken', 'Beine', 'Schultern', 'Bizeps', 'Trizeps',
]

export const SPORTS = [
  'Beachvolleyball', 'Hallenvolleyball', 'Schwimmen', 'Laufen', 'Radfahren', 'Sonstiger Sport',
]

export const MEASUREMENT_TYPES = [
  ['strength', 'Gewicht und Wiederholungen'],
  ['reps', 'Wiederholungen'],
  ['duration', 'Dauer'],
  ['distance', 'Distanz und Dauer'],
  ['carry', 'Distanz, Dauer und Gewicht'],
  ['jump', 'Sprunghöhe und Wiederholungen'],
]

const DUMBBELL_COUNTS = {
  'gym:dumbbell-bench': 2, 'gym:dumbbell-incline': 2,
  'gym:dumbbell-fly': 2, 'gym:dumbbell-row': 1,
  'gym:dumbbell-press': 2, 'gym:arnold-press': 2,
  'gym:lateral-raise': 2, 'gym:dumbbell-curl': 2,
  'gym:hammer-curl': 2, 'gym:concentration-curl': 1,
  'gym:goblet-squat': 1,
  'volleyball:lunge': 2, 'volleyball:split-squat': 2,
  'gym:reverse-lunge': 2, 'gym:step-up': 2,
}

const BODYWEIGHT_ONLY = new Set([
  'volleyball:pullup', 'volleyball:pushup', 'gym:dips',
  'volleyball:calf', 'gym:back-extension',
  'gym:crunch', 'gym:situp', 'gym:reverse-crunch', 'gym:hanging-leg-raise',
  'gym:dead-bug', 'gym:bird-dog', 'gym:russian-twist', 'gym:ab-wheel',
  'volleyball:plank', 'volleyball:side-plank', 'volleyball:l-sit',
  'gym:hollow-hold', 'gym:deep-squat-hold',
  'gym:jump-squat', 'gym:pogo', 'gym:tuck-jump', 'gym:drop-jump',
  'gym:split-jump', 'gym:single-leg-hop', 'gym:block-jump',
  'volleyball:box-jump', 'volleyball:cmj', 'volleyball:lateral-jump',
  'volleyball:approach-jump', 'volleyball:lateral-bound',
])
const EXTERNAL_LOAD = new Set([
  'volleyball:squat', 'volleyball:lunge', 'volleyball:split-squat',
  'gym:front-squat', 'gym:goblet-squat', 'gym:hip-thrust',
  'gym:glute-bridge', 'gym:step-up', 'gym:reverse-lunge',
])

export const dumbbellCount = (exercise) => DUMBBELL_COUNTS[exercise.libraryId ?? exercise.id] ?? 0
export const isBodyweightOnly = (exercise) =>
  BODYWEIGHT_ONLY.has(exercise.libraryId ?? exercise.id)
  || exercise.loadMode === 'bodyweightOnly'
export const isExternalLoad = (exercise) => EXTERNAL_LOAD.has(exercise.libraryId ?? exercise.id)
export const isAssistedPullup = (exercise) =>
  (exercise.libraryId ?? exercise.id) === 'gym:assisted-pullup'

export function effectiveTrainingWeight(entry, exercise) {
  const weight = Number(entry.weightKg || 0)
  return entry.weightBasis === 'perDumbbell' ? weight * (dumbbellCount(exercise) || 1) : weight
}

export function defaultMeasurement(category) {
  return {
    Krafttraining: 'strength', 'Sprungkraft und Agilität': 'jump',
    Ausdauer: 'distance', 'Core und Mobility': 'duration',
    'Beach-Training': 'duration', Hallentraining: 'duration',
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
    ...(dumbbellCount(item) ? { dumbbellCount: dumbbellCount(item) } : {}),
    ...(item.muscleGroup ? { muscleGroup: item.muscleGroup } : {}),
    ...(item.strengthRole ? { strengthRole: item.strengthRole } : {}),
    ...(isBodyweightOnly(item) ? { loadMode: 'bodyweightOnly' }
      : !isExternalLoad(item) && item.loadMode ? { loadMode: item.loadMode } : {}),
    ...(item.intervalWorkMinutes ? { intervalWorkMinutes: item.intervalWorkMinutes } : {}),
    ...(item.targetDurationSeconds ? { targetDurationSeconds: item.targetDurationSeconds } : {}),
    ...(item.intervalCount ? { intervalCount: item.intervalCount } : {}),
    ...(item.intervalRestSeconds ? { intervalRestSeconds: item.intervalRestSeconds } : {}),
    ...(item.performanceRole ? { performanceRole: item.performanceRole } : {}),
    ...(item.defaultDurationUnit ? { defaultDurationUnit: item.defaultDurationUnit } : {}),
    ...(item.target ? { target: item.target } : {}),
    ...(Array.isArray(item.plannedSets) ? { plannedSets: item.plannedSets.map((set) => ({ ...set })) } : {}),
    entries: [], notes: '',
  }
}

export function createTrainingSet(type = 'strength', durationUnit = 's') {
  const base = { id: crypto.randomUUID() }
  if (type === 'strength') return { ...base, reps: '', weightKg: '' }
  if (type === 'reps') return { ...base, reps: '', weightKg: '' }
  if (type === 'jump') return { ...base, reps: '', heightCm: '', weightKg: '' }
  if (type === 'distance' || type === 'carry') return { ...base, distanceValue: '', distanceUnit: 'm',
    ...(type === 'carry' ? { weightKg: '' } : {}),
    durationValue: '', durationUnit }
  return { ...base, durationValue: '', durationUnit }
}

const PLAN_SET_VALUES = ['reps', 'weightKg', 'assistanceKg', 'durationValue',
  'distanceValue', 'heightCm']

export function plannedSetValues(entry) {
  const values = Object.fromEntries(PLAN_SET_VALUES.filter((field) =>
    entry[field] !== '' && entry[field] != null).map((field) => [field, String(entry[field])]))
  if (entry.weightBasis === 'perDumbbell') values.weightBasis = 'perDumbbell'
  if (entry.durationUnit) values.durationUnit = entry.durationUnit
  if (entry.distanceUnit) values.distanceUnit = entry.distanceUnit
  return values
}

export function trainingPlanFromSession(session, id, name) {
  const exercises = session.exercises.flatMap((exercise) => {
    const type = exerciseMeasurement({ ...exercise, category: exercise.category ?? session.category })
    const plannedSets = (exercise.entries ?? []).filter((entry) => isConfirmedSet(entry, type))
      .map(plannedSetValues)
    if (!plannedSets.length) return []
    return [{ libraryId: exercise.libraryId ?? exerciseIdentity(exercise),
      name: exercise.name, type, category: exercise.category ?? session.category,
      ...(exercise.muscleGroup ? { muscleGroup: exercise.muscleGroup } : {}),
      ...(exercise.strengthRole ? { strengthRole: exercise.strengthRole } : {}),
      ...(exercise.loadMode ? { loadMode: exercise.loadMode } : {}),
      plannedSets }]
  })
  if (!exercises.length) return null
  const category = canonicalCategory(session.category, session.subcategory)
  if (!TRAINING_CATEGORIES.includes(category)) return null
  return { id, name: name.trim(), category,
    categories: [...new Set([category, ...exercises.map((item) => item.category)])],
    exercises, description: 'Aus einer abgeschlossenen Trainingseinheit gespeichert.' }
}

export function hasMeasuredValue(entry, type) {
  const positive = (value) => value !== '' && value != null
    && Number.isFinite(Number(value)) && Number(value) > 0
  if (type === 'strength' || type === 'reps') return positive(entry.reps)
  if (type === 'jump') return positive(entry.reps) || positive(entry.heightCm)
  if (type === 'distance' || type === 'carry')
    return positive(entry.distanceValue) || positive(entry.durationValue)
  return positive(entry.durationValue)
}

export function hasRequiredIntervalDuration(exercise, entry) {
  return !exercise.intervalWorkMinutes || (entry.durationValue !== ''
    && entry.durationValue != null && Number.isFinite(Number(entry.durationValue))
    && Number(entry.durationValue) > 0)
}

export function isConfirmedSet(entry, type) {
  return entry.completed === true
    || (entry.completed === undefined && hasMeasuredValue(entry, type))
}

export function suggestedTrainingSet(draft, previous, type, exercise = {}) {
  if (!draft || !previous) return draft
  const fields = isAssistedPullup(exercise) ? ['reps', 'assistanceKg']
    : type === 'strength' ? ['reps', 'weightKg']
    : type === 'reps' ? ['reps']
    : type === 'jump' ? isBodyweightOnly(exercise) ? ['reps', 'heightCm']
      : ['reps', 'heightCm', 'weightKg']
      : type === 'carry' ? ['distanceValue', 'durationValue', 'weightKg']
      : type === 'distance' ? ['distanceValue', 'durationValue']
        : ['durationValue']
  const suggested = { ...draft }
  for (const field of fields) {
    if (field === 'weightKg' && dumbbellCount(exercise)
      && previous.weightBasis !== 'perDumbbell') continue
    if (suggested[field] !== '' && suggested[field] != null) continue
    if (previous[field] === '' || previous[field] == null) continue
    const number = Number(previous[field])
    if (!Number.isFinite(number) || number < 0) continue
    let value = number
    if (field === 'distanceValue' && (previous.distanceUnit ?? 'm') !== (draft.distanceUnit ?? 'm')) {
      value *= previous.distanceUnit === 'km' ? 1000 : 0.001
    }
    if (field === 'durationValue' && (previous.durationUnit ?? 's') !== (draft.durationUnit ?? 's')) {
      value *= previous.durationUnit === 'min' ? 60 : 1 / 60
    }
    suggested[field] = String(Number(value.toFixed(4)))
  }
  return suggested
}

export function applyPreviousSetValues(draft, previous, type, exercise = {}) {
  if (!draft || !previous) return draft
  const cleared = { ...draft, ...Object.fromEntries(PLAN_SET_VALUES.map((field) => [field, ''])) }
  const reusable = suggestedTrainingSet(cleared, previous, type, exercise)
  const values = Object.fromEntries(PLAN_SET_VALUES.filter((field) =>
    reusable[field] !== '' && reusable[field] != null)
    .map((field) => [field, reusable[field]]))
  return { ...draft, ...values,
    ...(values.weightKg && previous.weightBasis === 'perDumbbell'
      ? { weightBasis: 'perDumbbell' } : {}) }
}

export function createExerciseSetDraft(exercise, index = 0, previous = null, typeOverride = null) {
  const type = typeOverride ?? exerciseMeasurement(exercise)
  const source = exercise.plannedSets?.[index] ?? previous
  const base = createTrainingSet(type, source?.durationUnit ?? exercise.defaultDurationUnit
    ?? (exercise.intervalWorkMinutes ? 'min' : 's'))
  if (source?.distanceUnit && 'distanceUnit' in base) base.distanceUnit = source.distanceUnit
  return { ...(source ? suggestedTrainingSet(base, source, type, exercise) : base), completed: false }
}

export function confirmAndAdvanceSet(entries, type, bodyweightKg = '', previous = null, exercise = {}) {
  const draft = entries.find((entry) => entry.completed === false)
  const values = suggestedTrainingSet(draft, previous, type, exercise)
  if (!values || !hasMeasuredValue(values, type)) return null
  if (isAssistedPullup(exercise) && (values.assistanceKg === ''
    || values.assistanceKg == null || !Number.isFinite(Number(values.assistanceKg))
    || Number(values.assistanceKg) < 0)) return null
  const confirmedCount = entries.filter((entry) => isConfirmedSet(entry, type)).length
  const carryForward = ['strength', 'reps', 'jump'].includes(type)
    ? { ...values, ...(dumbbellCount(exercise) && values.weightKg !== ''
      ? { weightBasis: 'perDumbbell' } : {}) } : null
  const nextDraft = createExerciseSetDraft({ ...exercise,
    defaultDurationUnit: draft.durationUnit ?? exercise.defaultDurationUnit },
  confirmedCount + 1, carryForward, type)
  return [...entries.map((entry) => entry.id === draft.id
    ? { ...values, ...(isBodyweightOnly(exercise) && type !== 'strength' ? { weightKg: '' } : {}),
      completed: true, confirmedAt: new Date().toISOString(),
      ...(dumbbellCount(exercise) && values.weightKg !== ''
        ? { weightBasis: 'perDumbbell' } : {}),
      ...(bodyweightKg ? { bodyweightKg } : {}) } : entry),
  { ...nextDraft, completed: false }]
}

export function finishTrainingExerciseEntries(entries, type, discardDraft = false) {
  if (!discardDraft && entries.some((entry) => entry.completed === false && hasMeasuredValue(entry, type)))
    return null
  return entries.filter((entry) => isConfirmedSet(entry, type))
}

export function hasLegacyValues(exercise) {
  return ['sets', 'reps', 'weight', 'duration', 'distance', 'result']
      .some((field) => exercise[field] !== '' && exercise[field] != null)
}

export function isTrainingPlan(plan) {
  return plan && typeof plan.id === 'string' && typeof plan.name === 'string'
    && plan.name.trim() && [...TRAINING_CATEGORIES, ...LEGACY_TRAINING_CATEGORIES].includes(plan.category)
    && (plan.categories === undefined || (Array.isArray(plan.categories)
      && plan.categories.includes(plan.category)
      && plan.categories.every((category) => [...TRAINING_CATEGORIES, ...LEGACY_TRAINING_CATEGORIES].includes(category))))
    && Array.isArray(plan.exercises)
    && plan.exercises.every((item) => item && typeof item.libraryId === 'string'
      && typeof item.name === 'string'
      && (item.category === undefined || item.category === plan.category
        || plan.categories?.includes(item.category))
      && (item.plannedSets === undefined || (Array.isArray(item.plannedSets)
        && item.plannedSets.every((set) => set && typeof set === 'object'
          && PLAN_SET_VALUES.every((field) => nonnegative(set[field]))
          && (set.weightBasis === undefined || set.weightBasis === 'perDumbbell')
          && (set.durationUnit === undefined || ['s', 'min'].includes(set.durationUnit))
          && (set.distanceUnit === undefined || ['m', 'km'].includes(set.distanceUnit))))))
}

const nonnegative = (value) => value === '' || value == null
  || ((typeof value === 'string' || typeof value === 'number')
    && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0)

export function isLoggedTrainingExercise(exercise) {
  return exercise && typeof exercise === 'object'
    && (exercise.entries === undefined || (Array.isArray(exercise.entries)
      && exercise.entries.every((entry) => entry && typeof entry.id === 'string'
        && (entry.weightBasis === undefined || entry.weightBasis === 'perDumbbell')
        && (entry.durationUnit === undefined || ['s', 'min'].includes(entry.durationUnit))
        && (entry.distanceUnit === undefined || ['m', 'km'].includes(entry.distanceUnit))
        && ['reps', 'weightKg', 'assistanceKg', 'bodyweightKg', 'durationValue', 'distanceValue', 'heightCm']
          .every((field) => nonnegative(entry[field])))))
}

export function previousExercise(sessions, currentSession, exercise) {
  return sessions.filter((session) => session.id !== currentSession.id
    && (session.date < currentSession.date
      || (session.date === currentSession.date
        && (session.createdAt ?? '') < (currentSession.createdAt ?? ''))))
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .flatMap((session) => [...session.exercises].reverse().map((item) => ({ session, item })))
    .find(({ session, item }) => (hasLegacyValues(item)
      || (Array.isArray(item.entries)
        && item.entries.some((entry) => isConfirmedSet(entry, exerciseMeasurement({
          ...item, category: currentSession.category,
        })))))
      && canonicalCategory(item.category ?? session.category, session.subcategory)
        === canonicalCategory(exercise.category ?? currentSession.category, currentSession.subcategory)
      && (item.libraryId && exercise.libraryId
        ? item.libraryId === exercise.libraryId
        : item.name === exercise.name)) ?? null
}

export function previousSetFor(previous, setIndex) {
  if (!previous || !Number.isInteger(setIndex) || setIndex < 0) return null
  const type = exerciseMeasurement({
    ...previous.item, category: previous.item.category ?? previous.session.category,
  })
  const confirmed = (previous.item.entries ?? [])
    .filter((entry) => isConfirmedSet(entry, type))
  if (confirmed[setIndex]) return confirmed[setIndex]
  if (setIndex !== 0 || confirmed.length || !hasLegacyValues(previous.item)) return null
  const item = previous.item
  if (type === 'strength' || type === 'reps') {
    const reps = item.reps !== '' && item.reps != null ? String(item.reps) : ''
    const weightKg = type === 'strength' && item.weight !== '' && item.weight != null
      ? String(item.weight) : ''
    return reps || weightKg ? { reps, weightKg } : null
  }
  if (type === 'duration' && item.duration !== '' && item.duration != null)
    return { durationValue: String(item.duration), durationUnit: 'min' }
  return null
}

export function formatTrainingEntry(entry, type, exercise = {}) {
  const duration = entry.durationValue
    ? `${entry.durationValue} ${entry.durationUnit === 'min' ? 'Min.' : 'Sek.'}` : ''
  const load = isBodyweightOnly(exercise) ? Number(entry.weightKg) > 0
    ? `+ ${entry.weightKg} kg Zusatzgewicht` : ''
    : exercise.loadMode === 'bodyweight' && !isExternalLoad(exercise)
    ? [entry.bodyweightKg ? `Eigengewicht ${entry.bodyweightKg} kg` : '',
      entry.weightKg ? `+ ${entry.weightKg} kg zusätzlich${entry.weightBasis === 'perDumbbell'
        ? dumbbellCount(exercise) === 2 ? ' je Hantel' : ' (eine Hantel)' : ''}` : '']
      .filter(Boolean).join(' ')
    : entry.weightKg ? `${entry.weightKg} kg${entry.weightBasis === 'perDumbbell'
      ? dumbbellCount(exercise) === 2 ? ' je Hantel' : ' (eine Hantel)' : ''}` : ''
  if (isAssistedPullup(exercise)) return [
    entry.reps ? `${entry.reps} Wdh.` : '',
    entry.assistanceKg !== '' && entry.assistanceKg != null
      ? `${entry.assistanceKg} kg Unterstützung` : '',
  ].filter(Boolean).join(' · ')
  if (type === 'strength') return [
    entry.reps ? `${entry.reps} Wdh.` : '',
    load,
  ].filter(Boolean).join(' · ')
  if (type === 'reps') return [entry.reps ? `${entry.reps} Wdh.` : '', load]
    .filter(Boolean).join(' · ')
  if (type === 'jump') return [
    entry.reps ? `${entry.reps} Wdh.` : '',
    entry.heightCm ? `${entry.heightCm} cm` : '',
    load,
  ].filter(Boolean).join(' · ')
  if (type === 'distance' || type === 'carry') return [
    entry.distanceValue ? `${entry.distanceValue} ${entry.distanceUnit || 'm'}` : '', duration,
    type === 'carry' ? load : '',
  ].filter(Boolean).join(' · ')
  return duration
}
