import test from 'node:test'
import assert from 'node:assert/strict'
import { bestMetric, calendarChangeStatus,
  trainingDayPerformances } from '../src/calendarPerformance.js'

const strength = (id, kg) => ({ libraryId: id, name: 'Bankdrücken', category: 'Krafttraining',
  type: 'strength', entries: [{ completed: true, reps: '8', weightKg: String(kg) }] })
const core = (seconds) => ({ libraryId: 'plank', name: 'Plank', category: 'Core und Mobility',
  muscleGroup: 'Core', type: 'duration', entries: [{ completed: true, durationValue: String(seconds), durationUnit: 's' }] })
const session = (id, date, exercises, status = 'completed') =>
  ({ id, date, status, exercises, createdAt: `${date}T12:00:00Z` })

test('old regeneration records do not create a training performance', () => {
  const oldRecovery = { ...session('recovery', '2026-10-10', [strength('bench', 50)]), category: 'Regeneration' }
  const scores = trainingDayPerformances([oldRecovery, session('training', '2026-10-11', [strength('bench', 55)])])
  assert.equal(scores.has('2026-10-10'), false)
  assert.equal(scores.get('2026-10-11').status, 'unrated')
})

test('attendance-only volleyball training marks activity without a performance score', () => {
  const sport = { ...session('beach', '2026-10-10', []), category: 'Beach-Training',
    attendanceOnly: true }
  assert.equal(trainingDayPerformances([sport]).has('2026-10-10'), false)
})

test('calendar compares the same exercise ID to its last older date without a time limit', () => {
  const sessions = [
    session('old', '2025-01-01', [strength('bench', 50), strength('other-bench', 90), core(60)]),
    session('now', '2026-10-11', [strength('bench', 55), core(66)]),
  ]
  const scores = trainingDayPerformances(sessions)
  assert.equal(scores.get('2025-01-01').status, 'unrated')
  assert.equal(scores.get('2026-10-11').status, 'improved')
  assert.equal(scores.get('2026-10-11').comparisons.length, 2)
  assert.ok(Math.abs(scores.get('2026-10-11').changePercent - 10) < 0.001)
})

test('a new dumbbell pair uses both weights without comparing against ambiguous old entries', () => {
  const dumbbells = (weight, basis) => ({ libraryId: 'gym:dumbbell-bench',
    name: 'Kurzhantel-Bankdrücken', category: 'Krafttraining', type: 'strength',
    entries: [{ completed: true, reps: '8', weightKg: String(weight),
      ...(basis ? { weightBasis: basis } : {}) }] })
  assert.equal(bestMetric(dumbbells(26, 'perDumbbell')).value, 52 * (1 + 8 / 30))
  const scores = trainingDayPerformances([
    session('legacy', '2026-10-10', [dumbbells(40)]),
    session('new', '2026-10-11', [dumbbells(26, 'perDumbbell')]),
    session('newer', '2026-10-12', [dumbbells(28, 'perDumbbell')]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'unrated')
  assert.equal(scores.get('2026-10-12').status, 'improved')
})

test('added weight improves a bodyweight exercise without breaking its rep history', () => {
  const pullup = (reps, extra) => ({ libraryId: 'volleyball:pullup',
    name: 'Klimmzüge', category: 'Krafttraining', type: 'strength',
    loadMode: 'bodyweight', entries: [{ completed: true, reps: String(reps),
      weightKg: String(extra), bodyweightKg: '75' }] })
  assert.equal(bestMetric(pullup(8, 0)).value, 8)
  assert.ok(bestMetric(pullup(8, 10)).value > 8)
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [pullup(8, 0)]),
    session('new', '2026-10-11', [pullup(8, 10)]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'improved')
})

test('an eight percent improvement uses the moderate calendar graph', () => {
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [strength('bench', 50)]),
    session('new', '2026-10-11', [strength('bench', 54)]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'improved')
})

test('calendar uses five stages with five and fifteen percent boundaries', () => {
  assert.equal(calendarChangeStatus(null), 'unrated')
  assert.equal(calendarChangeStatus(-15), 'strong-decline')
  assert.equal(calendarChangeStatus(-14.9), 'decline')
  assert.equal(calendarChangeStatus(-5), 'unchanged')
  assert.equal(calendarChangeStatus(5), 'unchanged')
  assert.equal(calendarChangeStatus(5.1), 'improved')
  assert.equal(calendarChangeStatus(15), 'strong-improved')
})

test('a day averages only comparable IDs and ignores an open training', () => {
  const sessions = [
    session('old', '2026-10-10', [strength('bench', 50), core(60)]),
    session('now', '2026-10-11', [strength('bench', 55), core(54), strength('new-exercise', 20)]),
    session('open', '2026-10-12', [strength('bench', 100)], 'ongoing'),
  ]
  const scores = trainingDayPerformances(sessions)
  assert.equal(scores.get('2026-10-11').status, 'unchanged')
  assert.equal(scores.get('2026-10-11').total, 3)
  assert.equal(scores.get('2026-10-11').comparisons.length, 2)
  assert.equal(scores.has('2026-10-12'), false)
})

test('calendar gives each comparable exercise ID equal weight across muscle groups and categories', () => {
  const withGroup = (id, group, weight) => ({ ...strength(id, weight), muscleGroup: group })
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [withGroup('bench', 'Brust', 50),
      withGroup('fly', 'Brust', 50), withGroup('squat', 'Beine', 50), core(60)]),
    session('new', '2026-10-11', [withGroup('bench', 'Brust', 60),
      withGroup('fly', 'Brust', 60), withGroup('squat', 'Beine', 40), core(54)]),
  ])
  const day = scores.get('2026-10-11')
  assert.equal(day.comparisons.length, 4)
  assert.ok(Math.abs(day.changePercent - 2.5) < 0.001)
  assert.equal(day.status, 'unchanged')
  assert.ok(Math.abs(day.groupedChangePercent + 5) < 0.001)
})

test('a different exercise ID never counts as the same exercise even with the same name', () => {
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [strength('bench-a', 50)]),
    session('new', '2026-10-11', [strength('bench-b', 55)]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'unrated')
})

test('an exercise without a comparable performance metric is counted but not scored', () => {
  const mobility = { libraryId: 'mobility', name: 'Mobilität', category: 'Core und Mobility',
    muscleGroup: 'Ganzkörper', type: 'duration', entries: [{ completed: true, durationValue: '60', durationUnit: 's' }] }
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [strength('bench', 50), mobility]),
    session('new', '2026-10-11', [strength('bench', 55), mobility]),
  ])
  assert.equal(scores.get('2026-10-11').total, 2)
  assert.equal(scores.get('2026-10-11').comparisons.length, 1)
})

test('longer warm-ups and cooldowns do not change the calendar performance', () => {
  const support = (duration) => ({ libraryId: 'gym:treadmill-warmup',
    name: 'Laufband · Aufwärmen', category: 'Ausdauer', type: 'duration',
    performanceRole: 'support', entries: [{ completed: true,
      durationValue: String(duration), durationUnit: 'min' }] })
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [support(10), strength('bench', 50)]),
    session('new', '2026-10-11', [support(15), strength('bench', 50)]),
  ])
  assert.equal(scores.get('2026-10-11').total, 1)
  assert.equal(scores.get('2026-10-11').status, 'unchanged')
})

test('two sessions on the same day use the last logged value and compare with an earlier day', () => {
  const morning = session('morning', '2026-10-11', [strength('bench', 52)])
  const evening = session('evening', '2026-10-11', [strength('bench', 55)])
  morning.createdAt = '2026-10-11T09:00:00Z'
  evening.createdAt = '2026-10-11T19:00:00Z'
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [strength('bench', 50)]), evening, morning,
  ])
  assert.equal(scores.get('2026-10-11').comparisons.length, 1)
  assert.ok(Math.abs(scores.get('2026-10-11').changePercent - 10) < 0.001)
})

test('endurance pace is comparable only at the same distance', () => {
  const run = (distance, time) => ({ libraryId: 'run', name: 'Laufen', category: 'Ausdauer',
    type: 'distance', entries: [{ completed: true, distanceValue: String(distance), distanceUnit: 'm',
      durationValue: String(time), durationUnit: 's' }] })
  const scores = trainingDayPerformances([
    session('first', '2026-10-10', [run(1000, 300)]),
    session('other-distance', '2026-10-11', [run(2000, 550)]),
    session('same-distance', '2026-10-12', [run(2000, 500)]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'unrated')
  assert.equal(scores.get('2026-10-12').status, 'improved')
})

test('guided endurance compares distance at the same fixed protocol and duration', () => {
  const guided = (distance, protocol = 'gym:plan-treadmill-base') => ({
    libraryId: 'gym:treadmill', name: 'Laufband', category: 'Ausdauer', type: 'distance',
    guidedEndurance: true, guidedProtocolId: protocol,
    entries: [{ completed: true, guidedCompletion: true, durationValue: '1500',
      durationUnit: 's', distanceValue: distance, distanceUnit: 'km' }],
  })
  const scores = trainingDayPerformances([
    session('old', '2026-10-10', [guided('3')]),
    session('better', '2026-10-11', [guided('3.3')]),
    session('other-plan', '2026-10-12', [guided('3.5', 'another-plan')]),
  ])
  assert.equal(scores.get('2026-10-11').status, 'improved')
  assert.equal(scores.get('2026-10-11').changePercent, 10)
  assert.equal(scores.get('2026-10-12').status, 'unrated')
})

test('guided sprint series compares average sprint time of the same full protocol', () => {
  const sprint = (averageSprintSeconds) => ({
    libraryId: 'volleyball:repeat-sprint', name: 'Wiederholter 30-m-Sprint',
    category: 'Ausdauer', type: 'distance', guidedEndurance: true,
    guidedProtocolId: 'volleyball:plan-endurance',
    entries: [{ completed: true, guidedCompletion: true, prescribedSprints: 12,
      completedSprints: 12, averageSprintSeconds, distanceValue: '360',
      distanceUnit: 'm', durationValue: '900', durationUnit: 's' }],
  })
  const scores = trainingDayPerformances([
    session('old-sprints', '2026-10-10', [sprint(6.2)]),
    session('fast-sprints', '2026-10-12', [sprint(5.9)]),
  ])
  assert.equal(scores.get('2026-10-12').status, 'improved')
})
