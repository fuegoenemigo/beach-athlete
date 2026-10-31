import { profilePositionLabel, selectedDiscipline } from './athleteProfile.js'

const POSITION_CODES = {
  beach: { blocker: 'BLO', defender: 'ABW' },
  indoor: { outside: 'AA', middle: 'MB', setter: 'ZUS', opposite: 'DIA', libero: 'LIB' },
}

export const CARD_STATS = [
  { id: 'strength', short: 'KRA' },
  { id: 'jump', short: 'SPR' },
  { id: 'agility', short: 'AGI' },
  { id: 'endurance', short: 'AUS' },
  { id: 'control', short: 'KTR' },
]

// Compare the numbers the card actually shows, so an invisible fractional change
// does not produce an arrow beside an unchanged displayed value.
export function playerCardTrend(track) {
  const series = track?.series ?? []
  const latestDate = series.at(-1)?.date
  const previous = [...series].reverse().find((point) => point.date !== latestDate)
  if (!previous || !Number.isFinite(Number(previous.value))) return 'same'
  const difference = Math.round(Number(track.score)) - Math.round(Number(previous.value))
  return difference > 0 ? 'up' : difference < 0 ? 'down' : 'same'
}

export function playerCardIdentity(profile = {}) {
  const discipline = selectedDiscipline(profile)
  const positionId = discipline === 'beach' ? profile.beachPosition : profile.indoorPosition
  return {
    discipline,
    name: profile.firstName?.trim() || 'ATHLETE',
    position: profilePositionLabel(profile),
    code: POSITION_CODES[discipline]?.[positionId] ?? '—',
  }
}
