import test from 'node:test'
import assert from 'node:assert/strict'
import { adjacentArea, swipeDirection } from '../src/swipeNavigation.js'

test('horizontal swipes require deliberate horizontal travel', () => {
  const start = { x: 200, y: 200 }
  assert.equal(swipeDirection(start, { x: 125, y: 210 }), 'left')
  assert.equal(swipeDirection(start, { x: 275, y: 190 }), 'right')
  assert.equal(swipeDirection(start, { x: 160, y: 200 }), null)
  assert.equal(swipeDirection(start, { x: 120, y: 280 }), null)
})

test('tab swipes follow the navigation order without wrapping', () => {
  assert.equal(adjacentArea('home', 'left'), 'beach')
  assert.equal(adjacentArea('beach', 'left'), 'indoor')
  assert.equal(adjacentArea('indoor', 'left'), 'training')
  assert.equal(adjacentArea('training', 'left'), 'training')
  assert.equal(adjacentArea('training', 'right'), 'indoor')
  assert.equal(adjacentArea('home', 'right'), 'home')
})
