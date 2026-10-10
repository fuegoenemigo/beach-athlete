export function gameStatus(sets, sport) {
  const winsNeeded = sport === 'beach' ? 2 : 3
  const wins = sets.filter((set) => set.won === true).length
  const losses = sets.filter((set) => set.won === false).length
  return { wins, losses, winsNeeded, finished: wins >= winsNeeded || losses >= winsNeeded }
}

export function isCompletedGame(sets, sport) {
  if (!Array.isArray(sets) || sets.length < 1
    || sets.length > (sport === 'beach' ? 3 : 5)
    || sets.some((set) => typeof set?.won !== 'boolean')) return false
  return gameStatus(sets, sport).finished
    && !gameStatus(sets.slice(0, -1), sport).finished
}

export function isRecordableGame(sets, sport, endedEarly = false) {
  if (!Array.isArray(sets) || sets.length < 1
    || sets.length > (sport === 'beach' ? 3 : 5)
    || sets.some((set) => typeof set?.won !== 'boolean')
    || gameStatus(sets.slice(0, -1), sport).finished) return false
  return endedEarly ? !gameStatus(sets, sport).finished : isCompletedGame(sets, sport)
}
