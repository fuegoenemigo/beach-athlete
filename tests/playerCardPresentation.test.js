import assert from 'node:assert/strict'
import test from 'node:test'
import { playerCardIdentity, playerCardTrend } from '../src/playerCardPresentation.js'

test('the card shows the selected sport and saved position without changing its ID', () => {
  assert.deepEqual(playerCardIdentity({ firstName: 'Marc', volleyballDiscipline: 'beach', beachPosition: 'defender' }),
    { discipline: 'beach', name: 'Marc', position: 'Abwehr', code: 'ABW' })
  assert.deepEqual(playerCardIdentity({ firstName: 'Alex', volleyballDiscipline: 'indoor', indoorPosition: 'setter' }),
    { discipline: 'indoor', name: 'Alex', position: 'Zuspieler', code: 'ZUS' })
})

test('card indicators follow the last prior day and the displayed whole number', () => {
  const series = [{ date: '2026-10-28', value: 65 }, { date: '2026-10-29', value: 66 }]
  assert.equal(playerCardTrend({ score: 67, series: [...series,
    { date: '2026-10-29', value: 67 }] }), 'up')
  assert.equal(playerCardTrend({ score: 66.4, series: [series[0],
    { date: '2026-10-29', value: 66.4 }] }), 'up')
  assert.equal(playerCardTrend({ score: 65.4, series: [series[0],
    { date: '2026-10-29', value: 65.4 }] }), 'same')
  assert.equal(playerCardTrend({ score: 64, series: [series[0],
    { date: '2026-10-29', value: 64 }] }), 'down')
  assert.equal(playerCardTrend({ score: 60, series: [] }), 'same')
})
