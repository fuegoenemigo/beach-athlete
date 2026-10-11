import test from 'node:test'
import assert from 'node:assert/strict'
import { isTrainingPlan, TRAINING_CATEGORIES } from '../src/trainingModel.js'
import { isAthleteData } from '../src/syncPolicy.js'
import { BUILT_IN_PLANS, groupedTrainingPlans, removeTrainingPlan,
  restoreBuiltInPlans, visibleTrainingPlans, plansForCategory } from '../src/trainingPlanLibrary.js'

test('a training choice shows only matching plans and includes mixed plans in both categories', () => {
  const plans = [
    { id: 'strength', category: 'Krafttraining' },
    { id: 'endurance', category: 'Ausdauer' },
    { id: 'mixed', category: 'Krafttraining', categories: ['Krafttraining', 'Core und Mobility'] },
  ]
  assert.deepEqual(plansForCategory(plans, 'Krafttraining').map((plan) => plan.id), ['strength', 'mixed'])
  assert.deepEqual(plansForCategory(plans, 'Core und Mobility').map((plan) => plan.id), ['mixed'])
  assert.deepEqual(plansForCategory(plans, 'Ausdauer').map((plan) => plan.id), ['endurance'])
})

test('built-in edits replace their original and custom plans join the right category', () => {
  const original = BUILT_IN_PLANS[0]
  const edited = { ...original, name: 'Mein Ganzkörpertraining' }
  const custom = { id: 'own-core', name: 'Eigener Core-Tag', category: 'Core und Mobility', exercises: [] }
  const visible = visibleTrainingPlans([edited, custom])
  assert.equal(visible.filter((plan) => plan.id === original.id).length, 1)
  assert.equal(visible.find((plan) => plan.id === original.id).name, edited.name)
  assert.ok(groupedTrainingPlans(visible).find((group) => group.category === 'Core und Mobility')
    .plans.some((plan) => plan.id === custom.id))
})

test('new built-in endurance and mobility plans appear alongside existing personal plans', () => {
  const personal = { id: 'own-plan', name: 'Mein Plan', category: 'Ausdauer', exercises: [] }
  const visible = visibleTrainingPlans([personal])
  assert.ok(visible.some((plan) => plan.id === 'gym:plan-bike-interval-beginner'))
  assert.ok(visible.some((plan) => plan.id === 'gym:plan-treadmill-interval-advanced'))
  assert.ok(visible.some((plan) => plan.id === 'gym:plan-mobility-short'))
  assert.ok(visible.some((plan) => plan.id === personal.id))
})

test('deleting a built-in hides it in valid synced data and restoration returns it', () => {
  const original = BUILT_IN_PLANS[0]
  const hidden = removeTrainingPlan([], { ...original, category: 'Noch nicht gespeichert' })
  assert.equal(isTrainingPlan(hidden[0]), true)
  assert.equal(isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: [], trainingPlans: hidden }), true)
  assert.equal(visibleTrainingPlans(hidden).some((plan) => plan.id === original.id), false)
  assert.equal(visibleTrainingPlans(restoreBuiltInPlans(hidden)).some((plan) => plan.id === original.id), true)
})

test('deleting a personal plan removes it without hiding built-ins', () => {
  const personal = { id: 'own-plan', name: 'Eigener Plan', category: 'Krafttraining', exercises: [] }
  assert.deepEqual(removeTrainingPlan([personal], personal), [])
})

test('recovery is no longer a training choice, while old plans remain valid and stored', () => {
  const oldPlan = { id: 'old-recovery', name: 'Alter Ruhetag', category: 'Regeneration', exercises: [] }
  assert.equal(TRAINING_CATEGORIES.includes('Regeneration'), false)
  assert.equal(isTrainingPlan(oldPlan), true)
  assert.equal(isAthleteData({ sessions: [], exerciseLibrary: [], volleyballDays: [], trainingPlans: [oldPlan] }), true)
  assert.equal(visibleTrainingPlans([oldPlan]).some((plan) => plan.id === oldPlan.id), false)
})
