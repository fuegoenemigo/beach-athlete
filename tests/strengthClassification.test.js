import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_EXERCISES, enrichExercise } from '../src/volleyballTraining.js'
import { STRENGTH_GROUPS, strengthGroupFor,
  strengthRoleFor, strengthRatingWeightFor } from '../src/strengthClassification.js'
import { STRENGTH_LOAD_STANDARDS, STRENGTH_REP_STANDARDS,
  STRENGTH_SPECIAL_IDS } from '../src/strengthStandards.js'

const exercise = (id, muscleGroup, strengthRole = 'compound') =>
  ({ libraryId: id, muscleGroup, strengthRole })

test('all built-in strength exercises have a clear role and no Ganzkörper group', () => {
  const strength = DEFAULT_EXERCISES.filter((item) => item.category === 'Krafttraining')
  assert.equal(strength.length, 66)
  assert.ok(strength.every((item) => ['compound', 'isolation'].includes(item.strengthRole)))
  assert.ok(strength.filter((item) => ['Bizeps', 'Trizeps'].includes(item.muscleGroup))
    .every((item) => item.strengthRole === 'isolation'))
  assert.ok(strength.every((item) => STRENGTH_GROUPS.includes(strengthGroupFor(item))))
  assert.ok(strength.every((item) => STRENGTH_LOAD_STANDARDS[item.id]
    || STRENGTH_REP_STANDARDS[item.id] || STRENGTH_SPECIAL_IDS.has(item.id)))
  assert.ok(Object.values(STRENGTH_LOAD_STANDARDS).every(([regular, exceptional]) =>
    regular > 0 && exceptional > regular))
  assert.ok(DEFAULT_EXERCISES.every((item) => item.muscleGroup !== 'Ganzkörper'))
  assert.equal(strengthGroupFor({ libraryId: 'gym:kettlebell-swing', muscleGroup: 'Ganzkörper' }), 'Beine')
  assert.equal(strengthGroupFor({ libraryId: 'gym:farmers-carry', muscleGroup: 'Ganzkörper' }), 'Rücken')
  assert.equal(enrichExercise({ name: 'Kettlebell Swings', category: 'Krafttraining',
    muscleGroup: 'Ganzkörper' }).muscleGroup, 'Beine')
})

test('strength exercise classification and rating weights stay separate', () => {
  const compound = exercise('bench', 'Brust')
  const isolationA = exercise('fly', 'Brust', 'isolation')
  assert.equal(strengthRoleFor(compound), 'compound')
  assert.equal(strengthRoleFor(isolationA), 'isolation')
  assert.equal(strengthRatingWeightFor(compound), 2)
  assert.equal(strengthRatingWeightFor(isolationA), 1)
})

test('biceps and triceps remain isolations with main-exercise rating weight', () => {
  const shoulder = exercise('press', 'Schultern')
  const biceps = exercise('curl', 'Bizeps', 'isolation')
  const triceps = exercise('pushdown', 'Trizeps', 'isolation')
  assert.equal(strengthRoleFor(shoulder), 'compound')
  assert.equal(strengthRoleFor(exercise('gym:close-bench', 'Trizeps')), 'isolation')
  assert.equal(strengthRatingWeightFor(biceps), 2)
  assert.equal(strengthRatingWeightFor(triceps), 2)
})

test('new back and biceps exercises have independent card standards', () => {
  const added = ['gym:seated-row-close', 'gym:seated-row-wide',
    'gym:straight-arm-pulldown', 'gym:standing-cable-pullover',
    'gym:plate-loaded-curl', 'gym:rope-cable-curl']
  assert.equal(new Set(added).size, 6)
  for (const id of added) {
    const item = DEFAULT_EXERCISES.find((entry) => entry.id === id)
    assert.ok(item, id)
    assert.equal(item.type, 'strength')
    assert.ok(STRENGTH_LOAD_STANDARDS[id], id)
  }
})
