import test from 'node:test'
import assert from 'node:assert/strict'
import { fiveDayStart, greetingName, mondayOf, shiftDate, weekSummary } from '../src/homeSummary.js'

test('the compact calendar includes today on weekdays and weekends, including year boundaries', () => {
  for (const date of ['2026-10-12', '2026-10-15', '2026-10-17', '2026-10-18', '2027-01-01']) {
    const start = fiveDayStart(date)
    assert.ok(date >= start && date <= shiftDate(start, 4))
  }
  assert.equal(fiveDayStart('2026-10-15'), '2026-10-12')
  assert.equal(mondayOf('2027-01-01'), '2026-12-28')
  assert.equal(shiftDate('2026-03-28', 2), '2026-03-30')
})

test('weekly display totals include only completed records in the selected week without mutating them', () => {
  const sessions = [
    { id: 'old', date: '2026-10-11', durationMinutes: 80, status: 'completed' },
    { id: 'one', date: '2026-10-12', durationMinutes: '45', status: 'completed' },
    { id: 'ongoing', date: '2026-10-15', durationMinutes: 90, status: 'ongoing' },
    { id: 'missing-time', date: '2026-10-16', durationMinutes: '', status: 'completed' },
    { id: 'legacy', date: '2026-10-18', durationMinutes: 30 },
    { id: 'future-week', date: '2026-10-19', durationMinutes: 30, status: 'completed' },
  ]
  const days = [
    { id: 'beach', date: '2026-10-14', gameType: 'openPlay', dayStatus: 'completed' },
    { id: 'open', date: '2026-10-15', gameType: 'matchDay', dayStatus: 'ongoing' },
    { id: 'tournament', date: '2026-10-17', gameType: 'tournament', tournamentStatus: 'pendingPlacement' },
  ]
  const original = structuredClone({ sessions, days })
  assert.deepEqual(weekSummary(sessions, days, '2026-10-15'), {
    start: '2026-10-12', end: '2026-10-18', sessions: 3, minutes: 75, gameDays: 1,
  })
  assert.deepEqual({ sessions, days }, original)
})

test('an unrecorded training duration is not displayed as measured zero', () => {
  const result = weekSummary([
    { date: '2026-10-15', status: 'completed', durationMinutes: '' },
    { date: '2026-10-15', status: 'completed', durationMinutes: 'invalid' },
  ], [], '2026-10-15')
  assert.equal(result.minutes, null)
  assert.equal(result.sessions, 2)
  assert.equal(weekSummary([], [], '2026-10-15').gameDays, 0)
})

test('the greeting uses a readable account prefix with a neutral fallback', () => {
  assert.equal(greetingName('marc.korus@example.com'), 'Marc')
  assert.equal(greetingName('eva+sport@example.com'), 'Eva')
  assert.equal(greetingName('1984@example.com'), 'Athlet')
  assert.equal(greetingName(undefined), 'Athlet')
})
