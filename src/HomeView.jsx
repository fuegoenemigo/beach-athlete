import { useState } from 'react'
import HomeCalendar from './HomeCalendar.jsx'
import ArchiveView from './ArchiveView.jsx'
import './HomeView.css'

const FEATURES = {
  statistics: {
    icon: '📊',
    title: 'Statistiken',
    text: 'Hier werden später deine erfassten Daten ausgewertet. Kennzahlen, Zeiträume und Diagramme bauen wir auf den fertigen Erfassungsbereichen auf.',
  },
  card: {
    icon: '🏅',
    title: 'Spielerkarte',
    text: 'Attribute, Entwicklung und Bewertung deiner Spielerkarte gestalten wir anschließend gemeinsam.',
  },
}

export default function HomeView({ children, athleteProfile, setAthleteProfile,
  sessions, volleyballDays, initialView = null, archiveTarget = null, onOpenActivity, onCreateEntry }) {
  const [selectedFeature, setSelectedFeature] = useState(initialView)
  const [focusedArchiveTarget, setFocusedArchiveTarget] = useState(archiveTarget)

  function openFeature(feature) {
    setFocusedArchiveTarget(null)
    setSelectedFeature(feature)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (selectedFeature) {
    if (selectedFeature === 'profile' || selectedFeature === 'archive') return (
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
    )
    const feature = FEATURES[selectedFeature]
    return (
      <section className="home-detail" aria-labelledby="home-detail-title">
        <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>
          ← Zur Startseite
        </button>
        <div className="home-detail-icon" aria-hidden="true">{feature.icon}</div>
        <p className="eyebrow">BALD IN BEACH ATHLETE</p>
        <h2 id="home-detail-title">{feature.title}</h2>
        <p>{feature.text}</p>
      </section>
    )
  }

  return (
    <div className="home-dashboard" aria-label="Startseite">
      <HomeCalendar sessions={sessions} volleyballDays={volleyballDays}
        onOpenActivity={onOpenActivity} onCreateEntry={onCreateEntry} />

      <button className="home-widget home-statistics" type="button"
        onClick={() => openFeature('statistics')} aria-label="Statistiken öffnen">
        <span className="home-widget-header">
          <span>
            <span className="home-widget-kicker">DEINE ENTWICKLUNG</span>
            <span className="home-widget-title">Statistiken</span>
          </span>
          <span className="home-widget-arrow" aria-hidden="true">↗</span>
        </span>
        <span className="home-stat-grid">
          <span><strong>—</strong><small>Training</small></span>
          <span><strong>—</strong><small>Beach</small></span>
          <span><strong>—</strong><small>Halle</small></span>
        </span>
        <span className="home-widget-note">Auswertungen folgen, sobald die Erfassung steht.</span>
      </button>

      <button className="home-widget home-player-card" type="button"
        onClick={() => openFeature('card')} aria-label="Spielerkarte öffnen">
        <span className="home-widget-header">
          <span>
            <span className="home-widget-kicker">DEINE ENTWICKLUNG</span>
            <span className="home-widget-title">Spielerkarte</span>
          </span>
          <span className="home-widget-arrow" aria-hidden="true">↗</span>
        </span>
        <span className="home-card-art" aria-hidden="true">
          <span className="home-card-topline">BEACH ATHLETE <span>✦</span> PLAYER CARD</span>
          <span className="home-card-center">
            <span className="home-card-crest">BA</span>
            <span className="home-card-rating">— <small>GES</small></span>
          </span>
          <span className="home-card-name">DEINE KARTE</span>
          <span className="home-card-divider" />
          <span className="home-card-bottom">DEINE DATEN. DEINE ENTWICKLUNG.</span>
        </span>
        <span className="home-widget-note">Attribute und Bewertung gestalten wir gemeinsam.</span>
      </button>
      <button className="home-widget home-archive" type="button" onClick={() => openFeature('archive')}>
        <span className="home-widget-header"><span>
          <span className="home-widget-kicker">ALLE ABGESCHLOSSENEN EINTRÄGE</span>
          <span className="home-widget-title">Archiv</span>
        </span><span className="home-widget-arrow" aria-hidden="true">↗</span></span>
        <span className="home-widget-note">Spieltage und Trainingseinheiten nach Monaten ansehen.</span>
      </button>
    </div>
  )
}
