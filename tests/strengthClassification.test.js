import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_EXERCISES, enrichExercise } from '../src/volleyballTraining.js'
import { STRENGTH_GROUPS, strengthGroupFor, strengthGroupQualified,
  strengthRoleFor, weightedStrengthMean } from '../src/strengthClassification.js'
import { STRENGTH_LOAD_STANDARDS, STRENGTH_REP_STANDARDS,
  STRENGTH_SPECIAL_IDS } from '../src/strengthStandards.js'

const exercise = (id, muscleGroup, strengthRole = 'compound', score = 80) =>
  ({ libraryId: id, muscleGroup, strengthRole, score })

test('all built-in strength exercises have a clear role and no Ganzkörper group', () => {
  const strength = DEFAULT_EXERCISES.filter((item) => item.category === 'Krafttraining')
  assert.equal(strength.length, 60)
  assert.ok(strength.every((item) => ['compound', 'isolation'].includes(item.strengthRole)))
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

test('major groups require two different compounds or one compound and two isolations', () => {
  const compound = exercise('bench', 'Brust')
  const otherCompound = exercise('incline', 'Brust')
  const isolationA = exercise('fly', 'Brust', 'isolation')
  const isolationB = exercise('cable-fly', 'Brust', 'isolation')
  assert.equal(strengthGroupQualified([compound], 'Brust'), false)
  assert.equal(strengthGroupQualified([compound, compound], 'Brust'), false)
  assert.equal(strengthGroupQualified([isolationA, isolationB], 'Brust'), false)
  assert.equal(strengthGroupQualified([compound, isolationA], 'Brust'), false)
  assert.equal(strengthGroupQualified([compound, otherCompound], 'Brust'), true)
  assert.equal(strengthGroupQualified([compound, isolationA, isolationB], 'Brust'), true)
  assert.equal(weightedStrengthMean([
    { ...compound, score: 90 }, { ...isolationA, score: 60 }, { ...isolationB, score: 60 },
  ]), 75)
})

test('arms need shoulders, biceps and triceps independently', () => {
  const shoulder = exercise('press', 'Schultern')
  const biceps = exercise('curl', 'Bizeps', 'isolation')
  const triceps = exercise('pushdown', 'Trizeps', 'isolation')
  assert.equal(strengthGroupQualified([shoulder, biceps], 'Arme'), false)
  assert.equal(strengthGroupQualified([shoulder, triceps], 'Arme'), false)
  assert.equal(strengthGroupQualified([shoulder, biceps, triceps], 'Arme'), true)
  assert.equal(strengthRoleFor(shoulder), 'compound')
})
