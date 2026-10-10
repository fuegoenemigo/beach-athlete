import assert from 'node:assert/strict'
import test from 'node:test'
import { appendRegularGame, finishRegularDay } from '../src/regularDay.js'
import { isAthleteData } from '../src/syncPolicy.js'

const valid = (day) => isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: [day] })
const game = (id, sport) => ({ id, opponent: `Team ${id}`,
  sets: Array.from({ length: sport === 'beach' ? 2 : 3 }, (_, index) => ({
    id: `${id}-set-${index}`, fitness: 6, intensity: 7, technique: 8,
    opponentStrength: 'equal', won: true,
  })) })

for (const [sport, gameType] of [['beach', 'openPlay'], ['beach', 'testMatch'], ['indoor', 'matchDay']]) {
  test(`${sport} ${gameType} can save a game, reopen the day and append another`, () => {
    const details = { date: '2026-10-10', sport, gameType, fitness: 7 }
    const first = appendRegularGame(null, details, game('first', sport))
    assert.equal(first.dayStatus, 'ongoing')
    assert.equal(first.endFatigue, null)
    assert.equal(valid(first), true)
    assert.equal(valid({ ...first, endFatigue: 5 }), false)
    const reopened = JSON.parse(JSON.stringify(first))
    const second = appendRegularGame(reopened, details, game('second', sport))
    assert.equal(second.id, first.id)
    assert.deepEqual(second.games.map((entry) => entry.opponent), ['Team first', 'Team second'])
    assert.equal(second.sets.length, sport === 'beach' ? 4 : 6)
    assert.equal(valid(second), true)
    if (gameType === 'testMatch') {
      assert.deepEqual([...new Set(second.sets.map((set) => set.opponent))],
        ['Team first', 'Team second'])
    }
    assert.throws(() => finishRegularDay(second, '', ''))
    const finished = finishRegularDay(second, 8, 'Langer Spieltag')
    assert.equal(finished.dayStatus, 'completed')
    assert.equal(finished.endFatigue, 8)
    assert.equal(finished.notes, 'Langer Spieltag')
    assert.equal(valid(finished), true)
    assert.equal(valid({ ...finished, endFatigue: null }), false)
    assert.throws(() => appendRegularGame(finished, details, game('third', sport)))
  })
}

test('incomplete games are not saved and prior completed days remain valid', () => {
  const details = { date: '2026-10-10', sport: 'beach', gameType: 'openPlay', fitness: 7 }
  assert.throws(() => appendRegularGame(null, details, {
    id: 'short', opponent: '', sets: [game('short', 'beach').sets[0]],
  }))
  const legacy = appendRegularGame(null, details, game('first', 'beach'))
  delete legacy.dayStatus
  legacy.endFatigue = 7
  assert.equal(valid(legacy), true)
})
