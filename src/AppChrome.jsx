import { useState } from 'react'
import EntryWindow from './EntryWindow.jsx'
import { greetingName } from './homeSummary.js'
import UIIcon from './UIIcon.jsx'

const statuses = {
  ready: ['Cloud aktuell', 'Deine Einträge sind mit der Cloud synchronisiert.'],
  pending: ['Synchronisierung läuft', 'Deine Änderungen warten auf die Speicherung in der Cloud.'],
  saving: ['Synchronisierung läuft', 'Deine Änderungen werden gerade gespeichert.'],
  offline: ['Cloud offline', 'Deine Änderungen bleiben auf diesem Gerät und werden bei Verbindung synchronisiert.'],
  conflict: ['Datenkonflikt prüfen', 'Öffne dein Profil und wähle dort, welche Daten übernommen werden sollen.'],
  error: ['Daten prüfen', 'Die Synchronisierung braucht deine Aufmerksamkeit. Öffne dein Profil für weitere Informationen.'],
  unavailable: ['Cloud nicht verfügbar', 'Öffne dein Profil für weitere Informationen.'],
}

export default function AppChrome({ state, updateAvailable, onInstallUpdate, onProfile,
  today, introProgress, firstName }) {
  const [showNotices, setShowNotices] = useState(false)
  const name = greetingName(state.email, firstName)
  const introHeight = Math.round(64 + (1 - introProgress) * 104)
  const [title, description] = statuses[state.status] ?? ['Cloud wird geprüft', 'Der aktuelle Synchronisierungsstatus wird geladen.']
  const attention = updateAvailable || ['offline', 'conflict', 'error', 'unavailable'].includes(state.status)

  return <>
    <header className={`app-global-header${introProgress >= 1 ? ' is-compact' : ''}`}
      style={{ '--intro-height': `${introHeight}px`, '--intro-open': 1 - introProgress,
        '--intro-opacity': Math.max(0, 1 - introProgress * 1.3),
        '--avatar-top': `${Math.round(13 + (1 - introProgress) * 27)}px`,
        '--avatar-size': `${Math.round(53 - introProgress * 15)}px` }}>
    <div className="app-topline">
      <time dateTime={today}>{new Date(`${today}T12:00:00`).toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })}</time>
    </div>
    <button type="button" className={`app-notifications${attention ? ' needs-attention' : ''}`}
      onClick={() => setShowNotices(true)} aria-label={`Hinweise öffnen · ${updateAvailable ? 'Neue Version verfügbar' : title}`}>
      <UIIcon name="bell" />{attention && <span aria-hidden="true" />}
    </button>
    <div className="app-intro">
      <div className="app-intro-copy"><h1>
        <span className="app-intro-hello" aria-hidden={introProgress >= 1}>Hallo,</span>
        <span className="app-intro-name">{name}{introProgress < 1 ? '.' : ''}</span>
      </h1><p aria-hidden={introProgress >= 1}>Bereit, deinen Tag zu gestalten?</p></div>
      <button type="button" className="home-avatar app-header-avatar" onClick={onProfile}
        aria-label="Mein Profil öffnen" title={state.email || 'Mein Profil'}>{name.charAt(0)}</button>
    </div>
    </header>
    {showNotices && <EntryWindow title="Deine Hinweise" subtitle="KONTO & APP" onClose={() => setShowNotices(false)}>
      <section className="app-status-card"><UIIcon name={state.status === 'ready' ? 'check' : 'bell'} />
        <h3>{title}</h3><p>{state.message || description}</p>
        <button type="button" className="secondary-button" onClick={() => { setShowNotices(false); onProfile() }}>Konto und Datensicherung</button>
      </section>
      {updateAvailable && <section className="app-status-card"><h3>Neue Version verfügbar</h3>
        <p>Speichere offene Eingaben, bevor du aktualisierst.</p>
        <button type="button" className="primary-button" onClick={onInstallUpdate}>Jetzt aktualisieren</button></section>}
      <p className="helper-text">Beach Athlete · Version 0.1</p>
    </EntryWindow>}
  </>
}
