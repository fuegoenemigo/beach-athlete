export const STRENGTH_GROUPS = ['Brust', 'Rücken', 'Beine', 'Arme']
export const ARM_SUBGROUPS = ['Schultern', 'Bizeps', 'Trizeps']

const COMPOUND_IDS = new Set([
  'volleyball:bench', 'volleyball:incline-bench', 'volleyball:squat',
  'volleyball:deadlift', 'volleyball:pullup', 'volleyball:row',
  'volleyball:press', 'volleyball:lunge', 'volleyball:pushup',
  'volleyball:rdl', 'volleyball:split-squat',
  'gym:dumbbell-bench', 'gym:dumbbell-incline', 'gym:chest-press',
  'gym:dips', 'gym:lat-pulldown', 'gym:close-pulldown',
  'gym:seated-row', 'gym:dumbbell-row', 'gym:barbell-row',
  'gym:seated-row-close', 'gym:seated-row-wide',
  'gym:tbar-row', 'gym:assisted-pullup',
  'gym:dumbbell-press', 'gym:arnold-press',
  'gym:leg-press', 'gym:hack-squat', 'gym:front-squat',
  'gym:goblet-squat', 'gym:hip-thrust', 'gym:glute-bridge',
  'gym:step-up', 'gym:reverse-lunge',
  'gym:kettlebell-swing', 'gym:farmers-carry',
])

export function strengthRoleFor(exercise) {
  if (['Bizeps', 'Trizeps'].includes(strengthMuscleFor(exercise))) return 'isolation'
  if (exercise.strengthRole === 'compound' || exercise.strengthRole === 'isolation')
    return exercise.strengthRole
  return COMPOUND_IDS.has(exercise.libraryId ?? exercise.id) ? 'compound' : 'isolation'
}

export function strengthRatingWeightFor(exercise) {
  return ['Bizeps', 'Trizeps'].includes(strengthMuscleFor(exercise))
    || strengthRoleFor(exercise) === 'compound' ? 2 : 1
}

export function strengthMuscleFor(exercise) {
  const id = exercise.libraryId ?? exercise.id
  if (id === 'gym:kettlebell-swing') return 'Beine'
  if (id === 'gym:farmers-carry') return 'Rücken'
  return exercise.muscleGroup ?? null
}

export function strengthGroupFor(exercise) {
  const muscle = strengthMuscleFor(exercise)
  if (STRENGTH_GROUPS.includes(muscle) && muscle !== 'Arme') return muscle
  if (ARM_SUBGROUPS.includes(muscle)) return 'Arme'
  return null
}

export function strengthGroupQualified(exercises, groupName) {
  const groupExercises = [...new Map(exercises
    .filter((exercise) => strengthGroupFor(exercise) === groupName)
    .map((exercise) => [exercise.libraryId ?? exercise.id, exercise])).values()]
  if (groupName === 'Arme') return ARM_SUBGROUPS.every((muscle) =>
    groupExercises.some((exercise) => strengthMuscleFor(exercise) === muscle))
  const compoundCount = groupExercises.filter((exercise) =>
    strengthRoleFor(exercise) === 'compound').length
  const isolationCount = groupExercises.length - compoundCount
  return compoundCount >= 2 || (compoundCount >= 1 && isolationCount >= 2)
}

export function weightedStrengthMean(exercises) {
  const totalWeight = exercises.reduce((sum, exercise) => sum
    + strengthRatingWeightFor(exercise), 0)
  return exercises.reduce((sum, exercise) => sum + exercise.score
    * strengthRatingWeightFor(exercise), 0) / totalWeight
}
