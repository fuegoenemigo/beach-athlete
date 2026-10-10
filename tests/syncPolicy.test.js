import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseInitialSync, dataHash, isAthleteData } from '../src/syncPolicy.js'

const library = [{ name: 'Kniebeugen', category: 'Krafttraining', type: 'strength' }]
const empty = () => ({ sessions: [], exerciseLibrary: structuredClone(library), volleyballDays: [] })
const withTraining = () => ({
  ...empty(),
  sessions: [{ id: 'training-1', date: '2026-10-10', exercises: [] }],
})
const remote = (data, revision = 'r1') => ({ ...structuredClone(data), revision })

test('first login uploads existing local training', () => {
  assert.equal(chooseInitialSync(withTraining(), null, null, 'user-1', library), 'upload')
})

test('new device downloads cloud data instead of uploading defaults', () => {
  assert.equal(chooseInitialSync(empty(), remote(withTraining()), null, 'user-1', library), 'download')
})

test('unchanged local copy accepts newer cloud revision', () => {
  const local = withTraining()
  const meta = { uid: 'user-1', hash: dataHash(local), revision: 'r1' }
  const newer = remote({ ...local, volleyballDays: [{ id: 'beach-1', date: '2026-10-11', sets: [] }] }, 'r2')
  assert.equal(chooseInitialSync(local, newer, meta, 'user-1', library), 'download')
})

test('local edits upload only while remote revision is unchanged', () => {
  const original = empty()
  const meta = { uid: 'user-1', hash: dataHash(original), revision: 'r1' }
  assert.equal(chooseInitialSync(withTraining(), remote(original), meta, 'user-1', library), 'upload')
  assert.equal(chooseInitialSync(withTraining(), remote(original, 'r2'), meta, 'user-1', library), 'conflict')
})

test('different account and malformed data never silently overwrite cloud', () => {
  const meta = { uid: 'user-1', hash: dataHash(withTraining()), revision: 'r1' }
  assert.equal(chooseInitialSync(withTraining(), remote(empty()), meta, 'user-2', library), 'conflict')
  assert.equal(chooseInitialSync(withTraining(), { ...remote(empty()), sessions: {} }, null, 'user-1', library), 'invalid')
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [null] }), false)
})
