import { isRating, strengthOptions } from './volleyballValues.js'

export function isVolleyballDateTaken(days, date) {
  return days.some((day) => day.date === date
    && (day.type === 'beach' || day.type === 'indoor'))
}

function isIndoorDay(day) {
  if (day.gameType !== 'matchDay' || !isRating(day.fitness) || !isRating(day.endFatigue)
    || !Array.isArray(day.games) || day.games.length === 0
    || !day.sets.every((set) => set && typeof set.id === 'string'
      && typeof set.gameId === 'string' && isRating(set.fitness)
      && isRating(set.intensity) && isRating(set.technique)
      && strengthOptions.includes(set.opponentStrength) && typeof set.won === 'boolean')) return false
  const setIds = new Set(day.sets.map((set) => set?.id))
  const assignedIds = day.games.flatMap((game) => Array.isArray(game?.setIds) ? game.setIds : [])
  return day.games.every((game) => game && typeof game.id === 'string'
    && typeof game.opponent === 'string'
    && Array.isArray(game.setIds) && game.setIds.length >= 1 && game.setIds.length <= 5
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
    && data.sessions.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && Array.isArray(item.exercises))
    && data.exerciseLibrary.every((item) => item && typeof item === 'object'
      && typeof item.name === 'string' && typeof item.category === 'string')
    && data.volleyballDays.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && Array.isArray(item.sets)
      && (item.type !== 'indoor' || isIndoorDay(item)))
}

export function isRemoteData(data) {
  return isAthleteData(data) && typeof data.revision === 'string'
}

export function dataHash(data) {
  return JSON.stringify({
    sessions: data.sessions,
    exerciseLibrary: data.exerciseLibrary,
    volleyballDays: data.volleyballDays,
  })
}

export function hasPersonalData(data, defaultLibrary) {
  return data.sessions.length > 0 || data.volleyballDays.length > 0
    || JSON.stringify(data.exerciseLibrary) !== JSON.stringify(defaultLibrary)
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
