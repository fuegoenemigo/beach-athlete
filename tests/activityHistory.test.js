import test from 'node:test'
import assert from 'node:assert/strict'
import { isRecentDate, monthlyArchive, isOpenVolleyballDay } from '../src/activityHistory.js'

test('the short history covers today and the four preceding calendar days across months', () => {
  assert.equal(isRecentDate('2026-09-27', '2026-10-01'), true)
  assert.equal(isRecentDate('2026-09-26', '2026-10-01'), false)
  assert.equal(isRecentDate('2026-10-01', '2026-10-01'), true)
  assert.equal(isRecentDate('2026-10-02', '2026-10-01'), false)
})

test('archive groups only completed entries by month and sport', () => {
  const sessions = [
    { id: 'one', date: '2026-09-20', status: 'completed' },
    { id: 'two', date: '2026-09-21', status: 'ongoing' },
    { id: 'three', date: '2026-10-01', status: 'completed' },
  ]
  const volleyballDays = [
    { id: 'beach-one', date: '2026-09-19', type: 'beach', gameType: 'openPlay', dayStatus: 'completed' },
    { id: 'hall-one', date: '2026-09-18', type: 'indoor', gameType: 'tournament', tournamentStatus: 'completed' },
    { id: 'beach-open', date: '2026-09-22', type: 'beach', gameType: 'tournament', tournamentStatus: 'pendingPlacement' },
  ]
  assert.equal(isOpenVolleyballDay(volleyballDays[2]), true)
  const months = monthlyArchive(sessions, volleyballDays)
  assert.deepEqual(months.map((month) => [month.key, month.counts]), [
    ['2026-10', { training: 1, beach: 0, indoor: 0 }],
    ['2026-09', { training: 1, beach: 1, indoor: 1 }],
  ])
})
