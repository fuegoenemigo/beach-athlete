import { useState } from 'react'
import './HomeView.css'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const FEATURES = {
  calendar: {
    icon: '📅',
    title: 'Sportkalender',
    text: 'Hier entsteht die gemeinsame Übersicht für Training, Beachvolleyball und Hallenvolleyball. Bis dahin bleiben deine Einträge in ihren bisherigen Bereichen verfügbar.',
  },
  statistics: {
    icon: '📊',
    title: 'Statistiken',
    text: 'Hier werden später deine erfassten Daten ausgewertet. Kennzahlen, Zeiträume und Diagramme bauen wir auf den fertigen Erfassungsbereichen auf.',
  },
  card: {
    icon: '🏅',
    title: 'Spielerkarte',
    text: 'Deine persönliche Athletenkarte bekommt hier ihren Platz. Attribute und Ratingformeln legen wir gemeinsam fest, bevor echte Werte erscheinen.',
  },
}

function getMonthCells(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const dayCount = new Date(year, month + 1, 0).getDate()
  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ]
}

export default function HomeView({ children }) {
  const [selectedFeature, setSelectedFeature] = useState(null)
  const currentDate = new Date()
  const monthLabel = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(currentDate)

  function openFeature(feature) {
    setSelectedFeature(feature)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (selectedFeature) {
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
      <button className="home-widget home-calendar" type="button"
        onClick={() => openFeature('calendar')} aria-label="Sportkalender öffnen">
        <span className="home-widget-header">
          <span>
            <span className="home-widget-kicker">DEIN MONAT</span>
            <span className="home-widget-title">Sportkalender</span>
          </span>
          <span className="home-widget-arrow" aria-hidden="true">↗</span>
        </span>
        <span className="home-month-label">{monthLabel}</span>
        <span className="home-calendar-grid" aria-hidden="true">
          {WEEKDAYS.map((day) => <span className="home-weekday" key={day}>{day}</span>)}
          {getMonthCells(currentDate).map((day, index) => (
            <span className={`home-calendar-day ${day === currentDate.getDate() ? 'is-today' : ''}`}
              key={`${day ?? 'empty'}-${index}`}>
              {day}
            </span>
          ))}
        </span>
        <span className="home-widget-note">Deine Aktivitäten erscheinen bald hier.</span>
      </button>

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
      {children}
    </div>
  )
}
