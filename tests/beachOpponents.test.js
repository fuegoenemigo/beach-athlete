import assert from 'node:assert/strict'
import test from 'node:test'
import { beachSetOpponent } from '../src/beachOpponents.js'

test('new beach test matches retain different opponents per set', () => {
  const day = { opponent: '', sets: [{ opponent: 'Team A' }, { opponent: 'Team B' }] }
  assert.equal(beachSetOpponent(day, day.sets[0]), 'Team A')
  assert.equal(beachSetOpponent(day, day.sets[1]), 'Team B')
})

test('legacy day opponent is only attributed to a set when there is exactly one', () => {
  const single = { opponent: 'Team A', sets: [{}] }
  assert.equal(beachSetOpponent(single, single.sets[0]), 'Team A')
  const multiple = { opponent: 'Team A', sets: [{}, {}] }
  assert.equal(beachSetOpponent(multiple, multiple.sets[1]), null)
})
