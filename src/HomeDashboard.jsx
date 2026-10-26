import { useMemo } from 'react'
import { activityEntries, activityTitle, isOpenVolleyballDay } from './activityHistory.js'
import { isOpenTraining } from './trainingModel.js'
import { weekSummary } from './homeSummary.js'
import PlayerCardArt from './PlayerCardArt.jsx'
import UIIcon from './UIIcon.jsx'
import HomeDayStrip from './HomeDayStrip.jsx'

const format = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', options)
const shortDate = (date) => format(date, { day: 'numeric', month: 'long' })

export default function HomeDashboard({ sessions, volleyballDays, today, selectedDate, entryDates, onSelectDate, cardScore, cardAttributes, athleteProfile,
  onFeature, onOpenActivity, onCreateEntry }) {
  const entries = useMemo(() => activityEntries(sessions, volleyballDays), [sessions, volleyballDays])
  const dayEntries = entries.filter((entry) => entry.date === selectedDate)
  const openTraining = entries.find((entry) => entry.type === 'training' && isOpenTraining(entry.item))
  const volleyballEntry = dayEntries.find((entry) => entry.type === 'beach' || entry.type === 'indoor')
  const week = useMemo(() => weekSummary(sessions, volleyballDays, selectedDate), [sessions, volleyballDays, selectedDate])

  function beginTraining() {
    if (openTraining) onOpenActivity(openTraining)
    else onCreateEntry('training', selectedDate)
  }

  function beginVolleyball(type) {
    if (volleyballEntry) onOpenActivity(volleyballEntry)
    else onCreateEntry(type, selectedDate)
  }

  return <div className="home-dashboard" aria-label="Startseite">
    <HomeDayStrip key={today.slice(0, 7)} today={today} selectedDate={selectedDate}
      entryDates={entryDates} onSelect={onSelectDate} />
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
      <div className="home-quick-actions" aria-label="Tag erfassen">
        <span className="home-quick-plus" aria-hidden="true"><UIIcon name="plus" /></span>
        <button type="button" className="home-quick-beach" disabled={volleyballEntry?.type === 'indoor'}
          title={volleyballEntry?.type === 'indoor' ? 'Für diesen Tag gibt es bereits einen Hallenspieltag' : undefined}
          onClick={() => beginVolleyball('beach')}><UIIcon name="beach" /><span>Beach</span></button>
        <button type="button" className="home-quick-indoor" disabled={volleyballEntry?.type === 'beach'}
          title={volleyballEntry?.type === 'beach' ? 'Für diesen Tag gibt es bereits einen Beachspieltag' : undefined}
          onClick={() => beginVolleyball('indoor')}><UIIcon name="ball" /><span>Halle</span></button>
        <button type="button" className="home-quick-training" onClick={beginTraining}>
          <UIIcon name="training" /><span>Training</span></button>
      </div>
    </section>

    <section className="home-week-card" aria-labelledby="home-week-title">
      <div className="home-week-heading"><h2 id="home-week-title">Deine Woche</h2>
        <div className="home-week-links">
          <button type="button" onClick={() => onFeature('more', selectedDate)}>Mehr</button>
          <button type="button" onClick={() => onFeature('statistics')}>Details<UIIcon name="chevron" /></button>
        </div></div>
      <div className="home-week-metrics" aria-label={`Abgeschlossene Aktivitäten vom ${shortDate(week.start)} bis ${shortDate(week.end)}`}>
        <div><UIIcon name="training" /><strong>{week.sessions}</strong><span>Einheiten</span></div>
        <div title="Erfasste Dauer abgeschlossener Trainings"><UIIcon name="clock" /><strong>{week.minutes == null ? '—' : `${Math.floor(week.minutes / 60)}:${String(week.minutes % 60).padStart(2, '0')}`}<small>{week.minutes == null ? '' : ' h'}</small></strong><span>Trainingszeit</span></div>
        <div><UIIcon name="ball" /><strong>{week.gameDays}</strong><span>{week.gameDays === 1 ? 'Spieltag' : 'Spieltage'}</span></div>
      </div>
    </section>

    <section className="home-athlete-preview" aria-labelledby="home-athlete-title">
      <div className="home-athlete-heading">
        <div><p className="eyebrow">DEIN PROFIL</p><h2 id="home-athlete-title">Athlete Card</h2></div>
        <button type="button" onClick={() => onFeature('card')}>
          Ansehen <UIIcon name="chevron" />
        </button>
      </div>
      <PlayerCardArt score={cardScore} profile={athleteProfile} attributes={cardAttributes} preview />
    </section>
  </div>
}
