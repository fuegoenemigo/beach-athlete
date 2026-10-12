import test from 'node:test'
import assert from 'node:assert/strict'
import { prescribedSeconds, elapsedSeconds, timerStorageKey, formatTimer } from '../src/trainingTimer.js'
import { ADDITIONAL_PLANS } from '../src/volleyballTraining.js'
import { createLoggedExercise, createTrainingSet, isConfirmedSet,
  confirmAndAdvanceSet } from '../src/trainingModel.js'

test('timed exercises use a plan target and free exercises remain stopwatches', () => {
  assert.equal(prescribedSeconds({ target: '2 × 30–45 s je Seite' }), 30)
  assert.equal(prescribedSeconds({ target: '20–30 Min. locker laufen' }), 1200)
  assert.equal(prescribedSeconds({ target: '3 × 8 Wiederholungen' }), 0)
  assert.equal(prescribedSeconds({ name: 'L-Sit' }), 0)
  assert.equal(formatTimer(61), '01:01')
})

test('a paused timer stops accumulating time and resumes from the saved elapsed value', () => {
  assert.equal(elapsedSeconds({ startedAt: 1000, elapsedMs: 0, running: true }, 6500), 5.5)
  assert.equal(elapsedSeconds({ startedAt: 1000, elapsedMs: 5500, running: false }, 20000), 5.5)
  assert.equal(elapsedSeconds({ startedAt: 20000, elapsedMs: 5500, running: true }, 21500), 7)
})

test('each set has its own timer and measured time still needs confirmation', () => {
  assert.notEqual(timerStorageKey('day', 'plank', 'set-1'),
    timerStorageKey('day', 'plank', 'set-2'))
  const first = { ...createTrainingSet('duration'), durationValue: '35', durationUnit: 's',
    completed: false }
  assert.equal(isConfirmedSet(first, 'duration'), false)
  const advanced = confirmAndAdvanceSet([first], 'duration')
  assert.equal(advanced[0].durationValue, '35')
  assert.equal(isConfirmedSet(advanced[0], 'duration'), true)
  assert.equal(advanced[1].durationValue, '')
  assert.equal(formatTimer(35.9), '00:35')
})

test('interval plans carry their work and rest prescription into logged exercises', () => {
  const plan = ADDITIONAL_PLANS.find((item) => item.id === 'gym:plan-treadmill-interval-beginner')
  const reference = plan.exercises[0]
  const logged = createLoggedExercise(reference)
  assert.equal(logged.targetDurationSeconds, 60)
  assert.equal(logged.intervalCount, 6)
  assert.equal(logged.intervalRestSeconds, 120)
})
