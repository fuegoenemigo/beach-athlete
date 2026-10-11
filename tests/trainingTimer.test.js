import test from 'node:test'
import assert from 'node:assert/strict'
import { prescribedSeconds, elapsedSeconds, intervalPosition, formatTimer } from '../src/trainingTimer.js'
import { ADDITIONAL_PLANS } from '../src/volleyballTraining.js'
import { createLoggedExercise } from '../src/trainingModel.js'

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

test('interval boundaries count only finished work phases, including after a long pause', () => {
  assert.deepEqual(intervalPosition(60, 3, 60, 120),
    { phase: 'rest', index: 0, remaining: 120, completed: 1, partial: 0 })
  assert.deepEqual(intervalPosition(180, 3, 60, 120),
    { phase: 'work', index: 1, remaining: 60, completed: 1, partial: 0 })
  assert.deepEqual(intervalPosition(240, 3, 60, 120),
    { phase: 'rest', index: 1, remaining: 120, completed: 2, partial: 0 })
  assert.deepEqual(intervalPosition(390, 3, 60, 120),
    { phase: 'work', index: 2, remaining: 30, completed: 2, partial: 30 })
  assert.equal(intervalPosition(420, 3, 60, 120).phase, 'done')
})

test('interval plans carry their work and rest prescription into logged exercises', () => {
  const plan = ADDITIONAL_PLANS.find((item) => item.id === 'gym:plan-treadmill-interval-beginner')
  const reference = plan.exercises[1]
  const logged = createLoggedExercise(reference)
  assert.equal(logged.targetDurationSeconds, 60)
  assert.equal(logged.intervalCount, 6)
  assert.equal(logged.intervalRestSeconds, 120)
})
