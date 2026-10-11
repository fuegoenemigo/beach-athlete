import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarDayActivity, isRecoveryDay } from '../src/calendarActivities.js'

test('an empty current or past day is recovery, while future and recorded days are not', () => {
  assert.equal(isRecoveryDay('2026-10-10', [], '2026-10-11'), true)
  assert.equal(isRecoveryDay('2026-10-11', [], '2026-10-11'), true)
  assert.equal(isRecoveryDay('2026-10-12', [], '2026-10-11'), false)
  assert.equal(isRecoveryDay('2026-10-10', [{ type: 'beach' }], '2026-10-11'), false)
  assert.equal(isRecoveryDay('2026-10-10', [{ type: 'training' }], '2026-10-11'), false)
  const legacyRecovery = [{ type: 'training', item: { category: 'Regeneration' } }]
  assert.equal(isRecoveryDay('2026-10-10', legacyRecovery, '2026-10-11'), true)
  assert.equal(calendarDayActivity(legacyRecovery), null)
  assert.equal(isRecoveryDay('2026-10-10', [...legacyRecovery, { type: 'beach' }], '2026-10-11'), false)
})

test('training takes priority over volleyball on a shared day', () => {
  const entries = [
    { type: 'beach', item: { gameType: 'tournament' } },
    { type: 'training', item: { category: 'Krafttraining', exercises: [] } },
  ]
  assert.deepEqual(calendarDayActivity(entries), { icon: 'barbell', label: 'Krafttraining' })
})

test('volleyball tournament, test match and regular day have distinct symbols', () => {
  assert.equal(calendarDayActivity([{ type: 'indoor', item: { gameType: 'tournament' } }]).emoji, '🏆')
  assert.equal(calendarDayActivity([{ type: 'beach', item: { gameType: 'testMatch' } }]).emoji, '🤝')
  assert.equal(calendarDayActivity([{ type: 'beach', item: { gameType: 'openPlay' } }]).emoji, '🏐')
})

test('mixed training chooses its main completed category, not a merely planned exercise', () => {
  const entry = { type: 'training', item: { category: 'Krafttraining', exercises: [
    { category: 'Krafttraining', type: 'strength', entries: [{ reps: '8', weightKg: '40', completed: true }] },
    { category: 'Core und Mobility', type: 'duration', entries: [{ durationValue: '', completed: false }] },
  ] } }
  assert.deepEqual(calendarDayActivity([entry]), { icon: 'barbell', label: 'Krafttraining' })
})
