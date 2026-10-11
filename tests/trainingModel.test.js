import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createLoggedExercise, createTrainingSet, exerciseIdentity, hasLegacyValues,
  previousExercise, formatTrainingEntry, canonicalCategory,
  hasMeasuredValue, isConfirmedSet, confirmAndAdvanceSet,
  finishTrainingExerciseEntries,
} from '../src/trainingModel.js'
import { chooseInitialSync, dataHash, isAthleteData } from '../src/syncPolicy.js'
import { DEFAULT_EXERCISES, VOLLEYBALL_PLANS, enrichExercise } from '../src/volleyballTraining.js'

const library = [{ name: 'Bankdrücken', category: 'Krafttraining',
  muscleGroup: 'Brust', type: 'strength' }]
const base = () => ({ sessions: [], exerciseLibrary: structuredClone(library),
  volleyballDays: [], trainingPlans: [] })

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
  for (const plan of VOLLEYBALL_PLANS) {
    assert.ok(plan.exercises.length > 0)
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

test('bodyweight and additional load stay separate in a confirmed set', () => {
  assert.equal(enrichExercise({ name: 'Kniebeugen', category: 'Krafttraining',
    type: 'strength' }).loadMode, 'bodyweight')
  const draft = { ...createTrainingSet('strength'), reps: '8', weightKg: '30', completed: false }
  const [confirmed, next] = confirmAndAdvanceSet([draft], 'strength', '75')
  assert.equal(confirmed.bodyweightKg, '75')
  assert.equal(confirmed.weightKg, '30')
  assert.equal(next.bodyweightKg, undefined)
  assert.equal(formatTrainingEntry(confirmed, 'strength', { loadMode: 'bodyweight' }),
    '8 Wdh. · Eigengewicht 75 kg + 30 kg zusätzlich')
})

test('older cloud records with no profile retain the same normalized hash', () => {
  assert.equal(dataHash(base()), dataHash({ ...base(), athleteProfile: { bodyweightKg: '' } }))
  assert.equal(isAthleteData({ ...base(), athleteProfile: { bodyweightKg: '-1' } }), false)
})
