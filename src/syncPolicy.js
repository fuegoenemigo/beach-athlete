import { isAthleteProfile } from './athleteProfile.js'
import { isRating, strengthOptions } from './volleyballValues.js'
import { isLoggedTrainingExercise, isTrainingPlan } from './trainingModel.js'

export function isVolleyballDateTaken(days, date) {
  return days.some((day) => day.date === date
    && (day.type === 'beach' || day.type === 'indoor'))
}

function isGameDay(day) {
  const tournament = day.gameType === 'tournament'
  const regular = day.type === 'indoor' ? day.gameType === 'matchDay'
    : day.gameType === 'openPlay' || day.gameType === 'testMatch'
  if ((!tournament && !regular) || !isRating(day.fitness)
    || (!tournament && (day.dayStatus === 'ongoing'
      ? day.endFatigue !== null : !isRating(day.endFatigue)))
    || !Array.isArray(day.games) || day.games.length === 0
    || !day.sets.every((set) => set && typeof set.id === 'string'
      && typeof set.gameId === 'string' && isRating(set.fitness)
      && isRating(set.intensity) && isRating(set.technique)
      && strengthOptions.includes(set.opponentStrength) && typeof set.won === 'boolean')) return false
  if (tournament) {
    if (typeof day.tournamentName !== 'string' || !day.tournamentName.trim()
      || typeof day.tournamentLocation !== 'string' || !day.tournamentLocation.trim()
      || !['ongoing', 'pendingPlacement', 'completed'].includes(day.tournamentStatus)) return false
    const completed = day.tournamentStatus === 'completed'
    if (completed !== (Number.isInteger(day.tournamentPlace) && day.tournamentPlace >= 1)
      || (completed ? !isRating(day.endFatigue) : day.endFatigue !== null)
      || day.games.filter((game) => game.isLastGame).length !== (day.tournamentStatus === 'ongoing' ? 0 : 1)
      || (day.tournamentStatus !== 'ongoing' && !day.games.at(-1)?.isLastGame)) return false
  }
  if (!tournament && day.dayStatus !== undefined
    && !['ongoing', 'completed'].includes(day.dayStatus)) return false
  const setIds = new Set(day.sets.map((set) => set?.id))
  const assignedIds = day.games.flatMap((game) => Array.isArray(game?.setIds) ? game.setIds : [])
  return day.games.every((game) => game && typeof game.id === 'string'
    && typeof game.opponent === 'string'
    && (game.endedEarly === undefined || typeof game.endedEarly === 'boolean')
    && Array.isArray(game.setIds) && game.setIds.length >= 1
    && game.setIds.length <= (day.type === 'beach' ? 3 : 5)
    && game.setIds.every((id) => setIds.has(id)
      && day.sets.find((set) => set?.id === id)?.gameId === game.id))
    && assignedIds.length === day.sets.length
    && new Set(day.games.map((game) => game.id)).size === day.games.length
    && new Set(assignedIds).size === assignedIds.length
}

export function isAthleteData(data) {
  return data && Array.isArray(data.sessions)
    && Array.isArray(data.exerciseLibrary)
    && Array.isArray(data.volleyballDays)
    && (data.athleteProfile === undefined || isAthleteProfile(data.athleteProfile))
    && (data.trainingPlans === undefined || (Array.isArray(data.trainingPlans)
      && data.trainingPlans.every(isTrainingPlan)))
    && data.sessions.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && (item.categories === undefined || (Array.isArray(item.categories)
        && item.categories.includes(item.category)
        && item.categories.every((category) => typeof category === 'string')))
      && Array.isArray(item.exercises) && item.exercises.every((exercise) =>
        isLoggedTrainingExercise(exercise)
        && (exercise.category === undefined || exercise.category === item.category
          || (Array.isArray(item.categories) && item.categories.includes(exercise.category)))))
    && data.exerciseLibrary.every((item) => item && typeof item === 'object'
      && typeof item.name === 'string' && typeof item.category === 'string')
    && data.volleyballDays.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && Array.isArray(item.sets)
      && (item.games ? isGameDay(item) : item.type !== 'indoor'))
}

export function isRemoteData(data) {
  return isAthleteData(data) && typeof data.revision === 'string'
}

export function dataHash(data) {
  return JSON.stringify({
    sessions: data.sessions,
    exerciseLibrary: data.exerciseLibrary,
    volleyballDays: data.volleyballDays,
    trainingPlans: data.trainingPlans ?? [],
    athleteProfile: data.athleteProfile ?? { bodyweightKg: '' },
  })
}

export function hasPersonalData(data, defaultLibrary) {
  return data.sessions.length > 0 || data.volleyballDays.length > 0
    || (data.trainingPlans?.length ?? 0) > 0
    || Boolean(data.athleteProfile?.bodyweightKg)
    || Boolean(data.athleteProfile?.heightCm)
    || Boolean(data.athleteProfile?.firstName)
    || data.athleteProfile?.onboardingCompleted !== undefined
    || JSON.stringify(data.exerciseLibrary) !== JSON.stringify(defaultLibrary)
}

export function localDataForAccount(data, storedUid, currentUid, defaultLibrary, savedData = null) {
  if (!storedUid || storedUid === currentUid) return data
  if (savedData && isAthleteData(savedData)) return savedData
  return {
    sessions: [],
    exerciseLibrary: structuredClone(defaultLibrary),
    volleyballDays: [],
    trainingPlans: [],
    athleteProfile: { bodyweightKg: '' },
  }
}

export function chooseInitialSync(local, remote, meta, uid, defaultLibrary) {
  if (!isAthleteData(local) || (remote && !isRemoteData(remote))) return 'invalid'
  if (!remote) return 'upload'
  const localHash = dataHash(local)
  if (localHash === dataHash(remote)) return 'ready'
  if (!hasPersonalData(local, defaultLibrary)
    || (meta?.uid === uid && meta.hash === localHash)) return 'download'
  if (meta?.uid === uid && meta.revision === remote.revision) return 'upload'
  return 'conflict'
}
