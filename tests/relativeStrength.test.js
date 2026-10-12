import assert from 'node:assert/strict'
import test from 'node:test'
import { relativeStrengthByExercise } from '../src/relativeStrength.js'

const set = (id, weightKg, reps, bodyweightKg) => ({ id, weightKg, reps,
  ...(bodyweightKg ? { bodyweightKg } : {}), completed: true })
const exercise = (id, entries, loadMode) => ({ id, libraryId: id,
  name: id, category: 'Krafttraining', type: 'strength', entries,
  ...(loadMode ? { loadMode } : {}) })
const session = (id, date, exercises) => ({ id, date, category: 'Krafttraining',
  status: 'completed', exercises })

test('relative strength uses the best comparable set and the weight saved with it', () => {
  const sessions = [
    session('old', '2026-10-01', [exercise('volleyball:bench', [set('a', 60, 5, 75)])]),
    session('new', '2026-10-10', [exercise('volleyball:bench', [
      set('b', 70, 5, 80), set('c', 50, 12, 80), set('d', 75, 1, 80),
    ])]),
  ]
  const [result] = relativeStrengthByExercise(sessions, { bodyweightKg: '90' })
  assert.equal(result.libraryId, 'volleyball:bench')
  assert.equal(result.bodyweightKg, 80)
  assert.equal(result.usesCurrentBodyweight, false)
  assert.equal(result.estimateKg, 70 * (1 + 5 / 30))
  assert.equal(result.ratio, (70 * (1 + 5 / 30)) / 80)
  assert.equal(result.previousRatio, 70 / 75)
})

test('bodyweight moves are not treated as full-load lifts; old sets use profile weight', () => {
  const sessions = [session('training', '2026-10-10', [
    exercise('volleyball:pullup', [set('pullup', 10, 5)], 'bodyweight'),
    exercise('volleyball:squat', [set('squat', 40, 5)], 'bodyweight'),
    exercise('volleyball:bench', [set('bench', 60, 5)]),
  ])]
  const results = relativeStrengthByExercise(sessions, { bodyweightKg: '80' })
  assert.deepEqual(results.map((item) => item.libraryId), ['volleyball:bench', 'volleyball:squat'])
  assert.ok(results.every((item) => item.usesCurrentBodyweight))
  assert.equal(relativeStrengthByExercise(sessions, { bodyweightKg: '' }).length, 0)
})

test('unfinished trainings do not contribute relative strength', () => {
  const sessions = [session('saved', '2026-10-01', [exercise('volleyball:bench', [set('a', 60, 5, 75)])]),
    { ...session('open', '2026-10-10', [exercise('volleyball:bench', [set('b', 90, 5, 75)])]),
      status: 'ongoing' }]
  assert.equal(relativeStrengthByExercise(sessions, { bodyweightKg: 75 })[0].date, '2026-10-01')
})

test('dumbbell pair strength counts both weights and separates earlier ambiguous records', () => {
  const old = set('old', 40, 8, 75)
  const current = { ...set('new', 26, 8, 75), weightBasis: 'perDumbbell' }
  const sessions = [
    session('old', '2026-10-01', [exercise('gym:dumbbell-bench', [old])]),
    session('new', '2026-10-10', [exercise('gym:dumbbell-bench', [current])]),
  ]
  const [result] = relativeStrengthByExercise(sessions, { bodyweightKg: '75' })
  assert.equal(result.estimateKg, 52 * (1 + 8 / 30))
  assert.equal(result.previousRatio, null)
})
