import { useMemo, useState } from 'react'
import { activityEntries, activityTitle, isOpenVolleyballDay } from './activityHistory.js'
import { isOpenTraining } from './trainingModel.js'
import { greetingName, weekSummary } from './homeSummary.js'
import HomeDayStrip from './HomeDayStrip.jsx'
import UIIcon from './UIIcon.jsx'

const format = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', options)
const shortDate = (date) => format(date, { day: 'numeric', month: 'long' })

export default function HomeDashboard({ sessions, volleyballDays, today, accountEmail,
  onFeature, onOpenActivity, onCreateEntry }) {
  const [chosenDate, setChosenDate] = useState(null)
  const selectedDate = chosenDate?.startsWith(today.slice(0, 7)) ? chosenDate : today
  const entries = useMemo(() => activityEntries(sessions, volleyballDays), [sessions, volleyballDays])
  const entryDates = useMemo(() => new Set(entries.map((entry) => entry.date)), [entries])
  const dayEntries = entries.filter((entry) => entry.date === selectedDate)
  const openTraining = entries.find((entry) => entry.type === 'training' && isOpenTraining(entry.item))
  const week = useMemo(() => weekSummary(sessions, volleyballDays, selectedDate), [sessions, volleyballDays, selectedDate])
  const name = greetingName(accountEmail)

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

    <HomeDayStrip key={today.slice(0, 7)} today={today} selectedDate={selectedDate}
      entryDates={entryDates} onSelect={setChosenDate}
      onOpenCalendar={() => onFeature('calendar', selectedDate)} />

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
