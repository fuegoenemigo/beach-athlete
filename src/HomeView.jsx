import { useEffect, useMemo, useState } from 'react'
import HomeCalendar from './HomeCalendar.jsx'
import EntryWindow from './EntryWindow.jsx'
import ArchiveView from './ArchiveView.jsx'
import StatisticsView from './StatisticsView.jsx'
import { trainingProgress } from './trainingProgress.js'
import { athleteRating } from './athleteRating.js'
import HomeDashboard from './HomeDashboard.jsx'
import UIIcon from './UIIcon.jsx'
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
  sessions, volleyballDays, accountEmail, initialView = null, archiveTarget = null, onOpenActivity, onCreateEntry }) {
  const [selectedFeature, setSelectedFeature] = useState(initialView)
  const [focusedArchiveTarget, setFocusedArchiveTarget] = useState(archiveTarget)
  const [ratingDate, setRatingDate] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const [featureDate, setFeatureDate] = useState(null)
  useEffect(() => {
    const refreshDate = () => setRatingDate(new Date().toLocaleDateString('sv-SE'))
    const timer = window.setInterval(refreshDate, 60_000)
    document.addEventListener('visibilitychange', refreshDate)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshDate) }
  }, [])
  const training = useMemo(() => trainingProgress(sessions), [sessions])
  const rating = useMemo(() => athleteRating(sessions, athleteProfile, ratingDate),
    [sessions, athleteProfile, ratingDate])
  function openFeature(feature, date = ratingDate) {
    setFeatureDate(date)
    setFocusedArchiveTarget(null)
    setSelectedFeature(feature)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (selectedFeature) {
    if (selectedFeature === 'calendar') return <section className="home-calendar-page">
      <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>← Zur Startseite</button>
      <HomeCalendar sessions={sessions} volleyballDays={volleyballDays} initialDate={featureDate ?? ratingDate}
        onOpenActivity={onOpenActivity} onCreateEntry={onCreateEntry} />
    </section>
    if (selectedFeature === 'more') return <EntryWindow compact title="Deine Bereiche" subtitle="BEACH ATHLETE"
      onClose={() => setSelectedFeature(null)}>
      <div className="home-feature-menu">
        {[
          ['calendar', 'calendar', 'Sportkalender', 'Alle Tage und Einträge'],
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
          onClick={() => onCreateEntry('beach', featureDate)}><UIIcon name="beach" /> Beach</button>
        <button type="button" className="secondary-button" disabled={volleyballDays.some((day) => day.date === featureDate)}
          onClick={() => onCreateEntry('indoor', featureDate)}><UIIcon name="ball" /> Halle</button>
      </div>
      {volleyballDays.some((day) => day.date === featureDate) && <p className="helper-text">An diesem Datum gibt es bereits einen Spieltag. Du kannst ihn über den Kalender öffnen.</p>}
    </EntryWindow>
    if (selectedFeature === 'profile' || selectedFeature === 'archive') return (
      <EntryWindow title={selectedFeature === 'profile' ? 'Mein Profil' : 'Archiv'}
        subtitle={selectedFeature === 'profile' ? 'DEIN KONTO' : 'DEINE EINTRÄGE'}
        onClose={() => setSelectedFeature(null)}>
      <section className="home-detail home-functional-detail">
        <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>
          ← Zur Startseite
        </button>
        {selectedFeature === 'profile' ? <>
          <p className="eyebrow">DEIN KONTO</p>
          <h2>Mein Profil</h2>
          <section className="home-profile-card" aria-labelledby="personal-data-title">
            <h3 id="personal-data-title">Persönliche Daten</h3>
            <p>Größe und Körpergewicht stehen für deine spätere Auswertung bereit. Dein Körpergewicht erscheint außerdem bei Übungen mit Eigengewicht.</p>
            <label className="field-label" htmlFor="profile-bodyweight">Körpergewicht (kg)</label>
            <input id="profile-bodyweight" className="field" type="number" inputMode="decimal"
              min="1" step="0.1" placeholder="Noch nicht hinterlegt"
              value={athleteProfile.bodyweightKg ?? ''}
              onChange={(event) => {
                const value = event.target.value
                if (value === '' || (Number.isFinite(Number(value)) && Number(value) > 0))
                  setAthleteProfile((profile) => ({ ...profile, bodyweightKg: value }))
              }} />
            <label className="field-label" htmlFor="profile-height">Körpergröße (cm)</label>
            <input id="profile-height" className="field" type="number" inputMode="decimal"
              min="1" max="300" step="0.1" placeholder="Noch nicht hinterlegt"
              value={athleteProfile.heightCm ?? ''}
              onChange={(event) => {
                const value = event.target.value
                if (value === '' || (Number.isFinite(Number(value)) && Number(value) > 0
                  && Number(value) <= 300))
                  setAthleteProfile((profile) => ({ ...profile, heightCm: value }))
              }} />
          </section>
          {children}
        </> : <ArchiveView sessions={sessions} volleyballDays={volleyballDays} target={focusedArchiveTarget} />}
      </section>
      </EntryWindow>
    )
    const feature = FEATURES[selectedFeature]
    return (
      <EntryWindow title={feature.title} subtitle="DEINE ENTWICKLUNG"
        onClose={() => setSelectedFeature(null)}>
      <section className="home-detail" aria-labelledby="home-detail-title">
        <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>
          ← Zur Startseite
        </button>
        <div className="home-detail-icon" aria-hidden="true">{feature.icon}</div>
        <p className="eyebrow">DEINE ENTWICKLUNG</p>
        <h2 id="home-detail-title">{feature.title}</h2>
        <p>{feature.text}</p>
        {selectedFeature === 'statistics' && <StatisticsView training={rating} progress={training} />}
        {selectedFeature === 'card' && <div className="player-card-detail">
          <div className="home-card-art" aria-label={`Gesamtwert ${Math.round(rating.overall.score)} von 99`}>
            <span className="home-card-topline">BEACH ATHLETE <span>✦</span> PLAYER CARD</span>
            <span className="home-card-center"><span className="home-card-crest">BA</span>
              <span className="home-card-rating">{Math.round(rating.overall.score)} <small>GES</small></span></span>
            <span className="home-card-name">DEINE KARTE</span>
            <span className="home-card-divider" />
            <span className="home-card-bottom">DEINE DATEN. DEINE ENTWICKLUNG.</span>
          </div>
          <div className="player-card-attributes">
            {rating.attributes.map((attribute) => <div key={attribute.id}>
              <span>{attribute.name}</span><strong>{Math.round(attribute.score)}</strong>
            </div>)}
          </div>
          <p>Startwert 60 · maximal 99. Über 80 wächst jeder Wert um höchstens zwei Punkte pro Woche. Nach je elf vollen Tagen ohne passendes Training sinkt der jeweilige Wert um einen Punkt, nie unter 60. Körpergewicht wird bei geeigneten Kraftübungen berücksichtigt; regelmäßige Mobility-Einheiten zählen zur Körperkontrolle.</p>
        </div>}
      </section>
      </EntryWindow>
    )
  }

  return <HomeDashboard sessions={sessions} volleyballDays={volleyballDays} today={ratingDate}
    accountEmail={accountEmail} onFeature={openFeature}
    onOpenActivity={onOpenActivity} onCreateEntry={onCreateEntry} />
}
