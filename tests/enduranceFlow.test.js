import test from 'node:test'
import assert from 'node:assert/strict'
import { ADDITIONAL_PLANS, FOCUS_PLANS } from '../src/volleyballTraining.js'
import { guidedEnduranceSpec, guidedMainReference, mainDurationSeconds, mainPhaseAt,
  canConfirmMain, confirmGuidedMain, tracksDeviceDistance, hasWarmupReading,
  deviceDistanceMeters } from '../src/enduranceFlow.js'
import { createLoggedExercise } from '../src/trainingModel.js'
import { isAthleteData } from '../src/syncPolicy.js'

const guidedPlans = [...FOCUS_PLANS, ...ADDITIONAL_PLANS].filter((plan) => plan.guidedEndurance)

test('guided endurance plans have a valid main exercise and a fixed protocol', () => {
  assert.equal(guidedPlans.length, 9)
  for (const plan of guidedPlans) {
    const spec = guidedEnduranceSpec(plan)
    assert.ok(spec, plan.id)
    assert.equal(plan.exercises.length, 1)
    assert.equal(guidedMainReference(plan).libraryId, spec.mainLibraryId)
    assert.ok(mainDurationSeconds(spec) > 0)
    assert.ok(spec.intensity?.warmup)
    assert.ok(spec.intensity?.work)
    assert.ok(spec.intensity?.cooldown)
    if (spec.kind === 'interval') assert.ok(spec.intensity.recovery)
  }
  assert.equal(guidedEnduranceSpec({ ...guidedPlans[0], exercises: [] }), null)
  const legacy = guidedPlans[0]
  assert.ok(guidedEnduranceSpec({ ...legacy, exercises: [
    { libraryId: 'old:warmup' }, legacy.exercises[0], { libraryId: 'old:cooldown' },
  ] }))
})

test('interval phases switch at their exact boundaries and omit the last recovery', () => {
  const spec = guidedPlans.find((plan) => plan.id === 'gym:plan-treadmill-interval-beginner').guidedEndurance
  assert.equal(mainDurationSeconds(spec), 960)
  assert.deepEqual(mainPhaseAt(spec, 0), {
    kind: 'work', remaining: 60, elapsed: 0, total: 960, interval: 1,
  })
  assert.equal(mainPhaseAt(spec, 59).kind, 'work')
  assert.deepEqual(mainPhaseAt(spec, 60), {
    kind: 'recovery', remaining: 120, elapsed: 60, total: 960, interval: 1,
  })
  assert.deepEqual(mainPhaseAt(spec, 180), {
    kind: 'work', remaining: 60, elapsed: 180, total: 960, interval: 2,
  })
  assert.equal(mainPhaseAt(spec, 959).kind, 'work')
  assert.equal(mainPhaseAt(spec, 960).kind, 'done')
})

test('device readings isolate the main distance from warmup and cooldown', () => {
  const spec = guidedPlans.find((plan) => plan.id === 'gym:plan-treadmill-interval-beginner').guidedEndurance
  assert.equal(tracksDeviceDistance(spec), true)
  assert.equal(tracksDeviceDistance(guidedPlans.find((plan) =>
    plan.id === 'gym:plan-endurance-base').guidedEndurance), false)
  const flow = { spec, phase: 'main', distanceTracking: true, deviceUnit: 'km',
    warmupDeviceReading: '0,75', mainDeviceReading: '2,125', mainConfirmed: false,
    clock: { startedAt: 0, elapsedMs: 0, running: true } }
  assert.equal(hasWarmupReading(flow), true)
  assert.equal(deviceDistanceMeters(flow), 1375)
  assert.equal(deviceDistanceMeters({ ...flow, mainDeviceReading: '0,5' }), null)
  assert.equal(deviceDistanceMeters({ ...flow, mainDeviceReading: '' }), null)
  assert.equal(deviceDistanceMeters({ ...flow, mainDeviceReading: '2,1234' }), null)
  assert.equal(deviceDistanceMeters({ ...flow, deviceUnit: 'm',
    warmupDeviceReading: '750', mainDeviceReading: '2125' }), 1375)
  const main = createLoggedExercise({ ...guidedPlans.find((plan) =>
    plan.id === 'gym:plan-treadmill-interval-beginner').exercises[0], id: spec.mainLibraryId })
  const session = { id: 'reading', date: '2026-10-12', category: 'Ausdauer',
    exercises: [{ ...main, guidedEndurance: true, entries: [] }], enduranceFlow: flow }
  const finish = mainDurationSeconds(spec) * 1000
  const missing = { ...session, enduranceFlow: { ...flow, mainDeviceReading: '' } }
  assert.equal(confirmGuidedMain(missing, finish, 'missing'), missing)
  const confirmed = confirmGuidedMain(session, finish, 'distance')
  const entry = confirmed.exercises[0].entries[0]
  assert.equal(entry.distanceValue, '1.375')
  assert.equal(entry.deviceStartReading, '0,75')
  assert.equal(entry.deviceEndReading, '2,125')
  assert.equal(isAthleteData({ sessions: [confirmed], exerciseLibrary: [], volleyballDays: [] }), true)
})

test('the full main workout is recorded once, only after time and user confirmation', () => {
  const plan = guidedPlans.find((item) => item.id === 'gym:plan-bike-interval-intermediate')
  const spec = guidedEnduranceSpec(plan)
  const main = createLoggedExercise({ ...plan.exercises[0], id: spec.mainLibraryId })
  const start = 100000
  const session = { id: 'guided', date: '2026-10-11', category: 'Ausdauer',
    planId: plan.id, planName: plan.name, status: 'ongoing',
    exercises: [{ ...main, guidedEndurance: true, entries: [] }],
    enduranceFlow: { spec, phase: 'main', mainConfirmed: false,
      clock: { startedAt: start, elapsedMs: 0, running: true } } }
  const finish = start + mainDurationSeconds(spec) * 1000
  assert.equal(canConfirmMain(session.enduranceFlow, finish - 1), false)
  assert.equal(canConfirmMain({ ...session.enduranceFlow, phase: 'ready' }, finish), false)
  assert.equal(canConfirmMain({ ...session.enduranceFlow,
    clock: { startedAt: start, elapsedMs: 30000, running: false } }, finish), false)
  assert.equal(confirmGuidedMain(session, finish - 1, 'result'), session)
  const confirmed = confirmGuidedMain(session, finish, 'result')
  assert.equal(confirmed.enduranceFlow.phase, 'cooldown')
  assert.equal(confirmed.enduranceFlow.mainConfirmed, true)
  assert.equal(confirmed.exercises.length, 1)
  assert.equal(confirmed.exercises[0].entries.length, 1)
  assert.equal(confirmed.exercises[0].entries[0].guidedCompletion, true)
  assert.equal(confirmed.exercises[0].entries[0].completedIntervals, spec.repeat)
  assert.equal(confirmed.exercises[0].entries[0].durationValue,
    String(mainDurationSeconds(spec)))
  assert.equal(confirmGuidedMain(confirmed, finish + 1000, 'duplicate'), confirmed)
  assert.equal(isAthleteData({ sessions: [confirmed], exerciseLibrary: [],
    volleyballDays: [] }), true)
  assert.equal(isAthleteData({ sessions: [{ ...confirmed, status: 'completed',
    enduranceFlow: { ...confirmed.enduranceFlow, phase: 'summary', clock: null } }],
  exerciseLibrary: [], volleyballDays: [] }), true)
})

test('steady endurance also completes as one main workout without warmup or cooldown entries', () => {
  const plan = guidedPlans.find((item) => item.id === 'gym:plan-treadmill-base')
  const spec = guidedEnduranceSpec(plan)
  assert.equal(mainPhaseAt(spec, 100).remaining, 1400)
  assert.equal(mainPhaseAt(spec, 1500).kind, 'done')
  const exercise = createLoggedExercise({ ...plan.exercises[0], id: spec.mainLibraryId })
  const session = { id: 'steady', date: '2026-10-11', category: 'Ausdauer',
    exercises: [exercise], enduranceFlow: { spec, phase: 'main', mainConfirmed: false,
      clock: { startedAt: 0, elapsedMs: 0, running: true } } }
  const result = confirmGuidedMain(session, 1500000, 'main-result')
  assert.equal(result.exercises.length, 1)
  assert.equal(result.exercises[0].entries.length, 1)
  assert.equal(result.exercises[0].entries[0].durationValue, '1500')
})
