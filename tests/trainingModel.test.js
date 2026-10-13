import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createLoggedExercise, createTrainingSet, exerciseIdentity, hasLegacyValues,
  previousExercise, previousSetFor, formatTrainingEntry, canonicalCategory,
  hasMeasuredValue, hasRequiredIntervalDuration, isConfirmedSet, confirmAndAdvanceSet,
  suggestedTrainingSet,
  dumbbellCount, effectiveTrainingWeight,
  finishTrainingExerciseEntries, isOpenTraining, addTrainingIfNoOpen,
  createSportTrainingSession, isSportTrainingAttendance, trainingWithAddedExercise,
} from '../src/trainingModel.js'
import { chooseInitialSync, dataHash, isAthleteData } from '../src/syncPolicy.js'
import { DEFAULT_EXERCISES, STANDARD_PLANS, FOCUS_PLANS, ADDITIONAL_PLANS, VOLLEYBALL_PLANS,
  enrichExercise, searchTrainingPlans } from '../src/volleyballTraining.js'
import { INSTRUCTIONS, instructionForExercise } from '../src/exerciseInstructions.js'

const library = [{ name: 'Bankdrücken', category: 'Krafttraining',
  muscleGroup: 'Brust', type: 'strength' }]
const base = () => ({ sessions: [], exerciseLibrary: structuredClone(library),
  volleyballDays: [], trainingPlans: [] })

test('beach and hall training save attendance only and no exercises or times', () => {
  for (const category of ['Beach-Training', 'Hallentraining']) {
    const entry = createSportTrainingSession({ id: category, date: '2026-10-11', category,
      timestamp: '2026-10-11T19:45:00Z' })
    assert.equal(entry.durationMinutes, '')
    assert.equal(entry.status, 'completed')
    assert.equal(entry.attendanceOnly, true)
    assert.deepEqual(entry.exercises, [])
    assert.equal('startTime' in entry, false)
    assert.equal('endTime' in entry, false)
    assert.equal(isSportTrainingAttendance(entry), true)
    assert.equal(isAthleteData({ sessions: [entry], exerciseLibrary: [], volleyballDays: [] }), true)
  }
  assert.equal(isSportTrainingAttendance({ category: 'Beach-Training', status: 'completed',
    startTime: '18:15', endTime: '19:45', exercises: [] }), true)
  assert.equal(createSportTrainingSession({ id: 'invalid', date: '2026-10-11',
    category: 'Krafttraining' }), null)
})

test('a plan and separate measured sets stay valid for cloud sync', () => {
  const data = base()
  const reference = { libraryId: exerciseIdentity(library[0]), name: 'Bankdrücken', type: 'strength',
    muscleGroup: 'Brust' }
  data.trainingPlans.push({ id: 'upper-body', name: 'Oberkörper',
    category: 'Krafttraining', exercises: [reference] })
  const exercise = createLoggedExercise(library[0])
  exercise.entries = [
    { ...createTrainingSet(), reps: '8', weightKg: '60' },
    { ...createTrainingSet(), reps: '6', weightKg: '65' },
  ]
  data.sessions.push({ id: 'session', date: '2026-10-10', category: 'Krafttraining',
    planId: 'upper-body', planName: 'Oberkörper',
    exercises: [exercise] })
  assert.equal(isAthleteData(data), true)
  assert.equal(exercise.entries[0].weightKg, '60')
  assert.equal(exercise.entries[1].weightKg, '65')
  assert.equal(hasLegacyValues(exercise), false)
  assert.notEqual(dataHash(data), dataHash({ ...data, trainingPlans: [] }))
})

test('only one new training can remain open at a time without removing older data', () => {
  const first = { id: 'first', status: 'ongoing', date: '2026-10-10', exercises: [] }
  const second = { id: 'second', status: 'ongoing', date: '2026-10-11', exercises: [] }
  const existing = [{ id: 'done', status: 'completed', exercises: [] }]
  const withFirst = addTrainingIfNoOpen(existing, first)
  assert.equal(withFirst.length, 2)
  assert.equal(addTrainingIfNoOpen(withFirst, second), withFirst)
  assert.equal(isOpenTraining(first), true)
  assert.equal(isOpenTraining(existing[0]), false)
  assert.equal(addTrainingIfNoOpen(existing, second).at(-1).id, 'second')
})

test('individual training collects exercise categories independently of the plan filter', () => {
  const session = { id: 'mixed', date: '2026-10-13', status: 'ongoing',
    category: 'Krafttraining', categories: ['Krafttraining'], planId: null, exercises: [] }
  const cardio = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.category === 'Ausdauer' && item.performanceRole !== 'support'))
  const strength = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.category === 'Krafttraining'))
  const core = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.category === 'Core und Mobility'))
  const cardioFlow = { exerciseId: cardio.id, freeTraining: true, phase: 'warmup' }
  const afterCardio = { ...session, ...trainingWithAddedExercise(session, cardio, cardioFlow) }
  assert.equal(afterCardio.category, 'Ausdauer')
  assert.deepEqual(afterCardio.categories, ['Ausdauer'])
  assert.deepEqual(afterCardio.enduranceFlow, cardioFlow)
  const afterStrength = { ...afterCardio, enduranceFlow: null,
    ...trainingWithAddedExercise(afterCardio, strength) }
  const mixed = { ...afterStrength, ...trainingWithAddedExercise(afterStrength, core) }
  assert.deepEqual(mixed.categories, ['Ausdauer', 'Krafttraining', 'Core und Mobility'])
  assert.deepEqual(mixed.exercises.map((exercise) => exercise.category), mixed.categories)
  assert.equal(isAthleteData({ sessions: [mixed], exerciseLibrary: [],
    volleyballDays: [] }), true)
})

test('older sessions and backups remain readable without invented sets', () => {
  const old = base()
  delete old.trainingPlans
  old.sessions.push({ id: 'old', date: '2026-10-09', category: 'Krafttraining',
    exercises: [{ id: 'press', name: 'Bankdrücken', type: 'strength',
      sets: '3', reps: '8', weight: '60' }] })
  assert.equal(isAthleteData(old), true)
  assert.equal(hasLegacyValues(old.sessions[0].exercises[0]), true)
  assert.equal(chooseInitialSync(base(), { ...old, revision: 'r1' },
    null, 'user', library), 'download')
})

test('invalid plan categories and ambiguous set units are rejected', () => {
  const data = base()
  data.trainingPlans.push({ id: 'x', name: 'Plan', category: 'Unbekannt', exercises: [] })
  assert.equal(isAthleteData(data), false)
  data.trainingPlans = []
  data.sessions.push({ id: 'session', date: '2026-10-10', exercises: [{
    id: 'run', entries: [{ ...createTrainingSet(), distanceUnit: 'miles' }],
  }] })
  assert.equal(isAthleteData(data), false)
})

test('previous performance compares the same exercise, not the whole strength category', () => {
  const first = { id: 'one', date: '2026-10-01', category: 'Krafttraining', createdAt: '2026-10-01T10:00:00Z',
    exercises: [{ id: 'press', libraryId: exerciseIdentity(library[0]), name: 'Bankdrücken',
      type: 'strength', entries: [{ ...createTrainingSet(), reps: '8', weightKg: '60' }] }] }
  const other = { id: 'two', date: '2026-10-02', category: 'Krafttraining', createdAt: '2026-10-02T10:00:00Z',
    exercises: [{ id: 'squat', name: 'Kniebeugen', entries: [{ ...createTrainingSet(), reps: '8', weightKg: '80' }] }] }
  const current = { id: 'three', date: '2026-10-03', category: 'Krafttraining',
    createdAt: '2026-10-03T10:00:00Z', exercises: [] }
  const previous = previousExercise([first, other, current], current, first.exercises[0])
  assert.equal(previous.session.id, 'one')
  assert.equal(formatTrainingEntry(previous.item.entries[0], 'strength'), '8 Wdh. · 60 kg')
})

test('the last saved exercise is used as reference, including older aggregate entries', () => {
  const id = exerciseIdentity(library[0])
  const earlier = { id: 'old', date: '2026-09-01', category: 'Krafttraining',
    exercises: [{ id: 'old-set', libraryId: id, name: 'Bankdrücken', type: 'strength',
      entries: [{ ...createTrainingSet(), reps: '6', weightKg: '50' }] }] }
  const latest = { id: 'latest', date: '2026-10-01', category: 'Krafttraining',
    exercises: [{ id: 'legacy', libraryId: id, name: 'Bankdrücken', reps: '8', weight: '60' }] }
  const current = { id: 'now', date: '2026-10-11', category: 'Krafttraining', exercises: [] }
  assert.equal(previousExercise([earlier, latest, current], current, earlier.exercises[0]).item.id, 'legacy')
  assert.equal(previousSetFor(previousExercise([earlier, latest, current], current,
    earlier.exercises[0]), 0), null)
})

test('each current set references only the matching set from the last exercise', () => {
  const id = exerciseIdentity(library[0])
  const earlier = { id: 'earlier', date: '2026-09-01', category: 'Krafttraining',
    exercises: [{ id: 'old', libraryId: id, name: 'Bankdrücken', type: 'strength',
      entries: [{ ...createTrainingSet(), reps: '10', weightKg: '40' }] }] }
  const latest = { id: 'latest', date: '2026-10-01', category: 'Krafttraining',
    exercises: [{ id: 'press', libraryId: id, name: 'Bankdrücken', type: 'strength',
      entries: [
        { ...createTrainingSet(), reps: '10', weightKg: '50' },
        { ...createTrainingSet(), reps: '8', weightKg: '55' },
        { ...createTrainingSet(), reps: '6', weightKg: '60' },
        { ...createTrainingSet(), reps: '4', weightKg: '65', completed: false },
      ] }] }
  const current = { id: 'current', date: '2026-10-11', category: 'Krafttraining',
    exercises: [] }
  const previous = previousExercise([earlier, latest, current], current, latest.exercises[0])
  assert.equal(previous.session.id, 'latest')
  assert.deepEqual([0, 1, 2].map((index) => formatTrainingEntry(
    previousSetFor(previous, index), 'strength')),
  ['10 Wdh. · 50 kg', '8 Wdh. · 55 kg', '6 Wdh. · 60 kg'])
  assert.equal(previousSetFor(previous, 3), null)
})

test('a matching prior set appears as a suggestion and is saved only on confirmation', () => {
  const prior = { reps: '8', weightKg: '60', bodyweightKg: '70', notes: 'old note' }
  const draft = { ...createTrainingSet('strength'), completed: false }
  assert.equal(draft.reps, '')
  assert.deepEqual([suggestedTrainingSet(draft, prior, 'strength').reps,
    suggestedTrainingSet(draft, prior, 'strength').weightKg], ['8', '60'])
  const [saved, next] = confirmAndAdvanceSet([draft], 'strength', '75', prior)
  assert.equal(saved.reps, '8')
  assert.equal(saved.weightKg, '60')
  assert.equal(saved.bodyweightKg, '75')
  assert.equal(saved.notes, undefined)
  assert.equal(next.reps, '')
  assert.equal(confirmAndAdvanceSet([next], 'strength'), null)
})

test('dumbbell sets store one-hantel input explicitly and leave legacy weights untouched', () => {
  const exercise = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'gym:dumbbell-bench'))
  assert.equal(dumbbellCount(exercise), 2)
  const draft = { ...createTrainingSet('strength'), reps: '8', weightKg: '26', completed: false }
  const [saved] = confirmAndAdvanceSet([draft], 'strength', '75', null, exercise)
  assert.equal(saved.weightKg, '26')
  assert.equal(saved.weightBasis, 'perDumbbell')
  assert.equal(effectiveTrainingWeight(saved, exercise), 52)
  assert.equal(formatTrainingEntry(saved, 'strength', exercise), '8 Wdh. · 26 kg je Hantel')
  const legacy = { reps: '8', weightKg: '40', completed: true }
  assert.equal(effectiveTrainingWeight(legacy, exercise), 40)
  assert.equal(suggestedTrainingSet(createTrainingSet('strength'), legacy,
    'strength', exercise).weightKg, '')
  assert.equal(suggestedTrainingSet(createTrainingSet('strength'), saved,
    'strength', exercise).weightKg, '26')
})

test('one-arm dumbbell exercises keep the entered single-hantel load', () => {
  const exercise = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'gym:dumbbell-row'))
  const [saved] = confirmAndAdvanceSet([{ ...createTrainingSet('strength'),
    reps: '8', weightKg: '26', completed: false }], 'strength', '75', null, exercise)
  assert.equal(dumbbellCount(exercise), 1)
  assert.equal(effectiveTrainingWeight(saved, exercise), 26)
  assert.equal(formatTrainingEntry(saved, 'strength', exercise), '8 Wdh. · 26 kg (eine Hantel)')
})

test('bodyweight exercises reuse only repetitions and discard prior extra weight', () => {
  const exercise = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'volleyball:pullup'))
  assert.equal(exercise.loadMode, 'bodyweightOnly')
  const previous = { reps: '12', weightKg: '10', completed: true }
  const draft = suggestedTrainingSet(createTrainingSet('strength'), previous,
    'strength', exercise)
  assert.equal(draft.reps, '12')
  assert.equal(draft.weightKg, '')
  const [saved] = confirmAndAdvanceSet([{ ...draft, completed: false }],
    'strength', '75', previous, exercise)
  assert.equal(saved.reps, '12')
  assert.equal(saved.weightKg, '')
  assert.equal(saved.bodyweightKg, '75')
  assert.equal(formatTrainingEntry(saved, 'strength', exercise),
    '12 Wdh.')
})

test('lunges save the load per dumbbell while squats save the whole barbell', () => {
  const lunge = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'volleyball:lunge'))
  const squat = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'volleyball:squat'))
  const draft = [{ ...createTrainingSet('strength'), reps: '8', weightKg: '20',
    completed: false }]
  const [lungeSet] = confirmAndAdvanceSet(draft, 'strength', '75', null, lunge)
  const [squatSet] = confirmAndAdvanceSet(draft, 'strength', '75', null, squat)
  assert.equal(lungeSet.weightBasis, 'perDumbbell')
  assert.equal(effectiveTrainingWeight(lungeSet, lunge), 40)
  assert.equal(formatTrainingEntry(lungeSet, 'strength', lunge),
    '8 Wdh. · 20 kg je Hantel')
  assert.equal(squatSet.weightBasis, undefined)
  assert.equal(effectiveTrainingWeight(squatSet, squat), 20)
  assert.equal(formatTrainingEntry(squatSet, 'strength', squat), '8 Wdh. · 20 kg')
})

test('timed bodyweight holds reuse only duration and discard prior extra weight', () => {
  const plank = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
    item.id === 'volleyball:plank'))
  const previous = { durationValue: '45', durationUnit: 's', weightKg: '5' }
  const draft = { ...createTrainingSet('duration'), completed: false }
  const suggested = suggestedTrainingSet(draft, previous, 'duration', plank)
  assert.equal(suggested.weightKg, undefined)
  const [saved] = confirmAndAdvanceSet([draft], 'duration', '75', previous, plank)
  assert.equal(saved.durationValue, '45')
  assert.equal(saved.weightKg, '')
  assert.equal(saved.bodyweightKg, '75')
  assert.equal(formatTrainingEntry(saved, 'duration', plank), '45 Sek.')
})

test('typed values override prior values field by field and missing set numbers stay empty', () => {
  const prior = { reps: '8', weightKg: '60' }
  const draft = { ...createTrainingSet('strength'), reps: '10', completed: false }
  const [saved] = confirmAndAdvanceSet([draft], 'strength', '', prior)
  assert.equal(saved.reps, '10')
  assert.equal(saved.weightKg, '60')
  assert.equal(confirmAndAdvanceSet([{ ...createTrainingSet('strength'), completed: false }],
    'strength', '', null), null)
})

test('time and distance suggestions convert into the current set units', () => {
  const prior = { distanceValue: '2.5', distanceUnit: 'km', durationValue: '1.5',
    durationUnit: 'min' }
  const draft = { ...createTrainingSet('distance'), completed: false }
  const suggested = suggestedTrainingSet(draft, prior, 'distance')
  assert.equal(suggested.distanceValue, '2500')
  assert.equal(suggested.durationValue, '90')
  const [saved] = confirmAndAdvanceSet([draft], 'distance', '', prior)
  assert.equal(formatTrainingEntry(saved, 'distance'), '2500 m · 90 Sek.')
})

test('old training categories resolve to the requested new categories without guessing other sports', () => {
  assert.equal(canonicalCategory('Sprungkraft & Explosivität'), 'Sprungkraft und Agilität')
  assert.equal(canonicalCategory('Schnelligkeit & Agilität'), 'Sprungkraft und Agilität')
  assert.equal(canonicalCategory('Core & Stabilität'), 'Core und Mobility')
  assert.equal(canonicalCategory('Mobility'), 'Core und Mobility')
  assert.equal(canonicalCategory('Sport', 'Beachvolleyball'), 'Beach-Training')
  assert.equal(canonicalCategory('Sport', 'Hallenvolleyball'), 'Hallentraining')
  assert.equal(canonicalCategory('Sport', 'Laufen'), 'Sport')
  assert.equal(canonicalCategory('Sport', 'Sonstiger Sport'), 'Sport')
})

test('a drafted set only counts after confirmation and an empty draft never counts', () => {
  const draft = { ...createTrainingSet('strength'), reps: '8', weightKg: '60', completed: false }
  assert.equal(hasMeasuredValue(draft, 'strength'), true)
  assert.equal(isConfirmedSet(draft, 'strength'), false)
  assert.equal(isConfirmedSet({ ...draft, completed: true }, 'strength'), true)
  assert.equal(isConfirmedSet({ ...createTrainingSet('strength'), completed: false }, 'strength'), false)
  assert.equal(isConfirmedSet({ ...createTrainingSet('strength'), reps: '8' }, 'strength'), true)
})

test('confirming a set opens the next and ending an exercise drops only the empty draft', () => {
  const first = { ...createTrainingSet('strength'), reps: '8', weightKg: '60', completed: false }
  const advanced = confirmAndAdvanceSet([first], 'strength')
  assert.equal(advanced.length, 2)
  assert.equal(advanced[0].completed, true)
  assert.equal(advanced[1].completed, false)
  assert.equal(finishTrainingExerciseEntries(advanced, 'strength').length, 1)
  assert.equal(confirmAndAdvanceSet(advanced, 'strength'), null)
  assert.equal(finishTrainingExerciseEntries([
    advanced[0], { ...advanced[1], reps: '6' },
  ], 'strength'), null)
})

test('volleyball plans use available exercises and preserve both categories in a mixed day', () => {
  const available = new Map(DEFAULT_EXERCISES.map((item) => [item.id, item]))
  assert.equal(available.size, DEFAULT_EXERCISES.length)
  assert.equal(STANDARD_PLANS.length, 5)
  assert.equal(FOCUS_PLANS.length, 6)
  assert.equal(isAthleteData({ ...base(), trainingPlans: [...STANDARD_PLANS, ...FOCUS_PLANS,
    ...ADDITIONAL_PLANS,
    ...VOLLEYBALL_PLANS] }), true)
  assert.ok(DEFAULT_EXERCISES.some((item) => item.name === 'Back Extensions'
    && item.muscleGroup === 'Rücken'))
  assert.ok(DEFAULT_EXERCISES.some((item) => item.name === 'Explosive Kniebeugen (Squat Jumps)'
    && item.category === 'Sprungkraft und Agilität'))
  for (const plan of [...STANDARD_PLANS, ...FOCUS_PLANS, ...ADDITIONAL_PLANS,
    ...VOLLEYBALL_PLANS]) {
    assert.ok(plan.exercises.length > 0)
    assert.ok(plan.exercises.every((reference) => reference.category === plan.category
      || plan.categories?.includes(reference.category)))
    for (const reference of plan.exercises) {
      assert.equal(available.get(reference.libraryId)?.category, reference.category)
      assert.ok(reference.target)
    }
  }
  const mixed = VOLLEYBALL_PLANS.find((plan) => plan.categories?.length > 1)
  assert.ok(mixed)
  const exercises = mixed.exercises.map((reference) => ({
    ...createLoggedExercise(available.get(reference.libraryId)), entries: [],
  }))
  assert.equal(isAthleteData({ ...base(), athleteProfile: { bodyweightKg: '75' },
    sessions: [{ id: 'mixed', date: '2026-10-11', category: mixed.category,
      categories: mixed.categories, exercises }] }), true)
})

test('plan search finds names, exercise groups, and exercise names across categories', () => {
  const plans = [...STANDARD_PLANS, ...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
  assert.equal(searchTrainingPlans(plans, '').length, plans.length)
  assert.ok(searchTrainingPlans(plans, 'rücken stärken')
    .some((plan) => plan.id === 'gym:plan-back'))
  assert.ok(searchTrainingPlans(plans, 'Stärkung Rücken')
    .some((plan) => plan.id === 'gym:plan-back'))
  assert.ok(searchTrainingPlans(plans, 'RÜCKEN').some((plan) => plan.id === 'gym:plan-pull'))
  assert.ok(searchTrainingPlans(plans, 'kniebeugen explosiv')
    .some((plan) => plan.id === 'gym:plan-jump-basics'))
  assert.deepEqual(searchTrainingPlans(plans, 'unbekannter begriff'), [])
})

test('every built-in exercise and plan reference has a concrete instruction', () => {
  assert.equal(Object.keys(INSTRUCTIONS).length, DEFAULT_EXERCISES.length)
  for (const exercise of DEFAULT_EXERCISES) {
    assert.ok(instructionForExercise(exercise)?.length > 35, exercise.id)
    assert.equal(instructionForExercise({ libraryId: exercise.id, name: exercise.name }),
      INSTRUCTIONS[exercise.id])
  }
  for (const plan of [...STANDARD_PLANS, ...FOCUS_PLANS, ...ADDITIONAL_PLANS,
    ...VOLLEYBALL_PLANS]) {
    for (const item of plan.exercises) assert.ok(instructionForExercise(item), item.libraryId)
  }
  assert.match(INSTRUCTIONS['volleyball:rdl'], /Hüfte/)
  assert.match(INSTRUCTIONS['gym:cat-cow'], /Vierfüßlerstand/)
  assert.match(INSTRUCTIONS['gym:thoracic-rotation'], /Matte/)
  assert.equal(instructionForExercise({ id: 'personal:one', name: 'Eigene Übung',
    category: 'Krafttraining' }), undefined)
})

test('additional plans cover non-strength categories and record interval work per set', () => {
  assert.equal(ADDITIONAL_PLANS.length, 13)
  assert.deepEqual([...new Set(ADDITIONAL_PLANS.map((plan) => plan.category))].sort(),
    ['Ausdauer', 'Core und Mobility', 'Sprungkraft und Agilität'])
  assert.equal(new Set(ADDITIONAL_PLANS.map((plan) => plan.id)).size, 13)
  assert.ok(ADDITIONAL_PLANS.every((plan) => plan.evidence?.url.startsWith('https://')))
  const intervals = ADDITIONAL_PLANS.filter((plan) => /interval-(beginner|intermediate|advanced)/.test(plan.id))
  assert.equal(intervals.length, 6)
  assert.equal(new Set(intervals.map((plan) => plan.exercises[0].libraryId)).size, 6)
  for (const plan of intervals) {
    assert.equal(plan.exercises.length, 1)
    assert.match(plan.description, /6–8 Wochen/)
    assert.equal(plan.weeklyEvidence.url, 'https://pubmed.ncbi.nlm.nih.gov/38717713/')
    const exercise = createLoggedExercise(DEFAULT_EXERCISES.find((item) =>
      item.id === plan.exercises[0].libraryId))
    assert.equal(exercise.type, 'distance')
    assert.ok(exercise.intervalWorkMinutes > 0)
    const set = { ...createTrainingSet('distance'), durationValue: '50', distanceValue: '200' }
    assert.equal(hasRequiredIntervalDuration(exercise, set), true)
    assert.equal(hasRequiredIntervalDuration(exercise, { ...set, durationValue: '' }), false)
    assert.equal(formatTrainingEntry(set, 'distance'), '200 m · 50 Sek.')
    const firstInterval = { ...createTrainingSet('distance', 'min'), durationValue: '0.8',
      completed: false }
    const nextInterval = confirmAndAdvanceSet([firstInterval], 'distance')
    assert.equal(nextInterval[0].durationUnit, 'min')
    assert.equal(nextInterval[1].durationUnit, 'min')
    assert.equal(isAthleteData({ ...base(), sessions: [{ id: 'interval',
      date: '2026-10-11', category: 'Ausdauer', exercises: [{ ...exercise,
        entries: [{ ...set, completed: true }] }] }] }), true)
  }
  for (const plan of [...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
    .filter((item) => item.category === 'Ausdauer')) {
    assert.ok(plan.guidedEndurance, plan.id)
    assert.equal(plan.exercises.length, 1, plan.id)
  }
})

test('loaded carries can store distance, time, and weight in one set', () => {
  const set = { ...createTrainingSet('carry'), distanceValue: '40', durationValue: '32',
    weightKg: '24' }
  assert.equal(hasMeasuredValue(set, 'carry'), true)
  assert.equal(formatTrainingEntry(set, 'carry'), '40 m · 32 Sek. · 24 kg')
})

test('squats save only the entered external load while preserving body mass for ratings', () => {
  assert.equal(enrichExercise({ name: 'Kniebeugen', category: 'Krafttraining',
    type: 'strength' }).loadMode, undefined)
  const draft = { ...createTrainingSet('strength'), reps: '8', weightKg: '30', completed: false }
  const [confirmed, next] = confirmAndAdvanceSet([draft], 'strength', '75')
  assert.equal(confirmed.bodyweightKg, '75')
  assert.equal(confirmed.weightKg, '30')
  assert.equal(next.bodyweightKg, undefined)
  assert.equal(formatTrainingEntry(confirmed, 'strength',
    { libraryId: 'volleyball:squat', loadMode: 'bodyweight' }), '8 Wdh. · 30 kg')
})

test('older cloud records with no profile retain the same normalized hash', () => {
  assert.equal(dataHash(base()), dataHash({ ...base(), athleteProfile: { bodyweightKg: '' } }))
  assert.equal(isAthleteData({ ...base(), athleteProfile: { bodyweightKg: '-1' } }), false)
})
