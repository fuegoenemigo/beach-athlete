import test from 'node:test'
import assert from 'node:assert/strict'
import { enduranceProgress } from '../src/enduranceProgress.js'

const planId = 'gym:plan-treadmill-interval-beginner'
function session(id, date, meters, intensity, sameSetup = false) {
  return { id, date, planId, status: 'completed', intensity,
    enduranceFlow: { spec: { kind: 'interval' }, distanceTracking: true, sameSetup },
    exercises: [{ entries: [{ id: `result-${id}`, guidedCompletion: true,
      distanceValue: String(meters / 1000), distanceUnit: 'km' }] }] }
}

test('distance comparison requires the same plan and confirmed device setup', () => {
  const first = session('first', '2026-10-01', 1800, 6)
  const current = session('current', '2026-10-12', 1900, 6)
  assert.equal(enduranceProgress(first, [first]).previousCount, 0)
  assert.equal(enduranceProgress(current, [first, current]).changePercent, undefined)
  assert.equal(enduranceProgress({ ...current, enduranceFlow: {
    ...current.enduranceFlow, sameSetup: true } }, [first, current]).changePercent, 5.6)
  assert.equal(enduranceProgress(current, [{ ...first, planId: 'other' }, current]).previousCount, 0)
})

test('higher level is suggested only after three comparable controlled completions', () => {
  const first = session('first', '2026-10-01', 1800, 6)
  const second = session('second', '2026-10-05', 1840, 7, true)
  const third = session('third', '2026-10-12', 1860, 6, true)
  assert.match(enduranceProgress(third, [first, second, third]).text, /Mittelstufe/)
  assert.doesNotMatch(enduranceProgress({ ...third, intensity: 9 },
    [first, second, third]).text, /ausprobieren/)
  assert.doesNotMatch(enduranceProgress(third, [first, { ...second,
    enduranceFlow: { ...second.enduranceFlow, sameSetup: false } }, third]).text, /ausprobieren/)
})

test('one shorter distance does not label a completed workout as a failure', () => {
  const first = session('first', '2026-10-01', 2000, 6)
  const next = session('next', '2026-10-12', 1800, 8, true)
  const advice = enduranceProgress(next, [first, next])
  assert.equal(advice.changePercent, -10)
  assert.match(advice.text, /einzelner Rückgang ist kein Urteil/)
})
