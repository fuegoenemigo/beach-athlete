import { isOpenTraining } from './trainingModel.js'

const gameNames = { openPlay: 'Open Play', testMatch: 'Testspiel', matchDay: 'Spieltag', tournament: 'Turnier' }

export function activityTitle(entry) {
  if (entry.type === 'training') return entry.item.planName || entry.item.category || 'Training'
  return `${entry.type === 'beach' ? 'Beachvolleyball' : 'Hallenvolleyball'} · ${gameNames[entry.item.gameType] ?? 'Spieltag'}`
}

export const localDate = () => new Date().toLocaleDateString('sv-SE')

export function recentDateStart(today = localDate()) {
  const date = new Date(`${today}T12:00:00`)
  date.setDate(date.getDate() - 4)
  return date.toLocaleDateString('sv-SE')
}

export function isRecentDate(date, today = localDate()) {
  return date >= recentDateStart(today) && date <= today
}

export function isOpenVolleyballDay(day) {
  return day.gameType === 'tournament'
    ? day.tournamentStatus === 'ongoing' || day.tournamentStatus === 'pendingPlacement'
    : day.dayStatus === 'ongoing'
}

export function activityEntries(sessions, volleyballDays, completedOnly = false) {
  const training = sessions.filter((session) => !completedOnly || !isOpenTraining(session))
    .map((item) => ({ id: `training-${item.id}`, type: 'training', date: item.date, item }))
  const volleyball = volleyballDays.filter((day) => !completedOnly || !isOpenVolleyballDay(day))
    .map((item) => ({ id: `${item.type}-${item.id}`, type: item.type, date: item.date, item }))
  return [...training, ...volleyball].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? ''))
}

export function monthlyArchive(sessions, volleyballDays) {
  const months = new Map()
  for (const entry of activityEntries(sessions, volleyballDays, true)) {
    const key = entry.date.slice(0, 7)
    if (!months.has(key)) months.set(key, { key, counts: { training: 0, beach: 0, indoor: 0 }, entries: [] })
    const month = months.get(key)
    month.counts[entry.type] += 1
    month.entries.push(entry)
  }
  return [...months.values()]
}
