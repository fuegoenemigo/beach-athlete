import assert from 'node:assert/strict'
import test from 'node:test'
import { athleteRating } from '../src/athleteRating.js'
import { STRENGTH_LOAD_STANDARDS, STRENGTH_REP_STANDARDS,
  strengthLoadScore, strengthRepScore, interpolateStrengthAnchors,
  CARRY_LOAD_RATIOS } from '../src/strengthStandards.js'

const day = (date, exercises, status = 'completed') => ({ id: date, date,
  category: exercises[0]?.category ?? 'Krafttraining', status, exercises })
const lift = (id, muscleGroup, weightKg, bodyweightKg = 75, reps = 8) => ({
  libraryId: id, name: id, category: 'Krafttraining', muscleGroup, type: 'strength',
  entries: [{ completed: true, reps: String(reps), weightKg: String(weightKg),
    bodyweightKg: String(bodyweightKg) }],
})
const bench = (weightKg, bodyweightKg = 75) => lift('volleyball:bench', 'Brust',
  weightKg, bodyweightKg)
const weekly = (count, exercises, first = '2026-10-05') => Array.from({ length: count },
  (_, index) => {
    const date = new Date(`${first}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + 7 * index)
    const dateText = date.toISOString().slice(0, 10)
    return day(dateText, typeof exercises === 'function' ? exercises(index) : exercises)
  })
const group = (rating, name) => rating.attributes[0].groups.find((item) => item.name === name)

test('all card values, strength groups and arm subgroups start at 55', () => {
  const rating = athleteRating([])
  assert.equal(rating.overall.score, 55)
  assert.deepEqual(rating.attributes.map((item) => item.score), [55, 55, 55, 55, 55])
  assert.deepEqual(rating.attributes[0].groups.map((item) => item.score), [55, 55, 55, 55])
  assert.deepEqual(group(rating, 'Arme').subgroups.map((item) => item.score), [55, 55, 55])
})

test('three measured jump tests use 55 and 96 anchors directly, and missing tests stay at 55', () => {
  const profile = { measurementCapability: 'measured', jumpRatingGroup: 'women' }
  const measurements = [
    { id: 'long', date: '2026-10-12', testId: 'standingLong', metric: 'distance', valueCm: 245 },
    { id: 'approach', date: '2026-10-13', testId: 'approach', metric: 'touchReach', valueCm: 320 },
    { id: 'standing', date: '2026-10-14', testId: 'standingArms', metric: 'touchReach', valueCm: 300 },
  ]
  assert.equal(athleteRating([], profile, '2026-10-11', measurements).overall.score, 55)
  const one = athleteRating([], profile, '2026-10-12', measurements)
  assert.equal(one.attributes[1].score, (96 + 55 + 55) / 3)
  const all = athleteRating([], profile, '2026-10-14', measurements)
  assert.equal(all.attributes[1].score, 96)
  assert.equal(all.overall.score, (55 * 4 + 96) / 5)
  const repeated = athleteRating([], profile, '2026-10-15', [...measurements,
    { ...measurements[1], id: 'repeat', date: '2026-10-15' }])
  assert.equal(repeated.attributes[1].score, 96)
})

test('measured jumps ignore old height records and override gym jump estimates', () => {
  const jump = { libraryId: 'volleyball:cmj', name: 'CMJ',
    category: 'Sprungkraft und Agilität', muscleGroup: 'Sprungkraft', type: 'jump',
    entries: [{ completed: true, heightCm: '100' }] }
  const profile = { measurementCapability: 'measured', jumpRatingGroup: 'men' }
  const result = athleteRating([day('2026-10-12', [jump])], profile, '2026-10-12',
    [{ id: 'old', date: '2026-10-12', testId: 'approach', valueCm: 95 }])
  assert.equal(result.attributes[1].score, 55)
})

test('bank press and every load exercise share explicit physical 55/96 anchors', () => {
  assert.equal(strengthLoadScore('volleyball:bench', 27.5, 75), 55)
  assert.equal(strengthLoadScore('volleyball:bench', 35, 75), 60)
  assert.equal(strengthLoadScore('volleyball:bench', 50, 75), 70)
  assert.equal(strengthLoadScore('volleyball:bench', 65, 75), 80)
  assert.equal(strengthLoadScore('volleyball:bench', 82.5, 75), 90)
  assert.equal(strengthLoadScore('volleyball:bench', 95, 75), 96)
  for (const [id, [, upperFactor]] of Object.entries(STRENGTH_LOAD_STANDARDS)) {
    const factor = upperFactor / 1.45
    const reps = id === 'gym:kettlebell-swing' ? 15 : 8
    assert.equal(strengthLoadScore(id, 27.5 * factor, 75, reps), 55, id)
    assert.equal(strengthLoadScore(id, 95 * factor, 75, reps), 96, id)
  }
  assert.equal(strengthLoadScore('volleyball:bench', 114, 90), 96)
})

test('all bodyweight exercises and carries reach 55/96 at their anchors', () => {
  for (const [id, anchors] of Object.entries(STRENGTH_REP_STANDARDS)) {
    assert.equal(strengthRepScore(id, anchors[0]), 55, id)
    assert.equal(strengthRepScore(id, anchors.at(-1)), 96, id)
  }
  assert.equal(interpolateStrengthAnchors(CARRY_LOAD_RATIOS[0], CARRY_LOAD_RATIOS), 55)
  assert.equal(interpolateStrengthAnchors(CARRY_LOAD_RATIOS.at(-1), CARRY_LOAD_RATIOS), 96)
  assert.equal(strengthRepScore('gym:back-extension', 18, 10, 75), 80 + 20 * 10 / 75)
  assert.equal(strengthRepScore('volleyball:calf', 32, 20, 75), 96)
})

test('one confirmed lift starts chest progress without an exercise-count gate', () => {
  const result = athleteRating([day('2026-10-05', [bench(95)])], {}, '2026-10-05')
  assert.equal(group(result, 'Brust').score, 60)
  assert.equal(result.attributes[0].score, (60 + 55 * 3) / 4)
  assert.equal(result.overall.score, (result.attributes[0].score + 55 * 4) / 5)
  assert.equal(athleteRating([day('2026-10-05', [bench(95)], 'ongoing')], {},
    '2026-10-05').attributes[0].score, 55)
})

test('the two best distinct exercises determine a muscle group', () => {
  const exercises = [bench(95), lift('volleyball:incline-bench', 'Brust', 78.62),
    lift('gym:pec-deck', 'Brust', 1)]
  const result = athleteRating([day('2026-10-05', exercises)], {}, '2026-10-05')
  assert.equal(group(result, 'Brust').score, 60)
  assert.equal(group(athleteRating([day('2026-10-05', exercises.slice(0, 2))], {},
    '2026-10-05'), 'Brust').score, 60)
})

test('the 96 strength ceiling requires progress in all four groups and three arm subgroups', () => {
  const exercises = [bench(95), lift('volleyball:row', 'Rücken', 95 * 1.2 / 1.45),
    lift('volleyball:squat', 'Beine', 95 * 1.7 / 1.45),
    lift('volleyball:press', 'Schultern', 95 * .75 / 1.45),
    lift('gym:barbell-curl', 'Bizeps', 95 * .75 / 1.45),
    lift('gym:triceps-pushdown', 'Trizeps', 95 * .9 / 1.45)]
  const sessions = weekly(14, exercises)
  const result = athleteRating(sessions, {}, sessions.at(-1).date)
  assert.deepEqual(result.attributes[0].groups.map((item) => item.score), [96, 96, 96, 96])
  assert.deepEqual(group(result, 'Arme').subgroups.map((item) => item.score), [96, 96, 96])
  assert.equal(result.attributes[0].score, 96)
  assert.equal(result.overall.score, (96 + 55 * 4) / 5)
})

test('arms average shoulder, biceps and triceps even when some are untrained', () => {
  const result = athleteRating([day('2026-10-05', [
    lift('volleyball:press', 'Schultern', 49.14)])], {}, '2026-10-05')
  const arms = group(result, 'Arme')
  assert.deepEqual(arms.subgroups.map((item) => item.score), [60, 55, 55])
  assert.equal(arms.score, (60 + 55 + 55) / 3)
  assert.equal(result.attributes[0].score, (55 * 3 + arms.score) / 4)
})

test('strong performance unfolds over weeks: 75 in five, 80 in six and 96 in fourteen', () => {
  const targetWeights = [[58, 75], [65, 80], [95, 96]]
  for (const [weight, target] of targetWeights) {
    const count = target === 75 ? 5 : target === 80 ? 6 : 14
    const sessions = weekly(count, [bench(weight)])
    const result = athleteRating(sessions, {}, sessions.at(-1).date)
    if (target !== 75) assert.equal(group(result, 'Brust').score, target)
    else assert.ok(group(result, 'Brust').score >= 75)
  }
  const sessions = weekly(14, [bench(95)])
  const scores = sessions.map((_, index) => group(athleteRating(sessions.slice(0, index + 1),
    {}, sessions[index].date), 'Brust').score)
  assert.deepEqual(scores, [60, 64, 68, 72, 76, 80, 82, 84, 86, 88, 90, 92, 94, 96])
})

test('multiple entries in one week cannot add a second strength step', () => {
  const sessions = [day('2026-10-05', [bench(95)]),
    day('2026-10-06', [bench(95)]), day('2026-10-08', [bench(95)])]
  const result = athleteRating(sessions, {}, '2026-10-08')
  assert.equal(group(result, 'Brust').score, 60)
  assert.equal(result.attributes[0].groups[0].series.at(-1).value, 60)
})

test('same performance stops at its target, while a later improvement resumes progress', () => {
  const plateau = weekly(10, [bench(50)])
  const before = athleteRating(plateau, {}, plateau.at(-1).date)
  assert.equal(group(before, 'Brust').score, 70)
  const improved = [...plateau, ...weekly(1, [bench(95)], '2026-12-14')]
  const after = athleteRating(improved, {}, improved.at(-1).date)
  assert.equal(group(after, 'Brust').score, 74)
})

test('personal improvement below absolute anchors gives a limited extra target', () => {
  const initial = day('2026-10-05', [bench(27.5)])
  const improved = day('2026-10-12', [bench(30)])
  const withImprovement = athleteRating([initial, improved], {}, '2026-10-12')
  const withoutImprovement = athleteRating([improved], {}, '2026-10-12')
  assert.ok(group(withImprovement, 'Brust').score > group(withoutImprovement, 'Brust').score)
  assert.ok(group(withImprovement, 'Brust').score < 65)
})

test('body mass, machine loads, assistance and optional external weight affect strength', () => {
  assert.ok(strengthLoadScore('volleyball:bench', 65, 70)
    > strengthLoadScore('volleyball:bench', 65, 100))
  assert.ok(strengthLoadScore('gym:chest-press', 65, 75)
    > strengthLoadScore('gym:chest-press', 35, 75))
  assert.ok(strengthRepScore('volleyball:pullup', 6, 10, 75)
    > strengthRepScore('volleyball:pullup', 6))
  const assisted = (assistanceKg) => ({ libraryId: 'gym:assisted-pullup',
    name: 'Unterstützte Klimmzüge', category: 'Krafttraining', muscleGroup: 'Rücken',
    type: 'reps', entries: [{ completed: true, reps: '15', assistanceKg: String(assistanceKg),
      bodyweightKg: '75' }] })
  const sessions = (assistanceKg) => weekly(7, [assisted(assistanceKg)])
  const lowAssistance = sessions(10)
  const highAssistance = sessions(35)
  assert.ok(group(athleteRating(lowAssistance, {}, lowAssistance.at(-1).date), 'Rücken').score
    > group(athleteRating(highAssistance, {}, highAssistance.at(-1).date), 'Rücken').score)
})

test('Farmer’s Carry uses total load only after 30 m in at most 45 seconds', () => {
  const carry = (weight, distance = 30, seconds = 40) => ({
    libraryId: 'gym:farmers-carry', name: 'Farmer’s Carry', category: 'Krafttraining',
    muscleGroup: 'Rücken', type: 'carry', entries: [{ completed: true,
      weightKg: String(weight), bodyweightKg: '75', distanceValue: String(distance),
      distanceUnit: 'm', durationValue: String(seconds), durationUnit: 's' }],
  })
  const high = weekly(7, [carry(112.5)])
  const low = weekly(7, [carry(30)])
  const short = weekly(7, [carry(112.5, 20)])
  assert.ok(group(athleteRating(high, {}, high.at(-1).date), 'Rücken').score
    > group(athleteRating(low, {}, low.at(-1).date), 'Rücken').score)
  assert.equal(group(athleteRating(short, {}, short.at(-1).date), 'Rücken').score, 55)
})

test('strength groups decay separately after eleven days, with a 55 floor', () => {
  const first = day('2026-10-05', [bench(95)])
  const start = athleteRating([first], {}, '2026-10-05')
  const ten = athleteRating([first], {}, '2026-10-15')
  const eleven = athleteRating([first], {}, '2026-10-16')
  assert.equal(group(ten, 'Brust').score, group(start, 'Brust').score)
  assert.equal(group(eleven, 'Brust').score, group(start, 'Brust').score - 1)
  assert.equal(group(eleven, 'Rücken').score, 55)
  assert.equal(eleven.overall.score,
    eleven.attributes.reduce((sum, item) => sum + item.score, 0) / 5)
})

test('several sessions in one week restore only one point lost to inactivity', () => {
  const established = weekly(14, [bench(95)])
  const returnDate = new Date(`${established.at(-1).date}T12:00:00Z`)
  returnDate.setUTCDate(returnDate.getUTCDate() + 44)
  const first = returnDate.toISOString().slice(0, 10)
  returnDate.setUTCDate(returnDate.getUTCDate() + 1)
  const second = returnDate.toISOString().slice(0, 10)
  const once = athleteRating([...established, day(first, [bench(95)])], {}, first)
  const twice = athleteRating([...established, day(first, [bench(95)]),
    day(second, [bench(95)])], {}, second)
  assert.equal(group(twice, 'Brust').score, group(once, 'Brust').score)
})
