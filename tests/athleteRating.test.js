import assert from 'node:assert/strict'
import test from 'node:test'
import { athleteRating } from '../src/athleteRating.js'

const day = (date, exercises, status = 'completed') => ({ id: date, date,
  category: exercises[0]?.category ?? 'Krafttraining', status, exercises })
const bench = (weight, bodyweight = '70') => ({ libraryId: 'volleyball:bench',
  name: 'Bankdrücken', category: 'Krafttraining', muscleGroup: 'Brust', type: 'strength',
  entries: [{ completed: true, reps: '8', weightKg: String(weight), bodyweightKg: bodyweight }] })
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
  const first = athleteRating([day('2026-10-12', [bench(80)])], { bodyweightKg: '70' })
  assert.ok(first.attributes[0].score > 60 && first.attributes[0].score < 70)
  assert.ok(first.overall.score > 60 && first.overall.score < 63)
  const poor = athleteRating([day('2026-10-12', [bench(10)]),
    day('2026-10-13', [bench(80)], 'ongoing')], { bodyweightKg: '70' })
  assert.equal(poor.attributes[0].score, 60)
  assert.equal(poor.overall.score, 60)
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
    .map((date) => day(date, [mobility(130)])))
  assert.ok(repeated.attributes[4].score > 60)
  assert.equal(repeated.attributes[4].series.length, 4)
  assert.equal(repeated.attributes[4].series[0].value, 60)
})

test('saved bodyweight changes relative strength and the overall is always the mean of five attributes', () => {
  const lighter = athleteRating([day('2026-10-12', [bench(80, '70')])], { bodyweightKg: '100' })
  const heavier = athleteRating([day('2026-10-12', [bench(80, '100')])], { bodyweightKg: '70' })
  assert.ok(lighter.attributes[0].score > heavier.attributes[0].score)
  const mean = lighter.attributes.reduce((sum, item) => sum + item.score, 0) / 5
  assert.equal(lighter.overall.score, mean)
})

test('several sessions on one day produce only one rating update', () => {
  const sessions = [day('2026-10-12', [jump(60)]),
    { ...day('2026-10-12', [jump(70)]), id: 'later', createdAt: '2026-10-12T20:00:00Z' }]
  const rating = athleteRating(sessions)
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
    return day(date, [bench(140), jump(100), sprint(), advancedInterval(), plank(600), mobility(130)])
  })
  const rating = athleteRating(sessions)
  assert.ok(rating.overall.score >= 90)
  assert.ok(rating.attributes.every((item) => item.score >= 80))
})
