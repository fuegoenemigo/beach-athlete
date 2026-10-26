import { profilePositionLabel, selectedDiscipline, VOLLEYBALL_DISCIPLINES } from './athleteProfile.js'
import { greetingName } from './homeSummary.js'
import UIIcon from './UIIcon.jsx'

const metric = (value) => value === '' || value == null ? '—' : String(value).replace('.', ',')

export default function ProfileOverview({ profile, email, onEdit, onArchive, onData }) {
  const name = greetingName(email, profile.firstName)
  const discipline = selectedDiscipline(profile)
  const sport = VOLLEYBALL_DISCIPLINES.find((item) => item.id === discipline)?.label ?? 'Sportart wählen'
  const position = profilePositionLabel(profile)
  const role = position || (discipline ? 'Position wählen' : '')
  const height = metric(profile.heightCm)
  const weight = metric(profile.bodyweightKg)

  return <section className="profile-overview" aria-label="Profilübersicht">
    <div className="profile-overview-identity">
      <div className="profile-overview-avatar" aria-hidden="true">{name.charAt(0)}</div>
      <div className="profile-overview-person"><h3>{name}</h3><p>{sport}{role ? ` · ${role}` : ''}</p></div>
      <button type="button" className="profile-overview-edit" aria-label="Profildaten bearbeiten" onClick={onEdit}>
        <UIIcon name="edit" />
      </button>
    </div>

    <section className="profile-overview-section" aria-labelledby="profile-data-heading">
      <h3 id="profile-data-heading">Meine Daten</h3>
      <div className="profile-overview-metrics">
        <div><span>Körpergröße</span><p><strong>{height}</strong>{height !== '—' && <small> cm</small>}</p></div>
        <div><span>Körpergewicht</span><p><strong>{weight}</strong>{weight !== '—' && <small> kg</small>}</p></div>
      </div>
      <p className="profile-overview-reminder">Halte dein Gewicht aktuell, damit deine relative Kraft korrekt berechnet werden kann.</p>
    </section>

    <section className="profile-overview-section" aria-labelledby="profile-archive-heading">
      <h3 id="profile-archive-heading">Trainingsarchiv</h3>
      <button type="button" className="profile-overview-link" onClick={onArchive}>
        <span><strong>Alle Trainings ansehen</strong><small>Deine dokumentierten Einheiten</small></span>
        <UIIcon name="chevron" />
      </button>
    </section>

    <section className="profile-overview-section" aria-labelledby="profile-account-heading">
      <h3 id="profile-account-heading">Konto & Daten</h3>
      {email && <p className="profile-overview-email"><small>KONTO</small><span>{email}</span></p>}
      <button type="button" className="profile-overview-data-link" onClick={onData}>
        <span><small>SICHERUNG</small><strong>Datensicherung & Synchronisierung</strong></span>
        <UIIcon name="chevron" />
      </button>
    </section>
  </section>
}
