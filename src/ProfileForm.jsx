import { useEffect, useRef, useState } from 'react'
import { BEACH_POSITIONS, INDOOR_POSITIONS, MEASUREMENT_CAPABILITIES,
  missingSetupSteps, parseProfileNumber, selectedDiscipline, VOLLEYBALL_DISCIPLINES } from './athleteProfile.js'
import UIIcon from './UIIcon.jsx'

const questions = [
  ['Schön, dass du da bist.', 'Wie heißt du? So begrüßen wir dich künftig in deiner App.'],
  ['Dein Körper.', 'Diese Angaben helfen uns, deine Kraftleistungen einzuordnen.'],
  ['Dein Volleyball.', 'Entscheide dich für eine Hauptsportart.'],
  ['Deine Position.', 'Welche Position spielst du hauptsächlich?'],
  ['Deine Trainingsdaten.', 'Wie genau kannst du deine Leistungen dokumentieren?'],
]

export default function ProfileForm({ profile, onSave, onboarding = false, onComplete }) {
  const [wizardSteps] = useState(() => onboarding ? missingSetupSteps(profile) : [])
  const [index, setIndex] = useState(0)
  const step = onboarding ? (wizardSteps[index] ?? 5) : 0
  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [lastName, setLastName] = useState(profile.lastName ?? '')
  const [height, setHeight] = useState(profile.heightCm ?? '')
  const [weight, setWeight] = useState(profile.bodyweightKg ?? '')
  const [discipline, setDiscipline] = useState(selectedDiscipline(profile))
  const [beachPosition, setBeachPosition] = useState(profile.beachPosition ?? '')
  const [indoorPosition, setIndoorPosition] = useState(profile.indoorPosition ?? '')
  const [measurement, setMeasurement] = useState(profile.measurementCapability ?? '')
  const [message, setMessage] = useState('')
  const heading = useRef(null)
  useEffect(() => { if (onboarding) heading.current?.focus() }, [index, onboarding])

  const show = (number) => !onboarding || step === number
  const positions = discipline === 'beach' ? BEACH_POSITIONS : discipline === 'indoor' ? INDOOR_POSITIONS : []
  const position = discipline === 'beach' ? beachPosition : indoorPosition
  function advance(values) {
    onSave(values)
    setIndex((current) => current + 1)
    setMessage('')
  }
  function chooseDiscipline(id) {
    setDiscipline(id)
    setBeachPosition('')
    setIndoorPosition('')
    setMessage('')
    if (onboarding) advance({ volleyballDiscipline: id, volleyballDisciplines: [id], beachPosition: '', indoorPosition: '' })
  }
  function choosePosition(id) {
    if (discipline === 'beach') setBeachPosition(id)
    else setIndoorPosition(id)
    setMessage('')
    if (onboarding) advance({ beachPosition: discipline === 'beach' ? id : '', indoorPosition: discipline === 'indoor' ? id : '' })
  }
  function chooseMeasurement(id) {
    setMeasurement(id)
    setMessage('')
    if (onboarding) advance({ measurementCapability: id })
  }
  function submit(event) {
    event.preventDefault()
    const name = firstName.trim()
    const surname = lastName.trim()
    const heightCm = parseProfileNumber(height)
    const bodyweightKg = parseProfileNumber(weight)
    if (onboarding) {
      if (step === 0) {
        if (!name || !surname) return setMessage('Bitte gib deinen Vor- und Nachnamen ein.')
        advance({ firstName: name, lastName: surname })
      } else if (step === 1) {
        if (!heightCm || !bodyweightKg) return setMessage('Bitte gib gültige Werte für Körpergröße und Gewicht ein.')
        advance({ heightCm, bodyweightKg })
      } else if (step === 5) {
        onSave({ onboardingCompleted: true })
        onComplete?.()
      }
      return
    }
    if (heightCm === null || bodyweightKg === null)
      return setMessage('Bitte gib für Größe und Gewicht eine Zahl größer als 0 und höchstens 300 ein.')
    if (discipline && !position) return setMessage('Bitte wähle eine Position für deine Volleyballart aus.')
    onSave({ firstName: name, lastName: surname, heightCm, bodyweightKg,
      volleyballDiscipline: discipline, volleyballDisciplines: discipline ? [discipline] : [],
      beachPosition: discipline === 'beach' ? beachPosition : '',
      indoorPosition: discipline === 'indoor' ? indoorPosition : '', measurementCapability: measurement })
    setHeight(heightCm)
    setWeight(bodyweightKg)
    setMessage('Deine Profildaten sind gespeichert.')
  }

  return <form className="profile-form" onSubmit={submit}>
    {onboarding && <>
      <div className="setup-progress">
        {index > 0 && <button className="entry-window-back" type="button" aria-label="Zurück zur vorherigen Frage"
          onClick={() => { setIndex((current) => current - 1); setMessage('') }}><UIIcon name="back" /></button>}
        <p className="eyebrow">DEIN START · SCHRITT {index + 1} VON {wizardSteps.length + 1}</p>
      </div>
      <h1 ref={heading} tabIndex={-1}>{step === 5 ? 'Alles bereit.' : questions[step][0]}</h1>
      <p className="profile-intro">{step === 5
        ? 'Dein Profil ist eingerichtet. Du kannst deine Angaben jederzeit unter „Mein Profil“ ändern.'
        : questions[step][1]}</p>
    </>}

    {show(0) && <div className="profile-question">
      {!onboarding && <h3>Persönliche Angaben</h3>}
      <label className="field-label" htmlFor="profile-first-name">Vorname
        <input id="profile-first-name" className="field" type="text" autoComplete="given-name" maxLength={60}
          value={firstName} onChange={(event) => setFirstName(event.target.value)} required={onboarding} />
      </label>
      <label className="field-label" htmlFor="profile-last-name">Nachname
        <input id="profile-last-name" className="field" type="text" autoComplete="family-name" maxLength={60}
          value={lastName} onChange={(event) => setLastName(event.target.value)} required={onboarding} />
      </label>
    </div>}

    {show(1) && <div className="profile-question">
      {!onboarding && <h3>Körperdaten</h3>}
      <p id="profile-body-help" className="profile-explanation">Dein Körpergewicht hilft uns, deine relative Kraft zu ermitteln und deine Kraftleistungen einzuordnen. Deine Körpergröße ergänzt dein persönliches Profil.</p>
      <div className="profile-body-fields">
        <label className="field-label" htmlFor="profile-height">Körpergröße (cm)
          <input id="profile-height" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help" placeholder="z. B. 180" required={onboarding}
            value={height} onChange={(event) => setHeight(event.target.value)} />
        </label>
        <label className="field-label" htmlFor="profile-weight">Körpergewicht (kg)
          <input id="profile-weight" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help profile-reminder" placeholder="z. B. 75,5" required={onboarding}
            value={weight} onChange={(event) => setWeight(event.target.value)} />
        </label>
      </div>
      <p id="profile-reminder" className="profile-reminder"><UIIcon name="profile" />Du kannst diese Angaben jederzeit unter „Mein Profil“ ändern. Halte besonders dein Gewicht aktuell.</p>
    </div>}

    {show(2) && <fieldset className="profile-question profile-options">
      <legend>Welche Volleyballart passt zu dir?</legend>
      <p>Wenn du Beach und Halle spielst, entscheide dich für die Sportart, mit der du dich mehr identifizierst oder für die du diese App jetzt nutzen möchtest.</p>
      {VOLLEYBALL_DISCIPLINES.map((item) => <button className={'profile-choice' + (discipline === item.id ? ' is-selected' : '')}
        type="button" key={item.id} aria-pressed={discipline === item.id}
        onClick={() => chooseDiscipline(item.id)}><span>{item.label}</span><UIIcon name="chevron" /></button>)}
    </fieldset>}

    {show(3) && <fieldset className="profile-question profile-options">
      <legend>{discipline ? `Deine Position im ${discipline === 'beach' ? 'Beachvolleyball' : 'Hallenvolleyball'}` : 'Deine Position'}</legend>
      {positions.map((item) => <button className={'profile-choice' + (position === item.id ? ' is-selected' : '')}
        type="button" key={item.id} aria-pressed={position === item.id}
        onClick={() => choosePosition(item.id)}><span>{item.label}</span><UIIcon name="chevron" /></button>)}
      {!discipline && <p className="profile-explanation">Wähle zuerst eine Volleyballart aus.</p>}
    </fieldset>}

    {show(4) && <fieldset className="profile-question profile-options">
      <legend>Wie erfasst du deine Trainingsleistungen?</legend>
      <p>Diese Auswahl beschreibt deine Messmöglichkeiten, nicht dein sportliches Können.</p>
      {MEASUREMENT_CAPABILITIES.map((item) => <button className={'profile-choice profile-choice-detailed' + (measurement === item.id ? ' is-selected' : '')}
        type="button" key={item.id} aria-pressed={measurement === item.id}
        onClick={() => chooseMeasurement(item.id)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><UIIcon name="chevron" /></button>)}
    </fieldset>}

    {message && <p className="helper-text" role="alert">{message}</p>}
    {(!onboarding || step === 0 || step === 1 || step === 5) && <button className="primary-button" type="submit">{onboarding
      ? step === 5 ? 'Zur App' : 'Weiter' : 'Änderungen speichern'}</button>}
  </form>
}
