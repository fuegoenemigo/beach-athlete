import assert from 'node:assert/strict'
import test from 'node:test'
import { trainingProgress } from '../src/trainingProgress.js'
import { trainingDayPerformances } from '../src/calendarPerformance.js'

const strength = (id, group, weight) => ({ libraryId: id, name: id,
  category: 'Krafttraining', muscleGroup: group, type: 'strength',
  entries: [{ completed: true, reps: '8', weightKg: String(weight) }] })
const jump = (height) => ({ libraryId: 'jump', name: 'Sprung',
  category: 'Sprungkraft und Agilität', type: 'jump',
  entries: [{ completed: true, heightCm: String(height) }] })
const core = (duration) => ({ libraryId: 'plank', name: 'Plank',
  category: 'Core und Mobility', muscleGroup: 'Core', type: 'duration',
  entries: [{ completed: true, durationValue: String(duration), durationUnit: 's' }] })
const mobility = (duration) => ({ libraryId: 'stretch', name: 'Dehnung',
  category: 'Core und Mobility', muscleGroup: 'Mobility', type: 'duration',
  entries: [{ completed: true, durationValue: String(duration), durationUnit: 's' }] })
const session = (id, date, exercises) => ({ id, date, category: 'Krafttraining',
  status: 'completed', exercises })

test('training progress weights exercise IDs within groups, then groups and categories equally', () => {
  const sessions = [
    session('before', '2026-10-01', [strength('bench', 'Brust', 50),
      strength('fly', 'Brust', 10), strength('squat', 'Beine', 50), jump(50), core(60)]),
    session('after', '2026-10-10', [strength('bench', 'Brust', 60),
      strength('fly', 'Brust', 12), strength('squat', 'Beine', 45), jump(55), core(60)]),
  ]
  const progress = trainingProgress(sessions)
  const strengthCategory = progress.categories[0]
  assert.equal(strengthCategory.exercises.length, 3)
  assert.ok(Math.abs(strengthCategory.groups.find((group) => group.name === 'Brust').changePercent - 20) < 0.001)
  assert.ok(Math.abs(strengthCategory.groups.find((group) => group.name === 'Beine').changePercent + 10) < 0.001)
  assert.ok(Math.abs(strengthCategory.changePercent - 5) < 0.001)
  assert.equal(strengthCategory.status, 'improved')
  assert.equal(strengthCategory.series[0].value, 100)
  assert.ok(Math.abs(strengthCategory.series[1].value - 105) < 0.001)
  assert.ok(Math.abs(progress.overall.changePercent - 5) < 0.001)
  assert.ok(Math.abs(progress.overall.series[1].value - 105) < 0.001)
  assert.ok(Math.abs(trainingDayPerformances(sessions).get('2026-10-10').changePercent - 5) < 0.001)
})

test('mobility duration is not scored as performance and unmeasured categories stay unrated', () => {
  const sessions = [
    session('before', '2026-10-01', [mobility(30)]),
    session('after', '2026-10-10', [mobility(90)]),
  ]
  const progress = trainingProgress(sessions)
  assert.equal(progress.overall.status, 'unrated')
  assert.equal(progress.categories.find((category) => category.name === 'Core und Mobility').series.length, 0)
})

test('training indexes compound comparable changes over time without recording missing days', () => {
  const sessions = [
    session('first', '2026-10-01', [strength('bench', 'Brust', 50)]),
    session('second', '2026-10-10', [strength('bench', 'Brust', 55)]),
    session('unrelated', '2026-10-11', [strength('row', 'Rücken', 40)]),
    session('third', '2026-10-12', [strength('bench', 'Brust', 60.5)]),
  ]
  const progress = trainingProgress(sessions)
  assert.deepEqual(progress.overall.series.map((point) => point.date),
    ['2026-10-01', '2026-10-10', '2026-10-12'])
  assert.ok(Math.abs(progress.overall.series.at(-1).value - 121) < 0.001)
  assert.equal(progress.categories[0].groups[0].exercises.length, 1)
})
