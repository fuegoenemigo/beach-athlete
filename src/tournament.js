import { isRating, strengthOptions } from './volleyballValues.js'
import { isRecordableGame } from './gameRules.js'

export function appendTournamentGame(day, details, game, isLastGame) {
  if (day && (day.gameType !== 'tournament' || day.type !== details.sport
    || day.date !== details.date)) {
    throw new Error('Das ausgewählte Turnier passt nicht zu diesem Spieltag.')
  }
  if (day?.tournamentStatus === "completed" || day?.tournamentStatus === "pendingPlacement") {
    throw new Error("Dieses Turnier kann keine weiteren Spiele aufnehmen.");
  }
  const maxSets = details.sport === 'beach' ? 3 : 5
  if (!['beach', 'indoor'].includes(details.sport) || !details.date
    || (!day && (!details.name.trim() || !details.location.trim() || !isRating(details.fitness)))
    || !isRecordableGame(game.sets, details.sport, game.endedEarly) || game.sets.length > maxSets
    || typeof game.opponent !== 'string'
    || (game.endedEarly !== undefined && typeof game.endedEarly !== 'boolean')
    || game.sets.some((set) => !isRating(set.fitness) || !isRating(set.intensity)
      || !isRating(set.technique) || !strengthOptions.includes(set.opponentStrength)
      || typeof set.won !== 'boolean')) {
    throw new Error('Bitte prüfe Turnierdaten und Sätze vor dem Speichern.')
  }
  const storedGame = {
    id: game.id,
    opponent: game.opponent.trim(),
    setIds: game.sets.map((set) => set.id),
    endedEarly: Boolean(game.endedEarly),
    isLastGame,
  };
  const sets = game.sets.map((set) => ({ ...set, gameId: game.id }));
  return {
    ...(day ?? {
      id: crypto.randomUUID(),
      date: details.date,
      type: details.sport,
      gameType: "tournament",
      tournamentName: details.name.trim(),
      tournamentLocation: details.location.trim(),
      fitness: Number(details.fitness),
      endFatigue: null,
      notes: "",
      tournamentPlace: null,
      games: [],
      sets: [],
      createdAt: new Date().toISOString(),
    }),
    games: [...(day?.games ?? []), storedGame],
    sets: [...(day?.sets ?? []), ...sets],
    tournamentStatus: isLastGame ? "pendingPlacement" : "ongoing",
    updatedAt: new Date().toISOString(),
  };
}

export function finishTournament(day, place, fatigue, notes) {
  const number = Number(place);
  if (day.tournamentStatus !== "pendingPlacement"
    || place === '' || !Number.isInteger(number) || number < 1 || !isRating(fatigue)) {
    throw new Error("Bitte gib eine gültige Platzierung ein.");
  }
  return {
    ...day,
    tournamentPlace: number,
    endFatigue: Number(fatigue),
    notes: notes.trim(),
    tournamentStatus: "completed",
    updatedAt: new Date().toISOString(),
  };
}
