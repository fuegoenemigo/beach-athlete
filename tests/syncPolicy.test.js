import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseInitialSync, dataHash, isAthleteData, isVolleyballDateTaken, localDataForAccount } from '../src/syncPolicy.js'

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

test('height synchronizes without changing the hash of older profiles', () => {
  const original = { ...empty(), athleteProfile: { bodyweightKg: '75' } }
  const withHeight = { ...original, athleteProfile: { bodyweightKg: '75', heightCm: '181' } }
  assert.equal(isAthleteData(withHeight), true)
  assert.notEqual(dataHash(original), dataHash(withHeight))
  assert.equal(isAthleteData({ ...original, athleteProfile: { heightCm: '400' } }), false)
  assert.equal(isAthleteData(original), true)
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

test('switching accounts does not offer the previous account data for first upload', () => {
  const previousData = withTraining()
  const nextData = localDataForAccount(previousData, 'user-1', 'user-2', library)
  assert.equal(nextData.sessions.length, 0)
  assert.equal(nextData.exerciseLibrary.length, 1)
  assert.equal(chooseInitialSync(nextData, null, null, 'user-2', library), 'upload')
  assert.equal(localDataForAccount(previousData, 'user-1', 'user-1', library), previousData)
  assert.equal(localDataForAccount(previousData, null, 'user-1', library), previousData)
  const secondUserData = { ...empty(), sessions: [{ id: 'second', date: '2026-10-12', exercises: [] }] }
  assert.equal(localDataForAccount(previousData, 'user-1', 'user-2', library, secondUserData), secondUserData)
  assert.equal(localDataForAccount(previousData, 'user-1', 'user-2', library, { sessions: null }).sessions.length, 0)
})

test('beach and indoor volleyball reserve the same calendar date, training does not', () => {
  const beachDay = { id: 'beach-1', date: '2026-10-10', type: 'beach', sets: [] }
  const indoorDay = { id: 'indoor-1', date: '2026-10-11', type: 'indoor', sets: [] }
  assert.equal(isVolleyballDateTaken([beachDay, indoorDay], '2026-10-10'), true)
  assert.equal(isVolleyballDateTaken([beachDay, indoorDay], '2026-10-11'), true)
  assert.equal(isVolleyballDateTaken([beachDay, indoorDay], '2026-10-12'), false)
  assert.equal(isAthleteData({ ...withTraining(), volleyballDays: [beachDay] }), true)
})

test('indoor games keep their own sets and cannot exceed five sets', () => {
  const sets = Array.from({ length: 5 }, (_, index) => ({
    id: `set-${index}`, gameId: 'game-1', fitness: 5, intensity: 6,
    technique: 7, opponentStrength: 'equal', won: index % 2 === 0,
  }))
  const day = {
    id: 'indoor-1', date: '2026-10-10', type: 'indoor', gameType: 'matchDay',
    fitness: 5, endFatigue: 7,
    games: [{ id: 'game-1', opponent: 'Team A', setIds: sets.map((set) => set.id) }], sets,
  }
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [day] }), true)
  const secondSet = { ...sets[0], id: 'set-second-game', gameId: 'game-2' }
  const twoGames = { ...day,
    games: [...day.games, { id: 'game-2', opponent: 'Team B', setIds: [secondSet.id] }],
    sets: [...sets, secondSet],
  }
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [twoGames] }), true)
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [{ ...twoGames,
    sets: [...sets, { ...secondSet, gameId: 'game-1' }],
  }] }), false)
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [{ ...day,
    games: [{ ...day.games[0], setIds: [...day.games[0].setIds, 'set-6'] }],
    sets: [...sets, { ...sets[0], id: 'set-6' }],
  }] }), false)
  assert.equal(isAthleteData({ ...empty(), volleyballDays: [{ ...day,
    games: [{ ...day.games[0], setIds: ['set-0', 'set-0'] }],
  }] }), false)
})

test('legacy and new training entries on the same date remain cloud-compatible', () => {
  const data = { ...empty(), sessions: [
    { id: 'old', date: '2026-10-10', title: 'Krafttraining', category: 'Krafttraining',
      exercises: [{ id: 'bench', name: 'Bankdrücken', type: 'strength',
        sets: '3', reps: '10', weight: '60' }] },
    { id: 'new', date: '2026-10-10', title: 'Mobility', category: 'Mobility',
      durationMinutes: '30', intensity: '3', notes: 'Beweglichkeit', status: 'completed',
      exercises: [] },
  ] }
  assert.equal(isAthleteData(data), true)
  assert.equal(chooseInitialSync(data, null, null, 'user-1', library), 'upload')
  assert.equal(dataHash(JSON.parse(JSON.stringify(data))), dataHash(data))
})
