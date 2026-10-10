import assert from 'node:assert/strict'
import test from 'node:test'
import { appendTournamentGame, finishTournament } from '../src/tournament.js'
import { isAthleteData } from '../src/syncPolicy.js'

const details = (sport) => ({ date: '2026-10-10', sport,
  name: 'Herbst-Cup', location: 'Hamburg', fitness: 7 })
const game = (id, count) => ({ id, opponent: `Team ${id}`,
  sets: Array.from({ length: count }, (_, index) => ({ id: `${id}-set-${index}`,
    fitness: 7, intensity: 6, technique: 8, opponentStrength: 'equal', won: index % 2 === 0 })) })
const valid = (day) => isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: [day] })

for (const [sport, maxSets] of [['beach', 3], ['indoor', 5]]) {
  test(`${sport} tournament saves individual games, resumes and asks for place after last game`, () => {
    const first = appendTournamentGame(null, details(sport), game('first', maxSets), false)
    assert.equal(first.tournamentStatus, 'ongoing')
    assert.equal(first.tournamentPlace, null)
    assert.equal(first.endFatigue, null)
    assert.equal(valid(first), true)
    const reloaded = structuredClone(first)
    const last = appendTournamentGame(reloaded, details(sport), game('last', 1), true)
    assert.equal(last.id, first.id)
    assert.deepEqual(last.games.map(({ opponent }) => opponent), ['Team first', 'Team last'])
    assert.equal(last.tournamentStatus, 'pendingPlacement')
    assert.equal(valid(last), true)
    assert.throws(() => appendTournamentGame(last, details(sport), game('extra', 1), false))
    assert.throws(() => finishTournament(last, '', 6, ''))
    const finished = finishTournament(last, '2', 6, 'Finale erreicht')
    assert.equal(finished.tournamentPlace, 2)
    assert.equal(finished.endFatigue, 6)
    assert.equal(finished.notes, 'Finale erreicht')
    assert.equal(valid(finished), true)
    assert.throws(() => appendTournamentGame(finished, details(sport), game('extra', 1), false))
  })

  test(`${sport} game cannot exceed ${maxSets} sets`, () => {
    assert.throws(() => appendTournamentGame(null, details(sport), game('too-long', maxSets + 1), false))
    const day = appendTournamentGame(null, details(sport), game('normal', maxSets), false)
    day.games[0].setIds.push('extra')
    day.sets.push({ ...day.sets[0], id: 'extra', gameId: 'normal' })
    assert.equal(valid(day), false)
  })
}

test('legacy beach records remain readable', () => {
  assert.equal(valid({ id: 'old', date: '2026-09-01', type: 'beach',
    gameType: 'tournament', tournamentLocation: 'Berlin', tournamentPlace: 3,
    sets: [{ id: 'old-set', won: true }] }), true)
})
