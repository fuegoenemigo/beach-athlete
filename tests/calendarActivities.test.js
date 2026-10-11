import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarActivities } from '../src/calendarActivities.js'

test('calendar uses distinct symbols for activities on the same day', () => {
  const entries = [
    { type: 'beach', item: {} },
    { type: 'training', item: { category: 'Krafttraining', exercises: [] } },
    { type: 'training', item: { category: 'Ausdauer', exercises: [] } },
  ]
  assert.deepEqual(calendarActivities(entries).map((item) => item.emoji), ['🏐', '🏋️', '🏃'])
})

test('mixed training shows completed categories but not merely planned exercises', () => {
  const entry = { type: 'training', item: { category: 'Krafttraining', exercises: [
    { category: 'Krafttraining', type: 'strength', entries: [{ reps: '8', weightKg: '40', completed: true }] },
    { category: 'Core und Mobility', type: 'duration', entries: [{ durationValue: '', completed: false }] },
  ] } }
  assert.deepEqual(calendarActivities([entry]).map((item) => item.emoji), ['🏋️'])
})
