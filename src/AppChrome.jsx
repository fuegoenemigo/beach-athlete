import { useEffect, useState } from 'react'
import EntryWindow from './EntryWindow.jsx'
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

export default function AppChrome({ state, updateAvailable, onInstallUpdate, onProfile }) {
  const [showNotices, setShowNotices] = useState(false)
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setDate(new Date())
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const [title, description] = statuses[state.status] ?? ['Cloud wird geprüft', 'Der aktuelle Synchronisierungsstatus wird geladen.']
  const attention = updateAvailable || ['offline', 'conflict', 'error', 'unavailable'].includes(state.status)

  return <>
    <header className="app-topline">
      <time dateTime={date.toLocaleDateString('sv-SE')}>{date.toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })}</time>
      <div className="app-topline-actions">
        <button type="button" className="app-profile-button" onClick={onProfile} aria-label="Mein Profil öffnen"><UIIcon name="profile" /></button>
        <button type="button" className={`app-notifications${attention ? ' needs-attention' : ''}`}
          onClick={() => setShowNotices(true)} aria-label={`Hinweise öffnen · ${updateAvailable ? 'Neue Version verfügbar' : title}`}>
          <UIIcon name="bell" />{attention && <span aria-hidden="true" />}
        </button>
      </div>
    </header>
    {showNotices && <EntryWindow compact title="Deine Hinweise" subtitle="KONTO & APP" onClose={() => setShowNotices(false)}>
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
