import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createLoggedExercise, createTrainingSet, exerciseIdentity, hasLegacyValues,
  previousExercise, formatTrainingEntry,
} from '../src/trainingModel.js'
import { chooseInitialSync, dataHash, isAthleteData } from '../src/syncPolicy.js'

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
