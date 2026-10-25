import { isOpenTraining } from './trainingModel.js'
import { isOpenVolleyballDay } from './activityHistory.js'

// Read-only presentation helpers. Dates stay in the device's local calendar.
export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toLocaleDateString('sv-SE')
}

export function mondayOf(date) {
  return shiftDate(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7))
}

export function datesInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const count = new Date(year, monthNumber, 0, 12).getDate()
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`)
}

export function weekSummary(sessions, volleyballDays, date) {
  const start = mondayOf(date)
  const end = shiftDate(start, 6)
  const inWeek = (item) => item.date >= start && item.date <= end
  const completed = sessions.filter((session) => inWeek(session) && !isOpenTraining(session))
  const recordedMinutes = completed.map((session) => Number(session.durationMinutes))
    .filter((value) => Number.isFinite(value) && value > 0)
  return {
    start, end,
    sessions: completed.length,
    minutes: recordedMinutes.length ? Math.round(recordedMinutes.reduce((sum, value) => sum + value, 0)) : null,
    gameDays: volleyballDays.filter((day) => inWeek(day) && !isOpenVolleyballDay(day)).length,
  }
}

export function greetingName(email, firstName) {
  if (typeof firstName === 'string' && firstName.trim()) return firstName.trim()
  const first = (email ?? '').split('@')[0].split(/[._+-]/)[0]
  return /^[\p{L}]{2,24}$/u.test(first)
    ? first.charAt(0).toLocaleUpperCase('de-DE') + first.slice(1) : 'Athlet'
}
