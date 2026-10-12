import { useState } from 'react'
import HomeCalendar from './HomeCalendar.jsx'
import ArchiveView from './ArchiveView.jsx'
import { relativeStrengthByExercise } from './relativeStrength.js'
import './HomeView.css'

const FEATURES = {
  statistics: {
    icon: '📊',
    title: 'Statistiken',
    text: 'Hier werden später deine erfassten Daten ausgewertet. Kennzahlen, Zeiträume und Diagramme bauen wir auf den fertigen Erfassungsbereichen auf.',
  },
  card: {
    icon: '🏅',
    title: 'Spielerkarte & Profil',
    text: 'Deine Profildaten und ersten relativen Kraftwerte. Die vollständige Spielerkarte gestalten wir anschließend.',
  },
}

export default function HomeView({ children, athleteProfile, setAthleteProfile,
  sessions, volleyballDays, initialView = null, archiveTarget = null, onOpenActivity, onCreateEntry }) {
  const [selectedFeature, setSelectedFeature] = useState(initialView)
  const [focusedArchiveTarget, setFocusedArchiveTarget] = useState(archiveTarget)
  const strengthResults = relativeStrengthByExercise(sessions, athleteProfile)
  const formatNumber = (value, digits = 2) => value.toLocaleString('de-DE', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })

  function openFeature(feature) {
    setFocusedArchiveTarget(null)
    setSelectedFeature(feature)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (selectedFeature) {
    if (selectedFeature === 'security' || selectedFeature === 'archive') return (
      <section className="home-detail home-functional-detail">
        <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>
          ← Zur Startseite
        </button>
        {selectedFeature === 'security' ? children
          : <ArchiveView sessions={sessions} volleyballDays={volleyballDays} target={focusedArchiveTarget} />}
      </section>
    )
    const feature = FEATURES[selectedFeature]
    return (
      <section className="home-detail" aria-labelledby="home-detail-title">
        <button className="home-back" type="button" onClick={() => setSelectedFeature(null)}>
          ← Zur Startseite
        </button>
        <div className="home-detail-icon" aria-hidden="true">{feature.icon}</div>
        <p className="eyebrow">{selectedFeature === 'card' ? 'DEIN PROFIL' : 'BALD IN BEACH ATHLETE'}</p>
        <h2 id="home-detail-title">{feature.title}</h2>
        <p>{feature.text}</p>
        {selectedFeature === 'card' && <div className="home-profile-card">
          <h3>Körperdaten</h3>
          <p>Das Körpergewicht wird bei Eigengewichtsübungen angezeigt und für relative Kraftwerte verwendet. Die Größe hilft später bei volleyballspezifischen Reichhöhen.</p>
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
        </div>}
        {selectedFeature === 'card' && <div className="home-profile-card">
          <h3>Relative Kraft</h3>
          <p>Pro geeigneter Kraftübung zählt der beste Satz mit 1–10 Wiederholungen: geschätzter Kraftwert aus dem eingetragenen Trainingsgewicht ÷ Körpergewicht. Das ist ein persönlicher Trainingsvergleich, keine allgemeine Fitnessnote. Übungen wie Klimmzüge oder Liegestütze sowie reine Wiederholungsübungen bleiben für eigene Auswertungen.</p>
          {!athleteProfile.bodyweightKg && <p>Trage dein Körpergewicht ein, damit die Werte berechnet werden können.</p>}
          {athleteProfile.bodyweightKg && !strengthResults.length && <p>Für die erste Wertung brauchst du eine abgeschlossene Kraftübung mit eingetragenem Gewicht und 1–10 Wiederholungen.</p>}
          {strengthResults.length > 0 && <ul className="home-strength-list">
            {strengthResults.map((result) => <li key={result.libraryId}>
              <span><strong>{result.name}</strong><small>{formatNumber(result.estimateKg, 1)} kg geschätzt · {formatNumber(result.bodyweightKg, 1)} kg Körpergewicht{result.usesCurrentBodyweight ? ' (aktuelles Profilgewicht)' : ''}</small></span>
              <span className="home-strength-value">{formatNumber(result.ratio)}×<small>{result.previousRatio == null ? 'Erster Wert'
                : `${result.ratio >= result.previousRatio ? '+' : ''}${formatNumber((result.ratio / result.previousRatio - 1) * 100, 1)} % zum letzten Wert`}</small></span>
            </li>)}
          </ul>}
          <p>Für ältere Einträge ohne gespeichertes Tagesgewicht gilt dein aktuelles Profilgewicht. Wenn du dein Gewicht änderst, können sich deren Quotienten verändern. Die Körpergröße fließt nicht in diesen Kraftwert ein.</p>
        </div>}
      </section>
    )
  }

  return (
    <div className="home-dashboard" aria-label="Startseite">
      <button className="home-security-link" type="button" onClick={() => openFeature('security')}>
        <span aria-hidden="true">🔑</span> Daten &amp; Sicherheit
      </button>
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
            <span className="home-widget-kicker">DEIN PROFIL</span>
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
