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
