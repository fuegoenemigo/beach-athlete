import test from 'node:test'
import assert from 'node:assert/strict'
import { initialProfileData, isAthleteProfile, missingSetupSteps, nextOnboardingStep, profilePositionLabel,
  selectedDiscipline, withoutLastName,
  parseProfileNumber } from '../src/athleteProfile.js'
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

test('new profile questions resume at the first missing answer and preserve older profiles', () => {
  const name = { firstName: 'Lea' }
  const body = { ...name, heightCm: '180', bodyweightKg: '75.5' }
  const sports = { ...body, volleyballDiscipline: 'beach', volleyballDisciplines: ['beach'] }
  const positions = { ...sports, beachPosition: 'blocker' }
  assert.equal(nextOnboardingStep({}), 0)
  assert.equal(nextOnboardingStep({ firstName: 'Lea' }), 1)
  assert.equal(nextOnboardingStep({ firstName: 'Lea', lastName: '' }), 1)
  assert.equal(nextOnboardingStep(name), 1)
  assert.equal(nextOnboardingStep(body), 2)
  assert.equal(nextOnboardingStep(sports), 3)
  assert.equal(nextOnboardingStep(positions), 4)
  assert.equal(nextOnboardingStep({ ...positions, measurementCapability: 'standard' }), 5)
  assert.deepEqual(missingSetupSteps({ ...positions, measurementCapability: 'standard' }), [])
  assert.deepEqual(missingSetupSteps({ ...body, measurementCapability: 'standard' }), [2, 3])
  assert.equal(selectedDiscipline({ volleyballDisciplines: ['indoor'] }), 'indoor')
  assert.equal(selectedDiscipline({ volleyballDisciplines: ['beach', 'indoor'] }), '')
  assert.equal(nextOnboardingStep({ ...positions, volleyballDiscipline: '', volleyballDisciplines: ['beach', 'indoor'] }), 2)
  assert.equal(isAthleteProfile({ firstName: 'Lea', bodyweightKg: '75' }), true)
})

test('volleyball positions and measurement capability remain valid sync data', () => {
  const both = { firstName: 'Lea', heightCm: '180', bodyweightKg: '75.5',
    volleyballDisciplines: ['beach', 'indoor'], beachPosition: 'defender',
    indoorPosition: 'libero', measurementCapability: 'standard', onboardingCompleted: true }
  assert.equal(isAthleteData({ ...empty(), athleteProfile: both }), true)
  assert.notEqual(dataHash({ ...empty(), athleteProfile: both }), dataHash(empty()))
  assert.equal(isAthleteProfile({ ...both, volleyballDisciplines: ['beach', 'beach'] }), false)
  assert.equal(isAthleteProfile({ ...both, beachPosition: 'setter' }), false)
  assert.equal(isAthleteProfile({ ...both, indoorPosition: 'blocker' }), false)
  assert.equal(isAthleteProfile({ ...both, measurementCapability: 'expert' }), false)
  assert.equal(isAthleteProfile({ ...both, volleyballDiscipline: 'both' }), false)
  assert.equal(hasPersonalData({ ...empty(), athleteProfile: { lastName: 'Muster' } }, []), false)
})

test('beach defender keeps its stored ID while the selection and profile use distinct labels', () => {
  const profile = { volleyballDiscipline: 'beach', beachPosition: 'defender' }
  assert.equal(profilePositionLabel(profile), 'Abwehr')
  assert.equal(profilePositionLabel({ ...profile, beachPosition: 'blocker' }), 'Blocker')
  assert.equal(profilePositionLabel({ volleyballDiscipline: 'indoor', indoorPosition: 'libero' }), 'Libero')
  assert.equal(isAthleteProfile(profile), true)
})

test('legacy surnames are removed from active profiles and sync comparisons', () => {
  const profile = { firstName: 'Lea', lastName: 'Muster', bodyweightKg: '75' }
  assert.deepEqual(withoutLastName(profile), { firstName: 'Lea', bodyweightKg: '75' })
  assert.equal(profile.lastName, 'Muster')
  assert.equal(isAthleteProfile(profile), true)
  assert.equal(dataHash({ ...empty(), athleteProfile: profile }),
    dataHash({ ...empty(), athleteProfile: withoutLastName(profile) }))
  const complete = { firstName: 'Lea', heightCm: '180', bodyweightKg: '75',
    volleyballDiscipline: 'beach', beachPosition: 'blocker', measurementCapability: 'standard' }
  assert.equal(nextOnboardingStep({ ...complete, lastName: '' }), 5)
})
