import { useState } from 'react'
import { activityEntries, activityTitle, localDate } from './activityHistory.js'
import { calendarDayActivity, isRecoveryDay, RECOVERY_DAY } from './calendarActivities.js'
import { trainingDayPerformances } from './calendarPerformance.js'
import { isOpenTraining } from './trainingModel.js'
import EntryWindow from './EntryWindow.jsx'
import PerformanceGraph from './PerformanceGraph.jsx'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const performanceLabels = { 'strong-decline': 'Starker Rückgang', decline: 'Rückgang',
  unchanged: 'Keine Änderung', improved: 'Verbesserung',
  'strong-improved': 'Starke Verbesserung' }
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

function SteelDumbbell() {
  return <svg className="home-steel-dumbbell" viewBox="0 0 32 22" role="img" aria-label="Krafttraining">
    <rect x="3" y="9" width="26" height="4" rx="2" fill="#dbe2e7" />
    <rect x="1" y="7" width="4" height="8" rx="1.2" fill="#9baab4" />
    <rect x="5" y="4" width="6" height="14" rx="1.5" fill="#c6d0d7" />
    <rect x="21" y="4" width="6" height="14" rx="1.5" fill="#c6d0d7" />
    <rect x="27" y="7" width="4" height="8" rx="1.2" fill="#9baab4" />
    <path d="M6 5h4m12 0h4" stroke="#f5f8fa" strokeWidth="1" strokeLinecap="round" />
  </svg>
}

export default function HomeCalendar({ sessions, volleyballDays, onOpenActivity, onCreateEntry, expanded = false }) {
  const [month, setMonth] = useState(() => localDate().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEntryChoices, setShowEntryChoices] = useState(false)
  const entries = activityEntries(sessions, volleyballDays)
  const trainingPerformance = trainingDayPerformances(sessions)
  const byDate = new Map()
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, [])
    byDate.get(entry.date).push(entry)
  }
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const dayEntries = byDate.get(selectedDate) ?? []
  const selectedRecovery = isRecoveryDay(selectedDate, dayEntries)
  const selectedPerformance = trainingPerformance.get(selectedDate)
  const volleyballDateTaken = volleyballDays.some((day) => day.date === selectedDate)
  const trainingOpen = sessions.some(isOpenTraining)

  return <><section className={`home-widget home-calendar${expanded ? ' home-calendar-expanded' : ''}`} aria-label="Sportkalender">
    <div className="home-widget-header"><div>
      <span className="home-widget-kicker">DEIN MONAT</span>
      <span className="home-widget-title">Sportkalender</span>
    </div></div>
    <div className="home-month-navigation">
      <button type="button" aria-label="Vorheriger Monat" onClick={() => { setMonth(shiftMonth(month, -1)); setSelectedDate(null); setShowEntryChoices(false) }}>‹</button>
      <strong>{monthLabel}</strong>
      <button type="button" aria-label="Nächster Monat" onClick={() => { setMonth(shiftMonth(month, 1)); setSelectedDate(null); setShowEntryChoices(false) }}>›</button>
    </div>
    <div className="home-calendar-grid">
      {WEEKDAYS.map((day) => <span className="home-weekday" key={day}>{day}</span>)}
      {monthCells(month).map((date, index) => {
        if (!date) return <span key={`empty-${index}`} />
        const dayEntries = byDate.get(date) ?? []
        const activity = calendarDayActivity(dayEntries)
        const recovery = isRecoveryDay(date, dayEntries)
        const performance = trainingPerformance.get(date)
        return <button className={`home-calendar-day${dayEntries.length ? ' has-activity' : ''}${recovery ? ' is-recovery' : ''}${date === localDate() ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`}
          type="button" key={date} aria-pressed={date === selectedDate}
          aria-label={`${formatDate(date)}${recovery ? `, ${RECOVERY_DAY.label}` : dayEntries.length ? `, ${dayEntries.length} ${dayEntries.length === 1 ? 'Eintrag' : 'Einträge'}: ${activity?.label ?? 'Aktivität'}` : ''}${!recovery && performanceLabels[performance?.status] ? `, ${performanceLabels[performance.status]}` : ''}`}
          onClick={() => { setSelectedDate(date); setShowEntryChoices(false) }}>
          <span className="home-calendar-number">{Number(date.slice(-2))}</span>
          <span className="home-calendar-activity" aria-hidden="true">
            {recovery ? RECOVERY_DAY.emoji : activity?.icon === 'barbell' ? <SteelDumbbell /> : activity?.emoji}
          </span>
          {!recovery && <span className={`home-calendar-performance${performance?.status && performance.status !== 'unrated' ? ` is-${performance.status}` : ''}`}
            aria-hidden="true">{performance?.status === 'unchanged' ? '−' : <PerformanceGraph status={performance?.status} />}</span>}
        </button>
      })}
    </div>
    <div className="home-calendar-legend" aria-label="Kalendersymbole">
      <span><PerformanceGraph status="strong-decline" /> Starker Rückgang</span>
      <span><PerformanceGraph status="decline" /> Rückgang</span>
      <span><i className="performance-minus">−</i> Keine Änderung</span>
      <span><PerformanceGraph status="improved" /> Verbesserung</span>
      <span><PerformanceGraph status="strong-improved" /> Starke Verbesserung</span>
      <span>🌿 Regeneration</span>
    </div>
    <p className="home-calendar-hint">Das große Symbol zeigt den Vergleich mit früheren Trainings. Tage ohne Eintrag bis heute gelten automatisch als Regeneration. Volleyballspiele und Volleyballtraining bleiben vorerst ohne Wertung.</p>
    <details className="home-calendar-method">
      <summary>Wie entsteht die Wertung?</summary>
      <p>Jede abgeschlossene Übung wird über ihre ID mit ihrer letzten Ausführung verglichen. Jede vergleichbare Übung zählt gleich viel zum Tagesdurchschnitt: bis −15 % starker Rückgang, unter −5 % Rückgang, von −5 % bis +5 % keine Änderung, über +5 % Verbesserung und ab +15 % starke Verbesserung.</p>
      <p>Bei Kraftübungen wird der beste Satz der aktuellen Ausführung mit dem besten Satz der letzten Ausführung derselben Übungs-ID verglichen. Der Satzwert kombiniert Gewicht und Wiederholungen; gemeint ist nicht der persönliche Bestwert aller Zeiten. Bei Sprüngen zählt die gemessene Höhe, bei Core-Halteübungen die Dauer und bei Ausdauer mit gleicher Distanz das Tempo. Fehlt ein vergleichbarer Messwert, bleibt der Tag ohne Leistungswertung.</p>
    </details>
  </section>
    {selectedDate && <EntryWindow compact title={formatDate(selectedDate)} subtitle="DEIN KALENDERTAG"
      onClose={() => { setSelectedDate(null); setShowEntryChoices(false) }}>
      <div className="home-day-details home-day-dialog">
      {!selectedRecovery && selectedPerformance && <p className="home-day-performance">
        {selectedPerformance.status === 'unrated' ? 'Noch keine vergleichbare frühere Übung für eine Tageswertung.'
          : `${performanceLabels[selectedPerformance.status]} · Durchschnitt ${percent(selectedPerformance.changePercent)} aus ${selectedPerformance.comparisons.length} von ${selectedPerformance.total} Übungen.`}
      </p>}
      {!selectedRecovery && selectedPerformance?.comparisons.length > 0 && <ul className="home-performance-breakdown">
        {selectedPerformance.comparisons.map((comparison) => <li key={comparison.libraryId}>
          <span>{comparison.name}<small>gegen {formatDate(comparison.previousDate)}</small></span>
          <strong>{percent(comparison.changePercent)}</strong>
        </li>)}
      </ul>}
      {selectedRecovery && <p className="helper-text">Regenerationstag – keine sportliche Aktivität erfasst.</p>}
      {!dayEntries.length && !selectedRecovery && <p className="helper-text">Für diesen Tag ist noch nichts eingetragen.</p>}
      {dayEntries.map((entry) => <article className="diary-panel home-day-entry" key={entry.id}>
        <a className="home-activity-link" href={`#${entry.type}`}
          onClick={(event) => { event.preventDefault(); onOpenActivity(entry) }}>
          <strong>{activityTitle(entry)}</strong><span aria-hidden="true">↗</span>
        </a>
      </article>)}
      <div className="home-new-entry">
        <button type="button" className="secondary-button" aria-expanded={showEntryChoices}
          onClick={() => setShowEntryChoices((open) => !open)}>＋ Neuer Eintrag</button>
        {showEntryChoices && <div className="home-entry-choices" role="group" aria-label="Art des neuen Eintrags">
          <p>Was möchtest du für diesen Tag erfassen?</p>
          <button type="button" className="secondary-button" disabled={volleyballDateTaken}
            onClick={() => onCreateEntry('beach', selectedDate)}>🏖️ Beachvolleyball</button>
          <button type="button" className="secondary-button" disabled={volleyballDateTaken}
            onClick={() => onCreateEntry('indoor', selectedDate)}>🏟️ Hallenvolleyball</button>
          <button type="button" className="secondary-button" disabled={trainingOpen}
            onClick={() => onCreateEntry('training', selectedDate)}>💪 Training</button>
          {volleyballDateTaken && <p className="helper-text">An diesem Datum gibt es bereits einen Beach- oder Hallenspieltag.</p>}
          {trainingOpen && <p className="helper-text">Schließe zuerst dein offenes Training ab, bevor du ein neues beginnst.</p>}
        </div>}
      </div>
      </div>
    </EntryWindow>}
  </>
}
