import test from 'node:test'
import assert from 'node:assert/strict'
import { datesInMonth, greetingName, mondayOf, shiftDate, weekSummary } from '../src/homeSummary.js'

test('the day strip contains the whole local month, including leap years and year boundaries', () => {
  for (const [month, length] of [['2026-10', 31], ['2026-11', 30], ['2026-02', 28], ['2028-02', 29], ['2027-01', 31]]) {
    const dates = datesInMonth(month)
    assert.equal(dates.length, length)
    assert.equal(dates[0], `${month}-01`)
    assert.equal(dates.at(-1), `${month}-${length}`)
    assert.equal(new Set(dates).size, length)
    assert.ok(dates.every((date) => date.startsWith(`${month}-`)))
  }
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
