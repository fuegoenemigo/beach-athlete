import { greetingName } from './homeSummary.js'

export default function AppChrome({ state, onProfile, today, introProgress, firstName, needsProfileSetup }) {
  const name = greetingName(state.email, firstName)
  const introHeight = Math.round(64 + (1 - introProgress) * 104)

  return <header className={`app-global-header${introProgress >= 1 ? ' is-compact' : ''}`}
    style={{ '--intro-height': `${introHeight}px`, '--intro-open': 1 - introProgress,
      '--intro-opacity': Math.max(0, 1 - introProgress * 1.3) }}>
    <div className="app-topline">
      <time dateTime={today}>{new Date(`${today}T12:00:00`).toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })}</time>
      <button type="button" className="home-avatar app-header-avatar" onClick={onProfile}
        aria-label={needsProfileSetup ? 'Mein Profil öffnen, Kontoeinrichtung abschließen' : 'Mein Profil öffnen'}
        title={state.email || 'Mein Profil'}>{name.charAt(0)}
        {needsProfileSetup && <span className="app-profile-badge" aria-hidden="true">1</span>}</button>
    </div>
    <div className="app-intro">
      <div className="app-intro-copy"><h1>
        <span className="app-intro-hello" aria-hidden={introProgress >= 1}>Hallo,</span>
        <span className="app-intro-name">{name}{introProgress < 1 ? '.' : ''}</span>
      </h1><p aria-hidden={introProgress >= 1}>Bereit, deinen Tag zu gestalten?</p></div>
    </div>
  </header>
}
