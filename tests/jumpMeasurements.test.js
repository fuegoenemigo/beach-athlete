import assert from 'node:assert/strict'
import test from 'node:test'
import { isJumpDate, jumpValuesForDate, parseJumpCentimeters, saveJumpValues } from '../src/jumpMeasurements.js'
import { dataHash, isAthleteData } from '../src/syncPolicy.js'

const empty = () => ({ sessions: [], exerciseLibrary: [], volleyballDays: [] })

test('jump values save by date and type without losing another measurement', () => {
  let id = 0
  const first = saveJumpValues([], '2026-10-31', { approach: '72,5', standingLong: '235' },
    () => `jump-${++id}`, '2026-10-31T12:00:00Z')
  assert.equal(first.length, 2)
  assert.deepEqual(jumpValuesForDate(first, '2026-10-31'), {
    standingLong: '235', approach: '72.5', standingArms: '', cmjNoArms: '',
  })
  const updated = saveJumpValues(first, '2026-10-31', { approach: '74', cmjNoArms: '43' },
    () => `jump-${++id}`, '2026-10-31T13:00:00Z')
  assert.equal(updated.length, 3)
  assert.equal(updated.find((item) => item.testId === 'approach').valueCm, 74)
  assert.equal(updated.find((item) => item.testId === 'standingLong').valueCm, 235)
  assert.equal(first.find((item) => item.testId === 'approach').valueCm, 72.5)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: updated }), true)
  assert.notEqual(dataHash(empty()), dataHash({ ...empty(), jumpMeasurements: updated }))
})

test('invalid dates, values and duplicate test dates are rejected', () => {
  assert.equal(isJumpDate('2026-02-30'), false)
  assert.equal(parseJumpCentimeters('0', 'approach'), null)
  assert.equal(parseJumpCentimeters('201', 'approach'), null)
  assert.equal(parseJumpCentimeters('1.234', 'approach'), null)
  assert.equal(saveJumpValues([], '2026-10-31', { approach: 'abc' }, () => 'id', ''), null)
  assert.equal(saveJumpValues([], '2026-10-31', {}, () => 'id', ''), null)
  const record = { id: 'j1', date: '2026-10-31', testId: 'approach', valueCm: 75 }
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [record, { ...record, id: 'j2' }] }), false)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [{ ...record, testId: 'unknown' }] }), false)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [{ ...record, valueCm: -5 }] }), false)
})
