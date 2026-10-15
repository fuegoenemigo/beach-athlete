import { useMemo, useState } from 'react'
import { activityEntries, activityTitle, isOpenVolleyballDay } from './activityHistory.js'
import { isOpenTraining } from './trainingModel.js'
import { fiveDayStart, greetingName, shiftDate, weekSummary } from './homeSummary.js'
import UIIcon from './UIIcon.jsx'

const format = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', options)
const fullDate = (date) => format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (date) => format(date, { day: 'numeric', month: 'long' })

export default function HomeDashboard({ sessions, volleyballDays, today, accountEmail,
  onFeature, onOpenActivity, onCreateEntry }) {
  const [chosenDate, setChosenDate] = useState(null)
  const [chosenStart, setChosenStart] = useState(null)
  const selectedDate = chosenDate ?? today
  const start = chosenStart ?? fiveDayStart(today)
  const dates = Array.from({ length: 5 }, (_, index) => shiftDate(start, index))
  const entries = useMemo(() => activityEntries(sessions, volleyballDays), [sessions, volleyballDays])
  const dayEntries = entries.filter((entry) => entry.date === selectedDate)
  const openTraining = entries.find((entry) => entry.type === 'training' && isOpenTraining(entry.item))
  const week = useMemo(() => weekSummary(sessions, volleyballDays, selectedDate), [sessions, volleyballDays, selectedDate])
  const name = greetingName(accountEmail)

  function moveDays(offset) {
    setChosenStart(shiftDate(start, offset))
    setChosenDate(shiftDate(selectedDate, offset))
  }

  function beginTraining(category) {
    if (openTraining) onOpenActivity(openTraining)
    else onCreateEntry('training', selectedDate, category)
  }

  return <div className="home-dashboard" aria-label="Startseite">
    <header className="home-greeting">
      <div><h1>Hallo,<span>{name}.</span></h1>
        <p>Bereit, deinen Tag zu gestalten?</p></div>
      <button type="button" className="home-avatar" onClick={() => onFeature('profile')}
        aria-label="Mein Profil öffnen" title={accountEmail || 'Mein Profil'}>{name.charAt(0)}</button>
    </header>

    <section className="home-five-days" aria-label="Kalender mit fünf Tagen">
      <div className="home-five-days-heading">
        <button type="button" className="home-month-pill" onClick={() => onFeature('calendar', selectedDate)}
          aria-label="Monatskalender öffnen">{format(selectedDate, { month: 'long' })}<UIIcon name="down" /></button>
        <div className="home-date-controls">
          {selectedDate !== today && <button type="button" className="home-today-link"
            onClick={() => { setChosenDate(null); setChosenStart(null) }}>Heute</button>}
          <button type="button" className="home-date-arrow is-previous" aria-label="Vorherige fünf Tage" onClick={() => moveDays(-5)}><UIIcon name="chevron" /></button>
          <button type="button" className="home-date-arrow" aria-label="Nächste fünf Tage" onClick={() => moveDays(5)}><UIIcon name="chevron" /></button>
        </div>
      </div>
      <div className="home-five-days-grid">
        {dates.map((date) => <button type="button" key={date}
          className={`home-date${date === selectedDate ? ' is-selected' : ''}`}
          aria-pressed={date === selectedDate} aria-current={date === today ? 'date' : undefined}
          aria-label={`${fullDate(date)}${entries.some((entry) => entry.date === date) ? ', mit Einträgen' : ''}`}
          onClick={() => setChosenDate(date)}>
          <span>{format(date, { weekday: 'short' }).replace('.', '')}</span>
          <strong>{Number(date.slice(-2))}</strong>
          <i className={entries.some((entry) => entry.date === date) ? 'has-entries' : ''} aria-hidden="true" />
        </button>)}
      </div>
    </section>

    <section className="home-today-card" aria-labelledby="home-today-title">
      <div className="home-today-heading">
        <div><h2 id="home-today-title">{selectedDate === today ? 'Heute' : format(selectedDate, { weekday: 'long' })}</h2>
          <p>{shortDate(selectedDate)}</p></div>
        <span className="home-day-count">{dayEntries.length ? `${dayEntries.length} ${dayEntries.length === 1 ? 'Eintrag' : 'Einträge'}` : 'Noch kein Eintrag'}</span>
      </div>
      {dayEntries.length > 0 && <div className="home-today-entries" aria-label="Einträge am ausgewählten Tag">
        {dayEntries.map((entry) => <button type="button" key={entry.id} onClick={() => onOpenActivity(entry)}>
          <UIIcon name={entry.type === 'training' ? 'training' : entry.type === 'beach' ? 'beach' : 'ball'} />
          <span>{activityTitle(entry)}<small>{(entry.type === 'training' ? isOpenTraining(entry.item) : isOpenVolleyballDay(entry.item)) ? 'Offen · Ansehen und fortsetzen' : 'Abgeschlossen · Ansehen'}</small></span>
          <UIIcon name="chevron" />
        </button>)}
      </div>}
      <button type="button" className="home-record" onClick={() => beginTraining()}>
        <span className="home-record-plus"><UIIcon name={openTraining ? 'training' : 'plus'} /></span>
        <span><strong>{openTraining ? 'Training fortsetzen' : 'Training erfassen'}</strong>
          <small>{openTraining ? 'Deine offene Einheit ist bereit.' : 'Einheit, Dauer und Übungen festhalten'}</small></span>
        <UIIcon name="chevron" />
      </button>
      <div className="home-quick-actions" aria-label="Schnellzugriffe">
        {[['Kraft', 'training', 'Krafttraining'], ['Ausdauer', 'run', 'Ausdauer'], ['Mobility', 'mobility', 'Core und Mobility']].map(([label, icon, category]) =>
          <button type="button" key={label} disabled={Boolean(openTraining)} onClick={() => beginTraining(category)}>
            <UIIcon name={icon} /><span>{label}</span>
          </button>)}
        <button type="button" onClick={() => onFeature('more', selectedDate)}><UIIcon name="more" /><span>Mehr</span></button>
      </div>
    </section>

    <section className="home-week-card" aria-labelledby="home-week-title">
      <div className="home-week-heading"><h2 id="home-week-title">Deine Woche</h2>
        <button type="button" onClick={() => onFeature('statistics')}>Details<UIIcon name="chevron" /></button></div>
      <div className="home-week-metrics" aria-label={`Abgeschlossene Aktivitäten vom ${shortDate(week.start)} bis ${shortDate(week.end)}`}>
        <div><UIIcon name="training" /><strong>{week.sessions}</strong><span>Einheiten</span></div>
        <div title="Erfasste Dauer abgeschlossener Trainings"><UIIcon name="clock" /><strong>{week.minutes == null ? '—' : `${Math.floor(week.minutes / 60)}:${String(week.minutes % 60).padStart(2, '0')}`}<small>{week.minutes == null ? '' : ' h'}</small></strong><span>Trainingszeit</span></div>
        <div><UIIcon name="ball" /><strong>{week.gameDays}</strong><span>{week.gameDays === 1 ? 'Spieltag' : 'Spieltage'}</span></div>
      </div>
    </section>
  </div>
}
