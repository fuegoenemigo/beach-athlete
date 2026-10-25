import test from 'node:test'
import assert from 'node:assert/strict'
import { initialProfileData, isAthleteProfile, parseProfileNumber } from '../src/athleteProfile.js'
import { greetingName } from '../src/homeSummary.js'
import { dataHash, hasPersonalData, isAthleteData, localDataForAccount } from '../src/syncPolicy.js'

const empty = () => ({ sessions: [], exerciseLibrary: [], volleyballDays: [], trainingPlans: [], athleteProfile: { bodyweightKg: '' } })

test('only a first cloud profile starts onboarding; completion and existing accounts stay intact', () => {
  const original = empty()
  const first = initialProfileData(original, false)
  assert.equal(first.athleteProfile.onboardingCompleted, false)
  assert.equal(original.athleteProfile.onboardingCompleted, undefined)
  assert.equal(initialProfileData(original, true), original)
  const completed = { ...first, athleteProfile: { firstName: 'Lea', heightCm: '180', bodyweightKg: '75.5', onboardingCompleted: true } }
  assert.equal(initialProfileData(completed, false), completed)
  assert.equal(initialProfileData(first, false), first)
  assert.equal(isAthleteData(completed), true)
  assert.notEqual(dataHash(original), dataHash(completed))
  assert.equal(hasPersonalData({ ...original, athleteProfile: { firstName: 'Lea' } }, []), true)
  assert.deepEqual(localDataForAccount(completed, 'old', 'new', []).athleteProfile, { bodyweightKg: '' })
})

test('profile input accepts decimal commas without letting invalid values reach training data', () => {
  assert.equal(parseProfileNumber(' 75,5 '), '75.5')
  assert.equal(parseProfileNumber('180.0'), '180')
  assert.equal(parseProfileNumber(''), '')
  for (const value of ['0', '-5', 'abc', '1,2,3', '301', 'Infinity']) assert.equal(parseProfileNumber(value), null)
  assert.equal(isAthleteProfile({ bodyweightKg: '75' }), true)
  assert.equal(isAthleteProfile({ firstName: 42 }), false)
  assert.equal(isAthleteProfile({ onboardingCompleted: 'yes' }), false)
})

test('chosen first name takes precedence over the email without changing its spelling', () => {
  assert.equal(greetingName('marc@example.com', ' Anna-Lena '), 'Anna-Lena')
  assert.equal(greetingName('marc@example.com', 'Élodie'), 'Élodie')
  assert.equal(greetingName('marc@example.com', ''), 'Marc')
})
