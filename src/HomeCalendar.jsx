import { useState } from 'react'
import ActivityDetails from './ActivityDetails.jsx'
import { activityEntries, activityTitle, localDate } from './activityHistory.js'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
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
  const byDate = new Map()
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, [])
    byDate.get(entry.date).push(entry)
  }
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const dayEntries = byDate.get(selectedDate) ?? []

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
      {monthCells(month).map((date, index) => date
        ? <button className={`home-calendar-day${date === localDate() ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`}
          type="button" key={date} aria-pressed={date === selectedDate}
          aria-label={`${formatDate(date)}${byDate.has(date) ? `, ${byDate.get(date).length} Einträge` : ''}`}
          onClick={() => { setSelectedDate(date); setOpenEntry(null) }}>
          <span>{Number(date.slice(-2))}</span>
          <span className="home-calendar-markers" aria-hidden="true">
            {['beach', 'indoor', 'training'].filter((type) => byDate.get(date)?.some((entry) => entry.type === type))
              .map((type) => <i className={`home-calendar-marker ${type}`} key={type} />)}
          </span>
        </button>
        : <span key={`empty-${index}`} />)}
    </div>
    <div className="home-calendar-legend"><span><i className="home-calendar-marker beach" /> Beach</span>
      <span><i className="home-calendar-marker indoor" /> Halle</span>
      <span><i className="home-calendar-marker training" /> Training</span></div>
    {selectedDate && <div className="home-day-details">
      <h3>{formatDate(selectedDate)}</h3>
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
