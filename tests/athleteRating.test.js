import assert from 'node:assert/strict'
import test from 'node:test'
import { athleteRating } from '../src/athleteRating.js'

const day = (date, exercises, status = 'completed') => ({ id: date, date,
  category: exercises[0]?.category ?? 'Krafttraining', status, exercises })
const bench = (weight, bodyweight = '70') => ({ libraryId: 'volleyball:bench',
  name: 'Bankdrücken', category: 'Krafttraining', muscleGroup: 'Brust', type: 'strength',
  entries: [{ completed: true, reps: '8', weightKg: String(weight), bodyweightKg: bodyweight }] })
const lift = (id, group, weight, bodyweight = '70') => ({ libraryId: id,
  name: id, category: 'Krafttraining', muscleGroup: group, type: 'strength',
  entries: [{ completed: true, reps: '8', weightKg: String(weight), bodyweightKg: bodyweight }] })
const chest = (weight, bodyweight = '70') => [bench(weight, bodyweight),
  lift('volleyball:incline-bench', 'Brust', weight * 0.85, bodyweight)]
const jump = (height) => ({ libraryId: 'volleyball:cmj', name: 'Countermovement Jump',
  category: 'Sprungkraft und Agilität', muscleGroup: 'Sprungkraft', type: 'jump',
  entries: [{ completed: true, heightCm: String(height) }] })
const mobility = (duration) => ({ libraryId: 'gym:hip-flexor-stretch', name: 'Dehnung',
  category: 'Core und Mobility', muscleGroup: 'Mobility', type: 'duration',
  entries: [{ completed: true, durationValue: String(duration), durationUnit: 's' }] })
const plank = (duration) => ({ libraryId: 'volleyball:plank', name: 'Plank',
  category: 'Core und Mobility', muscleGroup: 'Core', type: 'duration',
  entries: [{ completed: true, durationValue: String(duration), durationUnit: 's' }] })
const sprint = () => ({ libraryId: 'volleyball:sprint', name: 'Sprint',
  category: 'Sprungkraft und Agilität', muscleGroup: 'Schnelligkeit', type: 'distance',
  entries: [{ completed: true, distanceValue: '30', distanceUnit: 'm',
    durationValue: '4', durationUnit: 's' }] })
const advancedInterval = () => ({ libraryId: 'gym:treadmill-interval-4m',
  name: 'Laufband-Intervalle', category: 'Ausdauer', type: 'distance',
  guidedEndurance: true, guidedProtocolId: 'gym:plan-treadmill-interval-advanced',
  entries: [{ completed: true, guidedCompletion: true, distanceValue: '3',
    distanceUnit: 'km', durationValue: '1400', durationUnit: 's' }] })

test('a new athlete starts with five visible 60 ratings and a 60 overall', () => {
  const rating = athleteRating([])
  assert.equal(rating.overall.score, 60)
  assert.equal(rating.attributes.length, 5)
  assert.ok(rating.attributes.every((item) => item.score === 60))
})

test('strong first performance moves slowly; poor performance and open sessions never lower 60', () => {
  const incomplete = athleteRating([day('2026-10-12', [bench(80)])], { bodyweightKg: '70' })
  assert.equal(incomplete.attributes[0].score, 60)
  const first = athleteRating([day('2026-10-12', chest(80))], { bodyweightKg: '70' })
  assert.ok(first.attributes[0].score > 60 && first.attributes[0].score < 63)
  assert.ok(first.overall.score > 60 && first.overall.score < 61)
  const poor = athleteRating([day('2026-10-12', chest(10)),
    day('2026-10-13', chest(80), 'ongoing')], { bodyweightKg: '70' })
  assert.equal(poor.attributes[0].score, 60)
  assert.equal(poor.overall.score, 60)
})

test('the 75 kg bench and incline targets give 95 before gradual group adaptation', () => {
  const rating = athleteRating([day('2026-10-12', [bench(108.75, '75'),
    lift('volleyball:incline-bench', 'Brust', 90, '75')])],
  { bodyweightKg: '75' }, '2026-10-12')
  assert.ok(Math.abs(rating.attributes[0].groups[0].score - 66.3) < 1e-9)
  assert.ok(rating.attributes[0].score < 62)
})

test('ratings above 80 gain at most two points per week and can reach 90 later', () => {
  const sessions = Array.from({ length: 21 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 12 + index * 7)).toISOString().slice(0, 10)
    return day(date, [jump(100)])
  })
  const rating = athleteRating(sessions)
  const points = rating.attributes[1].series
  assert.ok(rating.attributes[1].score >= 90)
  assert.ok(points.every((point, index) => index === 0 || point.value <= Math.max(80, points[index - 1].value) + 2.00001))
})

test('mobility rewards repeated documented days, not a single short stretch', () => {
  const short = athleteRating([day('2026-10-12', [mobility(30)])])
  assert.equal(short.attributes[4].score, 60)
  const repeated = athleteRating(['2026-10-12', '2026-10-13', '2026-10-14']
    .map((date) => day(date, [mobility(130)])), {}, '2026-10-14')
  assert.ok(repeated.attributes[4].score > 60)
  assert.equal(repeated.attributes[4].series.length, 4)
  assert.equal(repeated.attributes[4].series[0].value, 60)
})

test('saved bodyweight changes relative strength and the overall is always the mean of five attributes', () => {
  const lighter = athleteRating([day('2026-10-12', chest(80, '70'))], { bodyweightKg: '100' })
  const heavier = athleteRating([day('2026-10-12', chest(80, '100'))], { bodyweightKg: '70' })
  assert.ok(lighter.attributes[0].score > heavier.attributes[0].score)
  const mean = lighter.attributes.reduce((sum, item) => sum + item.score, 0) / 5
  assert.equal(lighter.overall.score, mean)
})

test('squat rating normalizes external barbell load by body mass without adding it to the bar', () => {
  const legs = (bodyweight) => [
    lift('volleyball:squat', 'Beine', 100, bodyweight),
    lift('gym:front-squat', 'Beine', 80, bodyweight),
  ]
  const lighter = athleteRating([day('2026-10-12', legs('75'))],
    { bodyweightKg: '75' }, '2026-10-12')
  const heavier = athleteRating([day('2026-10-12', legs('100'))],
    { bodyweightKg: '100' }, '2026-10-12')
  assert.ok(lighter.attributes[0].groups[2].score > heavier.attributes[0].groups[2].score)
})

test('bodyweight strength uses only clean repetitions even for old weighted sets', () => {
  const pullup = (reps, weightKg = '') => ({ libraryId: 'volleyball:pullup',
    name: 'Klimmzüge', category: 'Krafttraining', muscleGroup: 'Rücken',
    type: 'strength', loadMode: 'bodyweightOnly',
    entries: [{ completed: true, reps: String(reps), weightKg, bodyweightKg: '75' }] })
  const row = lift('volleyball:row', 'Rücken', 90, '75')
  const regular = athleteRating([day('2026-10-12', [pullup(3), row])],
    { bodyweightKg: '75' }, '2026-10-12')
  const exceptional = athleteRating([day('2026-10-12', [pullup(20), row])],
    { bodyweightKg: '75' }, '2026-10-12')
  const withExtraWeight = athleteRating([day('2026-10-12', [pullup(3, '20'), row])],
    { bodyweightKg: '75' }, '2026-10-12')
  assert.ok(exceptional.attributes[0].score > regular.attributes[0].score)
  assert.equal(withExtraWeight.attributes[0].score, regular.attributes[0].score)
})

test('assisted pull-up strength uses the recorded assistance, not repetitions alone', () => {
  const assisted = (assistanceKg) => ({ libraryId: 'gym:assisted-pullup',
    name: 'Klimmzüge mit Unterstützung', category: 'Krafttraining',
    muscleGroup: 'Rücken', type: 'reps', entries: [{ completed: true,
      reps: '8', assistanceKg, bodyweightKg: '75' }] })
  const row = lift('volleyball:row', 'Rücken', 90, '75')
  const score = (assistanceKg) => athleteRating([
    day('2026-10-12', [assisted(assistanceKg), row]),
  ], { bodyweightKg: '75' }, '2026-10-12').attributes[0].groups[1].score
  assert.ok(score('15') > score('30'))
  assert.equal(score(undefined), score('30'))
})

test('a major group unlocks after one compound and two distinct isolations across days', () => {
  const sessions = [
    day('2026-10-01', [bench(140)]),
    day('2026-10-02', [lift('gym:pec-deck', 'Brust', 60)]),
    day('2026-10-03', [lift('gym:cable-fly', 'Brust', 40)]),
  ]
  const before = athleteRating(sessions.slice(0, 2), {}, '2026-10-02').attributes[0].groups[0]
  const after = athleteRating(sessions, {}, '2026-10-03').attributes[0].groups[0]
  assert.equal(before.qualified, false)
  assert.equal(before.score, 60)
  assert.equal(after.qualified, true)
  assert.ok(after.score > 60)
})

test('one compound and two isolations contribute 50/25/25 to the chest score', () => {
  const rating = athleteRating([day('2026-10-12', [bench(108.75, '75'),
    lift('gym:pec-deck', 'Brust', 1, '75'),
    lift('gym:cable-fly', 'Brust', 1, '75')])], { bodyweightKg: '75' }, '2026-10-12')
  assert.ok(Math.abs(rating.attributes[0].groups[0].score - 63.15) < 1e-9)
})

test('arms stay at 60 until shoulders, biceps and triceps are all represented', () => {
  const sessions = [
    day('2026-10-01', [lift('volleyball:press', 'Schultern', 80)]),
    day('2026-10-02', [lift('gym:barbell-curl', 'Bizeps', 40)]),
    day('2026-10-03', [lift('gym:close-bench', 'Trizeps', 100)]),
  ]
  const before = athleteRating(sessions.slice(0, 2), {}, '2026-10-02').attributes[0].groups[3]
  const after = athleteRating(sessions, {}, '2026-10-03').attributes[0].groups[3]
  assert.equal(before.qualified, false)
  assert.equal(before.score, 60)
  assert.equal(after.qualified, true)
  assert.ok(after.score > 60)
})

test('several sessions on one day produce only one rating update', () => {
  const sessions = [day('2026-10-12', [jump(60)]),
    { ...day('2026-10-12', [jump(70)]), id: 'later', createdAt: '2026-10-12T20:00:00Z' }]
  const rating = athleteRating(sessions, {}, '2026-10-12')
  assert.equal(rating.attributes[1].observations, 1)
  assert.equal(rating.attributes[1].series.length, 2)
})

test('mobility on a core day cannot lower the resulting body-control target', () => {
  const coreOnly = athleteRating([day('2026-10-12', [plank(120)])])
  const combined = athleteRating([day('2026-10-12', [plank(120), mobility(130)])])
  assert.ok(combined.attributes[4].score >= coreOnly.attributes[4].score)
})

test('consistently exceptional results can eventually reach an overall 90', () => {
  const sessions = Array.from({ length: 26 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 12 + index * 7)).toISOString().slice(0, 10)
    return day(date, [...chest(140),
      lift('volleyball:deadlift', 'Rücken', 200), lift('volleyball:row', 'Rücken', 120),
      lift('volleyball:squat', 'Beine', 180), lift('gym:front-squat', 'Beine', 140),
      lift('volleyball:press', 'Schultern', 80),
      lift('gym:barbell-curl', 'Bizeps', 20 + index * 2),
      lift('gym:triceps-pushdown', 'Trizeps', 20 + index * 2),
      jump(100), sprint(), advancedInterval(), plank(600), mobility(130)])
  })
  const rating = athleteRating(sessions, {}, sessions.at(-1).date)
  assert.ok(rating.overall.score >= 90)
  assert.ok(rating.attributes.every((item) => item.score >= 80))
})

test('an attribute loses one point only after each full eleven-day inactivity period', () => {
  const sessions = [day('2026-10-01', chest(140))]
  const initial = athleteRating(sessions, {}, '2026-10-01').attributes[0]
  const tenDays = athleteRating(sessions, {}, '2026-10-11')
  const elevenDays = athleteRating(sessions, {}, '2026-10-12')
  const twentyTwoDays = athleteRating(sessions, {}, '2026-10-23')
  assert.equal(tenDays.attributes[0].score, initial.score)
  assert.equal(elevenDays.attributes[0].groups[0].score, initial.groups[0].score - 1)
  assert.equal(elevenDays.attributes[0].score, initial.score - 0.25)
  assert.equal(twentyTwoDays.attributes[0].groups[0].score, initial.groups[0].score - 2)
  assert.deepEqual(twentyTwoDays.attributes[0].groups[0].series.slice(-2).map((point) => point.date),
    ['2026-10-12', '2026-10-23'])
  assert.equal(twentyTwoDays.overall.score,
    twentyTwoDays.attributes.reduce((sum, item) => sum + item.score, 0) / 5)
})

test('four muscle-group clocks decay separately and strength averages their new scores', () => {
  const sessions = [
    day('2026-10-01', chest(140)),
    day('2026-10-02', [lift('volleyball:deadlift', 'Rücken', 200),
      lift('volleyball:row', 'Rücken', 120)]),
    day('2026-10-03', [lift('volleyball:squat', 'Beine', 180),
      lift('gym:front-squat', 'Beine', 140)]),
    day('2026-10-04', [lift('volleyball:press', 'Schultern', 80),
      lift('gym:barbell-curl', 'Bizeps', 20),
      lift('gym:triceps-pushdown', 'Trizeps', 20)]),
  ]
  const onDayFour = athleteRating(sessions, {}, '2026-10-04')
  const onDayTwelve = athleteRating(sessions, {}, '2026-10-12')
  const onDayFifteen = athleteRating(sessions, {}, '2026-10-15')
  const initial = onDayFour.attributes[0].groups.map((group) => group.score)
  assert.ok(initial.every((score) => score > 60))
  assert.deepEqual(onDayTwelve.attributes[0].groups.map((group) => group.score),
    [initial[0] - 1, ...initial.slice(1)])
  assert.deepEqual(onDayFifteen.attributes[0].groups.map((group) => group.score),
    initial.map((score) => score - 1))
  assert.equal(onDayFifteen.attributes[0].score, onDayFour.attributes[0].score - 1)
  assert.ok(Math.abs(onDayFifteen.overall.score - (onDayFour.overall.score - 0.2)) < 1e-9)
})

test('repeating only chest resets its clock without protecting back, legs or arms', () => {
  const sessions = [
    day('2026-10-01', chest(140)),
    day('2026-10-02', [lift('volleyball:deadlift', 'Rücken', 200),
      lift('volleyball:row', 'Rücken', 120)]),
    day('2026-10-11', [bench(140)]),
  ]
  const dayTwelve = athleteRating(sessions, {}, '2026-10-12').attributes[0].groups
  const dayThirteen = athleteRating(sessions, {}, '2026-10-13').attributes[0].groups
  assert.equal(dayTwelve[0].score, dayThirteen[0].score)
  assert.equal(dayThirteen[1].score, dayTwelve[1].score - 1)
})

test('matching training on the due date resets its own clock but another category does not', () => {
  const first = day('2026-10-01', chest(140))
  const onDueDate = athleteRating([first, day('2026-10-12', [bench(140)])], {}, '2026-10-12')
  const justBefore = athleteRating([first, day('2026-10-11', [bench(140)])], {}, '2026-10-11')
  assert.equal(onDueDate.attributes[0].score, justBefore.attributes[0].score)
  const differentCategory = athleteRating([first, day('2026-10-12', [jump(60)])], {}, '2026-10-12')
  assert.equal(differentCategory.attributes[0].score,
    athleteRating([first], {}, '2026-10-12').attributes[0].score)
})

test('lost strength points are not instantly restored by the first workout after a long break', () => {
  const first = day('2026-10-01', chest(140))
  const returnDay = day('2026-10-24', [bench(140)])
  const returned = athleteRating([first, returnDay], {}, '2026-10-24')
  const uninterrupted = athleteRating([first, day('2026-10-11', [bench(140)]),
    day('2026-10-21', [bench(140)]), returnDay], {}, '2026-10-24')
  assert.ok(returned.attributes[0].score < uninterrupted.attributes[0].score)
  assert.ok(returned.attributes[0].score >= 60)
})
