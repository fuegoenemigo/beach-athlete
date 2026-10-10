import { isCompletedGame } from './gameRules.js'
import { isRating, strengthOptions } from './volleyballValues.js'

export function appendRegularGame(day, details, game) {
  const validType = details.sport === 'beach'
    ? ['openPlay', 'testMatch'].includes(details.gameType)
    : details.sport === 'indoor' && details.gameType === 'matchDay'
  if (!validType || !details.date || (!day && !isRating(details.fitness))
    || (day && (day.date !== details.date || day.type !== details.sport
      || day.gameType !== details.gameType || day.dayStatus !== 'ongoing'))
    || typeof game.id !== 'string' || typeof game.opponent !== 'string'
    || (details.gameType === 'testMatch' && !game.opponent.trim())
    || !isCompletedGame(game.sets, details.sport)
    || game.sets.some((set) => typeof set.id !== 'string' || !isRating(set.fitness)
      || !isRating(set.intensity) || !isRating(set.technique)
      || !strengthOptions.includes(set.opponentStrength))) {
    throw new Error('Bitte prüfe Spieltag und Sätze vor dem Speichern.')
  }
  const storedGame = { id: game.id, opponent: game.opponent.trim(),
    setIds: game.sets.map((set) => set.id) }
  const sets = game.sets.map((set) => ({ ...set, gameId: game.id,
    ...(details.gameType === 'testMatch' ? { opponent: storedGame.opponent } : {}) }))
  return {
    ...(day ?? {
      id: crypto.randomUUID(), date: details.date, type: details.sport,
      gameType: details.gameType, fitness: Number(details.fitness),
      endFatigue: null, notes: '', games: [], sets: [],
      createdAt: new Date().toISOString(),
    }),
    games: [...(day?.games ?? []), storedGame],
    sets: [...(day?.sets ?? []), ...sets],
    dayStatus: 'ongoing',
    updatedAt: new Date().toISOString(),
  }
}

export function finishRegularDay(day, fatigue, notes) {
  if (!day || day.dayStatus !== 'ongoing' || !isRating(fatigue)) {
    throw new Error('Bitte gib eine gültige Erschöpfung von 1 bis 10 ein.')
  }
  return { ...day, dayStatus: 'completed', endFatigue: Number(fatigue),
    notes: notes.trim(), updatedAt: new Date().toISOString() }
}
