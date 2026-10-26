import { useState } from 'react'
import ActivityDetails from './ActivityDetails.jsx'
import EntryWindow from './EntryWindow.jsx'
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

export default function ArchiveView({ sessions, volleyballDays, target = null, trainingOnly = false, layer = 0 }) {
  const [filter, setFilter] = useState(trainingOnly ? 'training' : target?.type ?? 'all')
  const [openMonth, setOpenMonth] = useState(target?.date.slice(0, 7) ?? null)
  const [openEntry, setOpenEntry] = useState(target?.id ?? null)
  const months = monthlyArchive(sessions, trainingOnly ? [] : volleyballDays, !trainingOnly)
  const selectedMonth = months.find((month) => month.key === openMonth)
  const selectedEntry = selectedMonth?.entries.find((entry) => entry.id === openEntry)

  return <div className="archive-view">
    <p className="helper-text">{trainingOnly
      ? 'Alle dokumentierten Trainingseinheiten, auch offene, nach Monaten geordnet.'
      : 'Alle abgeschlossenen Spieltage und Trainingseinheiten, nach Monaten geordnet.'}</p>
    {!trainingOnly && <div className="archive-filters" role="group" aria-label="Archiv filtern">
      {filters.map(([value, label]) => <button key={value} type="button"
        className={filter === value ? 'primary-button' : 'secondary-button'}
        aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>}
    {!months.length && <p className="helper-text">{trainingOnly ? 'Noch keine Trainings dokumentiert.' : 'Noch keine abgeschlossenen Einträge vorhanden.'}</p>}
    {months.filter((month) => filter === 'all' || month.counts[filter] > 0).map((month) =>
      <section className="diary-panel archive-month" key={month.key}>
        <button type="button" className="archive-month-toggle" onClick={() => setOpenMonth(month.key)}>
          <strong>{monthName(month.key)}</strong><span aria-hidden="true">›</span>
        </button>
        <p className="archive-counts">{trainingOnly
          ? `${month.counts.training} Trainingseinheiten`
          : `${month.counts.training} Training · ${month.counts.beach} Beach · ${month.counts.indoor} Halle`}</p>
      </section>)}
    {selectedMonth && <EntryWindow title={monthName(selectedMonth.key)} subtitle="DEIN ARCHIV" layer={layer + 1}
      onClose={() => { setOpenEntry(null); setOpenMonth(null) }}>
      <div className="archive-entries">
        {selectedMonth.entries.filter((entry) => filter === 'all' || entry.type === filter)
          .map((entry) => <article className="diary-panel archive-entry" key={entry.id}>
            <button type="button" className="archive-entry-toggle" onClick={() => setOpenEntry(entry.id)}>
              <span><small>{fullDate(entry.date)}</small><strong>{activityTitle(entry)}</strong></span>
              <span aria-hidden="true">›</span>
            </button>
          </article>)}
      </div>
    </EntryWindow>}
    {selectedEntry && <EntryWindow title={activityTitle(selectedEntry)} subtitle={fullDate(selectedEntry.date)} layer={layer + 2}
      onClose={() => setOpenEntry(null)}>
      <ActivityDetails entry={selectedEntry} />
    </EntryWindow>}
  </div>
}
