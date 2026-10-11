import { useEffect, useState } from 'react'
import ActivityDetails from './ActivityDetails.jsx'
import { activityTitle, monthlyArchive } from './activityHistory.js'

const filters = [
  ['all', 'Alle'], ['beach', 'Beach'], ['indoor', 'Halle'], ['training', 'Training'],
]
const fullDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
})
const monthName = (key) => new Date(`${key}-01T12:00:00`).toLocaleDateString('de-DE', {
  month: 'long', year: 'numeric',
})

export default function ArchiveView({ sessions, volleyballDays, target = null }) {
  const [filter, setFilter] = useState(target?.type ?? 'all')
  const [openMonth, setOpenMonth] = useState(target?.date.slice(0, 7) ?? null)
  const [openEntry, setOpenEntry] = useState(target?.id ?? null)
  const months = monthlyArchive(sessions, volleyballDays)

  useEffect(() => {
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`archive-entry-${target.id}`)?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [target])

  return <div className="archive-view">
    <p className="eyebrow">DEIN VERLAUF</p>
    <h2>Archiv</h2>
    <p className="helper-text">Alle abgeschlossenen Spieltage und Trainingseinheiten, nach Monaten geordnet.</p>
    <div className="archive-filters" role="group" aria-label="Archiv filtern">
      {filters.map(([value, label]) => <button key={value} type="button"
        className={filter === value ? 'primary-button' : 'secondary-button'}
        aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {!months.length && <p className="helper-text">Noch keine abgeschlossenen Einträge vorhanden.</p>}
    {months.filter((month) => filter === 'all' || month.counts[filter] > 0).map((month) => {
      const entries = month.entries.filter((entry) => filter === 'all' || entry.type === filter)
      return <section className="diary-panel archive-month" key={month.key}>
        <button type="button" className="archive-month-toggle" aria-expanded={openMonth === month.key}
          onClick={() => { setOpenMonth(openMonth === month.key ? null : month.key); setOpenEntry(null) }}>
          <strong>{monthName(month.key)}</strong><span aria-hidden="true">{openMonth === month.key ? '⌃' : '⌄'}</span>
        </button>
        <p className="archive-counts">{month.counts.training} Training · {month.counts.beach} Beach · {month.counts.indoor} Halle</p>
        {openMonth === month.key && <div className="archive-entries">
          {entries.map((entry) => <article className="diary-panel archive-entry" id={`archive-entry-${entry.id}`} key={entry.id}>
            <button type="button" className="archive-entry-toggle" aria-expanded={openEntry === entry.id}
              onClick={() => setOpenEntry(openEntry === entry.id ? null : entry.id)}>
              <span><small>{fullDate(entry.date)}</small><strong>{activityTitle(entry)}</strong></span>
              <span aria-hidden="true">{openEntry === entry.id ? '⌃' : '⌄'}</span>
            </button>
            {openEntry === entry.id && <ActivityDetails entry={entry} />}
          </article>)}
        </div>}
      </section>
    })}
  </div>
}
