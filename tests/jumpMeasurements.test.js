import assert from 'node:assert/strict'
import test from 'node:test'
import { isJumpDate, jumpValuesForDate, parseJumpCentimeters, saveJumpValues } from '../src/jumpMeasurements.js'
import { JUMP_STANDARDS, jumpTestScore, measuredJumpScore } from '../src/jumpStandards.js'
import { dataHash, isAthleteData } from '../src/syncPolicy.js'

const empty = () => ({ sessions: [], exerciseLibrary: [], volleyballDays: [] })

test('jump values save by date and type without losing another measurement', () => {
  let id = 0
  const first = saveJumpValues([], '2026-10-31', { approach: '312,5', standingLong: '235' },
    () => `jump-${++id}`, '2026-10-31T12:00:00Z')
  assert.equal(first.length, 2)
  assert.deepEqual(jumpValuesForDate(first, '2026-10-31'), {
    standingLong: '235', approach: '312.5', standingArms: '',
  })
  const updated = saveJumpValues(first, '2026-10-31', { approach: '314', standingArms: '290' },
    () => `jump-${++id}`, '2026-10-31T13:00:00Z')
  assert.equal(updated.length, 3)
  assert.equal(updated.find((item) => item.testId === 'approach').valueCm, 314)
  assert.equal(updated.find((item) => item.testId === 'approach').metric, 'touchReach')
  assert.equal(updated.find((item) => item.testId === 'standingLong').valueCm, 235)
  assert.equal(first.find((item) => item.testId === 'approach').valueCm, 312.5)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: updated }), true)
  assert.notEqual(dataHash(empty()), dataHash({ ...empty(), jumpMeasurements: updated }))
})

test('invalid dates, values and duplicate test dates are rejected', () => {
  assert.equal(isJumpDate('2026-02-30'), false)
  assert.equal(parseJumpCentimeters('0', 'approach'), null)
  assert.equal(parseJumpCentimeters('451', 'approach'), null)
  assert.equal(parseJumpCentimeters('43', 'cmjNoArms'), null)
  assert.equal(parseJumpCentimeters('1.234', 'approach'), null)
  assert.equal(saveJumpValues([], '2026-10-31', { approach: 'abc' }, () => 'id', ''), null)
  assert.equal(saveJumpValues([], '2026-10-31', {}, () => 'id', ''), null)
  const record = { id: 'j1', date: '2026-10-31', testId: 'approach',
    metric: 'touchReach', valueCm: 275 }
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [record, { ...record, id: 'j2' }] }), false)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [{ ...record, testId: 'unknown' }] }), false)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: [{ ...record, valueCm: -5 }] }), false)
})

test('old jump heights stay in sync but cannot become touch reaches or earn a score', () => {
  const legacy = [
    { id: 'old-approach', date: '2026-10-31', testId: 'approach', valueCm: 75 },
    { id: 'old-cmj', date: '2026-10-31', testId: 'cmjNoArms', valueCm: 48 },
  ]
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: legacy }), true)
  assert.deepEqual(jumpValuesForDate(legacy, '2026-10-31'), {
    standingLong: '', approach: '', standingArms: '',
  })
  assert.equal(measuredJumpScore(legacy, 'women', '2026-10-31').score, 55)
  const next = saveJumpValues(legacy, '2026-10-31', { approach: '320' },
    () => 'new-approach', '2026-10-31T14:00:00Z')
  assert.equal(next.length, 3)
  assert.equal(isAthleteData({ ...empty(), jumpMeasurements: next }), true)
  assert.equal(measuredJumpScore(next, 'women', '2026-10-31').score, (96 + 55 + 55) / 3)
})

test('55 and 96 anchors apply to each test and reference group', () => {
  for (const [group, tests] of Object.entries(JUMP_STANDARDS)) {
    for (const [id, [low, high]] of Object.entries(tests)) {
      assert.equal(jumpTestScore(id, low, group), 55)
      assert.equal(jumpTestScore(id, high, group), 96)
    }
  }
  assert.ok(jumpTestScore('approach', 320, 'women') > jumpTestScore('approach', 320, 'men'))
})
