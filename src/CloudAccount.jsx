import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { firebaseAuth } from './firebase.js'

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'Für diese E-Mail-Adresse gibt es bereits ein Konto.',
  'auth/invalid-email': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'auth/invalid-credential': 'E-Mail-Adresse oder Passwort ist falsch.',
  'auth/weak-password': 'Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte versuche es später erneut.',
  'auth/network-request-failed': 'Keine Verbindung. Bitte versuche es online erneut.',
}

const STATUS = {
  loading: 'Cloud-Daten werden geprüft …',
  checkingAccess: 'Dein Testplatz wird geprüft …',
  limitReached: 'Die 15 Testplätze sind bereits vergeben. Bitte wende dich an Marc.',
  accessError: 'Dein Zugang konnte nicht geprüft werden. Bitte versuche es erneut.',
  pending: 'Änderungen warten auf die Cloud-Speicherung …',
  saving: 'Änderungen werden in der Cloud gespeichert …',
  ready: 'Mit der Cloud synchronisiert.',
  offline: 'Cloud derzeit nicht erreichbar. Deine Änderungen bleiben auf diesem Gerät.',
  error: 'Synchronisierung angehalten.',
  conflict: 'Gerät und Cloud enthalten unterschiedliche Änderungen.',
}

export default function CloudAccount({ state, onResolve, onRetry, onExport }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [authMode, setAuthMode] = useState('signIn')

  async function authenticate(mode) {
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'create') {
        await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
      }
      setPassword('')
    } catch (error) {
      setMessage(AUTH_ERRORS[error.code] || 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage('Bitte gib zuerst deine E-Mail-Adresse ein.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim())
      setMessage('Falls ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.')
    } catch (error) {
      setMessage(AUTH_ERRORS[error.code] || 'E-Mail konnte nicht gesendet werden.')
    } finally {
      setBusy(false)
    }
  }

  async function logOut() {
    try {
      await signOut(firebaseAuth)
    } catch {
      setMessage('Abmelden fehlgeschlagen. Bitte versuche es erneut.')
    }
  }

  if (state.status === 'unavailable') return <p role="status">{state.message}</p>
  if (state.status === 'loading' && !state.email) return <p role="status">Anmeldung wird geprüft …</p>

  return (
    <section id="cloud-account" className="cloud-account" aria-label="Cloud-Synchronisierung">
      <h3>{state.status === 'signedOut' ? authMode === 'create' ? 'Dein Konto erstellen' : 'Schön, dich wiederzusehen' : 'Geräte synchronisieren'}</h3>
      {state.status === 'signedOut' ? (
        <>
          <div className="auth-mode" aria-label="Zugang wählen">
            <button type="button" aria-pressed={authMode === 'signIn'} disabled={busy}
              onClick={() => { setAuthMode('signIn'); setMessage('') }}>Anmelden</button>
            <button type="button" aria-pressed={authMode === 'create'} disabled={busy}
              onClick={() => { setAuthMode('create'); setMessage('') }}>Registrieren</button>
          </div>
          <p>{authMode === 'create' ? 'Starte mit E-Mail und Passwort. Anschließend richten wir gemeinsam dein Profil ein.' : 'Mit deinem persönlichen Konto bleiben Training und Spieltage auch auf einem neuen Gerät verfügbar.'}</p>
          <form aria-label={authMode === 'create' ? 'Registrierung' : 'Anmeldung'} onSubmit={(event) => { event.preventDefault(); authenticate(authMode) }}>
            <label className="field-label" htmlFor="cloud-email">E-Mail-Adresse</label>
            <input id="cloud-email" className="field" type="email" autoComplete="email"
              value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label className="field-label" htmlFor="cloud-password">Passwort</label>
            <input id="cloud-password" className="field" type="password" autoComplete={authMode === 'create' ? 'new-password' : 'current-password'}
              value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
            <div className="cloud-actions">
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Einen Moment …' : authMode === 'create' ? 'Konto erstellen' : 'Anmelden'}</button>
              {authMode === 'signIn' && <button className="text-button" type="button" disabled={busy}
                onClick={resetPassword}>Passwort vergessen?</button>}
            </div>
          </form>
          <p className="auth-note">Deine Einträge gehören zu deinem Konto und werden mit der Cloud synchronisiert. Sichere wichtige Einträge gelegentlich über „Daten exportieren“ im Profil.</p>
        </>
      ) : (
        <>
          <p>Angemeldet als <strong>{state.email}</strong></p>
          <p role="status">{state.message || STATUS[state.status]}</p>
          {state.status === 'conflict' && (
            <div className="cloud-conflict">
              <p>Exportiere zuerst eine Sicherung. Wähle danach bewusst, welche Version erhalten bleiben soll.</p>
              <div className="cloud-actions">
                <button className="secondary-button" type="button" onClick={onExport}>Lokale Daten exportieren</button>
                <button className="secondary-button" type="button" onClick={() => onResolve('cloud')}>Cloud-Daten auf diesem Gerät laden</button>
                <button className="secondary-button" type="button" onClick={() => onResolve('local')}>Daten dieses Geräts in Cloud speichern</button>
              </div>
            </div>
          )}
          {(state.status === 'offline' || state.status === 'error'
            || state.status === 'limitReached' || state.status === 'accessError') && (
            <button className="secondary-button" type="button" onClick={onRetry}>Erneut versuchen</button>
          )}
          <button className="text-button" type="button" onClick={logOut}>
            Abmelden
          </button>
        </>
      )}
      {message && <p className="notice-message" role="status">{message}</p>}
    </section>
  )
}
