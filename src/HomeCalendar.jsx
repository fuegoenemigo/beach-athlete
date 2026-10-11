import { useState } from 'react'
import ActivityDetails from './ActivityDetails.jsx'
import { activityEntries, activityTitle, localDate } from './activityHistory.js'
import { calendarActivities } from './calendarActivities.js'
import { trainingDayPerformances } from './calendarPerformance.js'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const performanceLabels = { decline: 'Rückgang', unchanged: 'Unverändert', slight: 'Leichte Steigerung', strong: 'Deutliche Steigerung' }
const percent = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')} %`
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

function monthCells(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const count = new Date(year, monthNumber, 0).getDate()
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, '0')}`)]
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function HomeCalendar({ sessions, volleyballDays, expanded = false }) {
  const [month, setMonth] = useState(() => localDate().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(null)
  const [openEntry, setOpenEntry] = useState(null)
  const entries = activityEntries(sessions, volleyballDays)
  const trainingPerformance = trainingDayPerformances(sessions)
  const byDate = new Map()
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, [])
    byDate.get(entry.date).push(entry)
  }
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const dayEntries = byDate.get(selectedDate) ?? []
  const selectedPerformance = trainingPerformance.get(selectedDate)

  return <section className={`home-widget home-calendar${expanded ? ' home-calendar-expanded' : ''}`} aria-label="Sportkalender">
    <div className="home-widget-header"><div>
      <span className="home-widget-kicker">DEIN MONAT</span>
      <span className="home-widget-title">Sportkalender</span>
    </div></div>
    <div className="home-month-navigation">
      <button type="button" aria-label="Vorheriger Monat" onClick={() => { setMonth(shiftMonth(month, -1)); setSelectedDate(null) }}>‹</button>
      <strong>{monthLabel}</strong>
      <button type="button" aria-label="Nächster Monat" onClick={() => { setMonth(shiftMonth(month, 1)); setSelectedDate(null) }}>›</button>
    </div>
    <div className="home-calendar-grid">
      {WEEKDAYS.map((day) => <span className="home-weekday" key={day}>{day}</span>)}
      {monthCells(month).map((date, index) => {
        if (!date) return <span key={`empty-${index}`} />
        const dayEntries = byDate.get(date) ?? []
        const symbols = calendarActivities(dayEntries)
        const shown = symbols.slice(0, symbols.length > 2 ? 1 : 2)
        const performance = trainingPerformance.get(date)
        return <button className={`home-calendar-day${dayEntries.length ? ' has-activity' : ''}${performance?.status && performance.status !== 'unrated' ? ` performance-${performance.status}` : ''}${date === localDate() ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`}
          type="button" key={date} aria-pressed={date === selectedDate}
          aria-label={`${formatDate(date)}${dayEntries.length ? `, ${dayEntries.length} ${dayEntries.length === 1 ? 'Eintrag' : 'Einträge'}: ${symbols.map((item) => item.label).join(', ')}` : ''}${performanceLabels[performance?.status] ? `, ${performanceLabels[performance.status]}` : ''}`}
          onClick={() => { setSelectedDate(date); setOpenEntry(null) }}>
          <span className="home-calendar-number">{Number(date.slice(-2))}</span>
          <span className="home-calendar-symbols" aria-hidden="true">
            {shown.map((item) => <span key={item.emoji}>{item.emoji}</span>)}
            {symbols.length > shown.length && <small>+{symbols.length - shown.length}</small>}
          </span>
        </button>
      })}
    </div>
    <div className="home-calendar-legend" aria-label="Farbwertung für vergleichbare Trainings">
      <span><i className="performance-decline" /> Rückgang</span>
      <span><i className="performance-unchanged" /> Gleich</span>
      <span><i className="performance-slight" /> Leicht besser</span>
      <span><i className="performance-strong" /> Deutlich besser</span>
    </div>
    <p className="home-calendar-hint">Die Farbe bewertet vergleichbare Trainingsübungen; Volleyballtage ohne Training bleiben vorerst neutral.</p>
    <details className="home-calendar-method">
      <summary>Wie entsteht die Farbe?</summary>
      <p>Jede abgeschlossene Übung wird über ihre ID mit ihrer letzten Ausführung verglichen. Aus den prozentualen Änderungen entsteht der Tagesdurchschnitt. Unter −1 % ist er rot, zwischen −1 % und +1 % gelb, über +1 % grün und ab +10 % blau.</p>
      <p>Bei Kraftübungen zählt der beste geschätzte Kraftwert aus Gewicht und Wiederholungen. Bei Sprüngen zählt die gemessene Höhe, bei Core-Halteübungen die Dauer und bei Ausdauer mit gleicher Distanz das Tempo. Fehlt ein vergleichbarer Messwert, bleibt der Tag neutral.</p>
    </details>
    {selectedDate && <div className="home-day-details">
      <h3>{formatDate(selectedDate)}</h3>
      {selectedPerformance && <p className="home-day-performance">
        {selectedPerformance.status === 'unrated' ? 'Noch keine vergleichbare frühere Übung für eine Tageswertung.'
          : `${performanceLabels[selectedPerformance.status]} · Durchschnitt ${percent(selectedPerformance.changePercent)} aus ${selectedPerformance.comparisons.length} von ${selectedPerformance.total} Übungen.`}
      </p>}
      {selectedPerformance?.comparisons.length > 0 && <ul className="home-performance-breakdown">
        {selectedPerformance.comparisons.map((comparison) => <li key={comparison.libraryId}>
          <span>{comparison.name}<small>gegen {formatDate(comparison.previousDate)}</small></span>
          <strong>{percent(comparison.changePercent)}</strong>
        </li>)}
      </ul>}
      {!dayEntries.length && <p className="helper-text">Für diesen Tag ist noch nichts eingetragen.</p>}
      {dayEntries.map((entry) => <article className="diary-panel home-day-entry" key={entry.id}>
        <button type="button" className="archive-entry-toggle" aria-expanded={openEntry === entry.id}
          onClick={() => setOpenEntry(openEntry === entry.id ? null : entry.id)}>
          <strong>{activityTitle(entry)}</strong><span aria-hidden="true">{openEntry === entry.id ? '⌃' : '⌄'}</span>
        </button>
        {openEntry === entry.id && <ActivityDetails entry={entry} />}
      </article>)}
    </div>}
  </section>
}
