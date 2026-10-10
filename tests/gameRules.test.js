import assert from 'node:assert/strict'
import test from 'node:test'
import { gameStatus, isCompletedGame, isRecordableGame } from '../src/gameRules.js'

const sets = (...results) => results.map((won) => ({ won }))

test('beach game stops at two wins or two losses, including after three sets', () => {
  assert.equal(gameStatus(sets(true, true), 'beach').finished, true)
  assert.equal(gameStatus(sets(false, false), 'beach').finished, true)
  assert.equal(gameStatus(sets(true, false), 'beach').finished, false)
  assert.equal(isCompletedGame(sets(true, false, true), 'beach'), true)
  assert.equal(isCompletedGame(sets(false, true, false), 'beach'), true)
  assert.equal(isCompletedGame(sets(true), 'beach'), false)
  assert.equal(isCompletedGame(sets(true, true, false), 'beach'), false)
})

test('indoor game stops at the third win or loss, even on the fourth set', () => {
  assert.equal(gameStatus(sets(true, false, true), 'indoor').finished, false)
  assert.equal(gameStatus(sets(true, false, true, true), 'indoor').finished, true)
  assert.equal(isCompletedGame(sets(true, false, true, true), 'indoor'), true)
  assert.equal(isCompletedGame(sets(false, true, false, false), 'indoor'), true)
  assert.equal(isCompletedGame(sets(true, false, true, false), 'indoor'), false)
  assert.equal(isCompletedGame(sets(true, true, true, false), 'indoor'), false)
})

test('games are not automatically finished before the win threshold', () => {
  for (const sport of ['beach', 'indoor']) {
    const required = sport === 'beach' ? 2 : 3
    assert.equal(isCompletedGame(sets(...Array(required - 1).fill(true)), sport), false)
    assert.equal(isCompletedGame(sets(...Array(required).fill(true)), sport), true)
  }
})

test('a game can be ended deliberately after one set in both sports', () => {
  for (const sport of ['beach', 'indoor']) {
    assert.equal(isRecordableGame(sets(true), sport), false)
    assert.equal(isRecordableGame(sets(true), sport, true), true)
    assert.equal(isRecordableGame(sets(false), sport, true), true)
    assert.equal(isRecordableGame([], sport, true), false)
  }
  assert.equal(isRecordableGame(sets(true, true), 'beach', true), false)
  assert.equal(isRecordableGame(sets(true, true, false), 'beach', false), false)
  assert.equal(isRecordableGame(sets(true, false, true, true), 'indoor', false), true)
})
