import TrainingHistoryDetails from './TrainingHistoryDetails.jsx'
import { SetResultHeading } from './VolleyballInputs.jsx'
import { strengthLabels } from './volleyballValues.js'
import { beachSetOpponent } from './beachOpponents.js'
import { isOpenVolleyballDay } from './activityHistory.js'

function SetDetails({ set, number, opponent, showStrength = true }) {
  if (!set) return null
  return <div className="volleyball-saved-set">
    <SetResultHeading number={number} won={set.won} />
    {opponent && <p>Gegner: {opponent}</p>}
    {showStrength && <p>Gegnerstärke: {strengthLabels[set.opponentStrength] ?? set.opponentStrength ?? '–'}</p>}
    <p>Fitness zu Satzbeginn: {set.fitness ?? '–'}/10</p>
    <p>Intensität: {set.intensity ?? '–'}/10</p>
    <p>Technische Leistung: {set.technique ?? '–'}/10</p>
  </div>
}

export default function ActivityDetails({ entry }) {
  const item = entry.item
  if (entry.type === 'training') return <TrainingHistoryDetails session={item} />

  return <div className="volleyball-day-list volleyball-day-details">
    {isOpenVolleyballDay(item) && <p>Dieser Spieltag ist noch offen.</p>}
    {item.gameType === 'tournament' && <>
      {item.tournamentName && <p>Turnier: {item.tournamentName}</p>}
      {item.tournamentLocation && <p>Austragungsort: {item.tournamentLocation}</p>}
      {item.tournamentPlace != null && <p>Platzierung: {item.tournamentPlace}. Platz</p>}
    </>}
    <p>Tagesform zu Beginn: {item.fitness ?? '–'}/10
      {item.endFatigue != null && ` · Erschöpfung am Ende: ${item.endFatigue}/10`}</p>
    {item.notes && <p>{item.notes}</p>}
    {item.games?.length ? item.games.map((game, index) => {
      const sets = (game.setIds ?? []).map((id) => item.sets?.find((set) => set.id === id)).filter(Boolean)
      const strength = sets.length && sets.every((set) => set.opponentStrength === sets[0].opponentStrength)
        ? sets[0].opponentStrength : null
      return <div className="diary-panel" key={game.id ?? index}>
        <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ''}{game.isLastGame ? ' · Letztes Spiel' : ''}</h4>
        {strength && <p>Gegnerstärke: {strengthLabels[strength] ?? strength}</p>}
        {game.endedEarly && <p>Nach {sets.length} {sets.length === 1 ? 'Satz' : 'Sätzen'} beendet</p>}
        {sets.map((set, setIndex) => <SetDetails key={set.id ?? setIndex} set={set}
          number={setIndex + 1} showStrength={!strength} />)}
      </div>
    }) : (item.sets ?? []).map((set, index) => <SetDetails key={set.id ?? index} set={set}
      number={index + 1} opponent={item.gameType === 'testMatch' ? beachSetOpponent(item, set) : null} />)}
  </div>
}
