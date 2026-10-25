import { useMemo, useState } from 'react'
import EntryWindow from './EntryWindow.jsx'
import ArchiveView from './ArchiveView.jsx'
import StatisticsView from './StatisticsView.jsx'
import { trainingProgress } from './trainingProgress.js'
import { athleteRating } from './athleteRating.js'
import HomeDashboard from './HomeDashboard.jsx'
import PlayerCardArt from './PlayerCardArt.jsx'
import UIIcon from './UIIcon.jsx'
import ProfileForm from './ProfileForm.jsx'
import './HomeView.css'

const FEATURES = {
  statistics: {
    icon: '📊',
    title: 'Statistiken',
    text: 'Deine fünf athletischen Werte starten bei 60 und entwickeln sich mit deinem Training. Die Bewertungsregeln für Beach und Halle legen wir anschließend gemeinsam fest.',
  },
  card: {
    icon: '🏅',
    title: 'Spielerkarte',
    text: 'Deine athletische Spielerkarte nutzt dieselben Werte wie die Trainingsstatistik. Spielergebnisse und Volleyball-Technik fließen nicht ein.',
  },
}

export default function HomeView({ children, athleteProfile, setAthleteProfile,
  sessions, volleyballDays, today, selectedDate, entryDates, onSelectDate, initialView = null, archiveTarget = null, onOpenActivity, onCreateEntry,
  onExit = null }) {
  const [featureStack, setFeatureStack] = useState(initialView ? [initialView] : [])
  const selectedFeature = featureStack.at(-1)
  const [focusedArchiveTarget, setFocusedArchiveTarget] = useState(archiveTarget)
  const [featureDate, setFeatureDate] = useState(null)
  const training = useMemo(() => trainingProgress(sessions), [sessions])
  const rating = useMemo(() => athleteRating(sessions, athleteProfile, today),
    [sessions, athleteProfile, today])
  function openFeature(feature, date = today) {
    setFeatureDate(date)
    setFocusedArchiveTarget(null)
    setFeatureStack((stack) => [...stack, feature])
    document.querySelector('.app-scroll-region')?.scrollTo({ top: 0, behavior: 'instant' })
  }
  const openEntry = (entry) => onOpenActivity(entry, selectedFeature)
  const createEntry = (type, date, category) => onCreateEntry(type, date, category, selectedFeature)
  const goBack = () => {
    if (featureStack.length === 1 && onExit) onExit()
    else setFeatureStack((stack) => stack.slice(0, -1))
  }
  const dashboard = <HomeDashboard sessions={sessions} volleyballDays={volleyballDays} today={today}
    selectedDate={selectedDate} entryDates={entryDates} onSelectDate={onSelectDate} cardScore={rating.overall.score} onFeature={openFeature}
    onOpenActivity={openEntry} onCreateEntry={createEntry} />

  if (selectedFeature) {
    if (selectedFeature === 'more') return <>{dashboard}<EntryWindow key="more" title="Deine Bereiche" subtitle="BEACH ATHLETE"
      onClose={goBack}>
      <div className="home-feature-menu">
        {[
          ['statistics', 'chart', 'Statistiken', 'Deine Entwicklung im Detail'],
          ['card', 'card', 'Spielerkarte', 'Deine athletischen Werte'],
          ['archive', 'archive', 'Archiv', 'Alle abgeschlossenen Einträge'],
          ['profile', 'profile', 'Mein Profil', 'Konto und Datensicherung'],
        ].map(([id, icon, title, description]) => <button type="button" key={id} onClick={() => openFeature(id, featureDate)}>
          <UIIcon name={icon} /><span><strong>{title}</strong><small>{description}</small></span><UIIcon name="chevron" />
        </button>)}
      </div>
      <p className="helper-text">Spieltag erfassen · {new Date(`${featureDate}T12:00:00`).toLocaleDateString('de-DE')}</p>
      <div className="home-menu-sports">
        <button type="button" className="secondary-button" disabled={volleyballDays.some((day) => day.date === featureDate)}
          onClick={() => createEntry('beach', featureDate)}><UIIcon name="beach" /> Beach</button>
        <button type="button" className="secondary-button" disabled={volleyballDays.some((day) => day.date === featureDate)}
          onClick={() => createEntry('indoor', featureDate)}><UIIcon name="ball" /> Halle</button>
      </div>
      {volleyballDays.some((day) => day.date === featureDate) && <p className="helper-text">An diesem Datum gibt es bereits einen Spieltag. Du kannst ihn über die Monatsansicht auf der Startseite öffnen.</p>}
    </EntryWindow></>
    if (selectedFeature === 'profile' || selectedFeature === 'archive') return (
      <>{dashboard}<EntryWindow key={selectedFeature} title={selectedFeature === 'profile' ? 'Mein Profil' : 'Archiv'}
        subtitle={selectedFeature === 'profile' ? 'DEIN KONTO' : 'DEINE EINTRÄGE'}
        onClose={goBack}>
      <section className="home-functional-detail">
        {selectedFeature === 'profile' ? <>
          <section className="home-profile-card" aria-labelledby="personal-data-title">
            <h3 id="personal-data-title">Persönliche Daten</h3>
            <ProfileForm profile={athleteProfile}
              onSave={(values) => setAthleteProfile((profile) => ({ ...profile, ...values }))} />
          </section>
          {children}
        </> : <ArchiveView sessions={sessions} volleyballDays={volleyballDays} target={focusedArchiveTarget} />}
      </section>
      </EntryWindow></>
    )
    const feature = FEATURES[selectedFeature]
    return (
      <>{dashboard}<EntryWindow key={selectedFeature} title={feature.title} subtitle="DEINE ENTWICKLUNG"
        onClose={goBack}>
      <section className="home-detail" aria-labelledby="home-detail-title">
        <div className="home-detail-icon" aria-hidden="true">{feature.icon}</div>
        <p className="eyebrow">DEINE ENTWICKLUNG</p>
        <h2 id="home-detail-title">{feature.title}</h2>
        <p>{feature.text}</p>
        {selectedFeature === 'statistics' && <StatisticsView training={rating} progress={training} />}
        {selectedFeature === 'card' && <div className="player-card-detail">
          <PlayerCardArt score={rating.overall.score} />
          <div className="player-card-attributes">
            {rating.attributes.map((attribute) => <div key={attribute.id}>
              <span>{attribute.name}</span><strong>{Math.round(attribute.score)}</strong>
            </div>)}
          </div>
          <p>Startwert 60 · maximal 99. Über 80 wächst jeder Wert um höchstens zwei Punkte pro Woche. Nach je elf vollen Tagen ohne passendes Training sinkt der jeweilige Wert um einen Punkt, nie unter 60. Körpergewicht wird bei geeigneten Kraftübungen berücksichtigt; regelmäßige Mobility-Einheiten zählen zur Körperkontrolle.</p>
        </div>}
      </section>
      </EntryWindow></>
    )
  }

  return dashboard
}
