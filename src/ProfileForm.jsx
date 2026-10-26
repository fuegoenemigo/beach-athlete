import { useEffect, useRef, useState } from 'react'
import { BEACH_POSITIONS, INDOOR_POSITIONS, MEASUREMENT_CAPABILITIES,
  nextOnboardingStep, parseProfileNumber, VOLLEYBALL_DISCIPLINES } from './athleteProfile.js'
import UIIcon from './UIIcon.jsx'

const steps = [
  { title: 'Schön, dass du da bist.', intro: 'Wie heißt du? So begrüßen wir dich künftig in deiner App.' },
  { title: 'Dein Körper.', intro: 'Diese Angaben helfen uns, deine Kraftleistungen einzuordnen.' },
  { title: 'Dein Volleyball.', intro: 'Wähle beide Bereiche, wenn du Beach und Halle regelmäßig spielst.' },
  { title: 'Deine Position.', intro: 'Für jede ausgewählte Sportart kannst du eine Position angeben.' },
  { title: 'Deine Trainingsdaten.', intro: 'Wie genau kannst du deine Leistungen dokumentieren?' },
]

export default function ProfileForm({ profile, onSave, onboarding = false }) {
  const [step, setStep] = useState(() => onboarding ? nextOnboardingStep(profile) : 0)
  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [lastName, setLastName] = useState(profile.lastName ?? '')
  const [height, setHeight] = useState(profile.heightCm ?? '')
  const [weight, setWeight] = useState(profile.bodyweightKg ?? '')
  const [disciplines, setDisciplines] = useState(profile.volleyballDisciplines ?? [])
  const [beachPosition, setBeachPosition] = useState(profile.beachPosition ?? '')
  const [indoorPosition, setIndoorPosition] = useState(profile.indoorPosition ?? '')
  const [measurementCapability, setMeasurementCapability] = useState(profile.measurementCapability ?? '')
  const [message, setMessage] = useState('')
  const [invalid, setInvalid] = useState(false)
  const heading = useRef(null)
  useEffect(() => { if (onboarding) heading.current?.focus() }, [step, onboarding])

  const showName = !onboarding || step === 0
  const showBody = !onboarding || step === 1
  const showSports = !onboarding || step === 2
  const showPositions = !onboarding || step === 3
  const showPrecision = !onboarding || step === 4

  function fail(text) { setInvalid(true); setMessage(text) }
  function advance(values, next) {
    onSave(values)
    setStep(next)
    setInvalid(false)
    setMessage('')
  }

  function toggleDiscipline(id) {
    setDisciplines((current) => current.includes(id)
      ? current.filter((item) => item !== id) : [...current, id])
    if (id === 'beach') setBeachPosition('')
    if (id === 'indoor') setIndoorPosition('')
    setMessage('')
  }

  function submit(event) {
    event.preventDefault()
    const name = firstName.trim()
    const surname = lastName.trim()
    const heightCm = parseProfileNumber(height)
    const bodyweightKg = parseProfileNumber(weight)
    const selectedBeachPosition = disciplines.includes('beach') ? beachPosition : ''
    const selectedIndoorPosition = disciplines.includes('indoor') ? indoorPosition : ''

    if (onboarding) {
      if (step === 0) {
        if (!name || !surname) return fail('Bitte gib deinen Vor- und Nachnamen ein.')
        advance({ firstName: name, lastName: surname }, 1)
        return
      }
      if (step === 1) {
        if (!heightCm || !bodyweightKg) return fail('Bitte gib eine gültige Körpergröße und ein gültiges Körpergewicht ein. Komma oder Punkt sind möglich.')
        advance({ heightCm, bodyweightKg }, 2)
        return
      }
      if (step === 2) {
        if (!disciplines.length) return fail('Wähle mindestens eine Volleyballart aus.')
        advance({ volleyballDisciplines: disciplines, beachPosition: selectedBeachPosition,
          indoorPosition: selectedIndoorPosition }, 3)
        return
      }
      if (step === 3) {
        if ((disciplines.includes('beach') && !selectedBeachPosition)
          || (disciplines.includes('indoor') && !selectedIndoorPosition))
          return fail('Wähle für jede deiner Volleyballarten eine Position aus.')
        advance({ beachPosition: selectedBeachPosition, indoorPosition: selectedIndoorPosition }, 4)
        return
      }
      if (!measurementCapability) return fail('Wähle aus, wie du deine Trainingsleistungen erfassen kannst.')
      onSave({ measurementCapability, onboardingCompleted: true })
    } else {
      if (heightCm === null || bodyweightKg === null)
        return fail('Bitte gib für Größe und Gewicht eine Zahl größer als 0 und höchstens 300 ein. Komma oder Punkt sind möglich.')
      if ((disciplines.includes('beach') && !selectedBeachPosition)
        || (disciplines.includes('indoor') && !selectedIndoorPosition))
        return fail('Wähle für jede ausgewählte Volleyballart eine Position aus.')
      onSave({ firstName: name, lastName: surname, heightCm, bodyweightKg,
        volleyballDisciplines: disciplines, beachPosition: selectedBeachPosition,
        indoorPosition: selectedIndoorPosition, measurementCapability })
      setHeight(heightCm)
      setWeight(bodyweightKg)
      setMessage('Deine Profildaten sind gespeichert.')
    }
    setInvalid(false)
  }

  return <form className="profile-form" onSubmit={submit}>
    {onboarding && <>
      <div className="setup-progress">
        {step > 0 && <button className="entry-window-back" type="button"
          aria-label={step === 1 ? 'Zurück zum Namen' : 'Zurück zum vorherigen Schritt'}
          onClick={() => { setStep((current) => current - 1); setMessage('') }}><UIIcon name="back" /></button>}
        <p className="eyebrow">DEIN START · SCHRITT {step + 1} VON {steps.length}</p>
      </div>
      <h1 ref={heading} tabIndex={-1}>{steps[step].title}</h1>
      <p className="profile-intro">{steps[step].intro}</p>
    </>}

    {showName && <div className="profile-question">
      {!onboarding && <h3>Persönliche Angaben</h3>}
      <label className="field-label" htmlFor="profile-first-name">Vorname
        <input id="profile-first-name" className="field" type="text" autoComplete="given-name" maxLength={60}
          value={firstName} onChange={(event) => { setFirstName(event.target.value); setMessage('') }} required={onboarding} />
      </label>
      <label className="field-label" htmlFor="profile-last-name">Nachname
        <input id="profile-last-name" className="field" type="text" autoComplete="family-name" maxLength={60}
          value={lastName} onChange={(event) => { setLastName(event.target.value); setMessage('') }} required={onboarding} />
      </label>
    </div>}

    {showBody && <div className="profile-question">
      {!onboarding && <h3>Körperdaten</h3>}
      <p id="profile-body-help" className="profile-explanation">Dein Körpergewicht hilft uns, deine relative Kraft zu ermitteln und deine Kraftleistungen einzuordnen. Deine Körpergröße ergänzt dein persönliches Profil.</p>
      <div className="profile-body-fields">
        <label className="field-label" htmlFor="profile-height">Körpergröße (cm)
          <input id="profile-height" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help" placeholder="z. B. 180" required={onboarding}
            value={height} onChange={(event) => { setHeight(event.target.value); setMessage('') }} />
        </label>
        <label className="field-label" htmlFor="profile-weight">Körpergewicht (kg)
          <input id="profile-weight" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help profile-reminder" placeholder="z. B. 75,5" required={onboarding}
            value={weight} onChange={(event) => { setWeight(event.target.value); setMessage('') }} />
        </label>
      </div>
      <p id="profile-reminder" className="profile-reminder"><UIIcon name="profile" />Du kannst diese Angaben jederzeit unter „Mein Profil“ ändern. Halte besonders dein Gewicht aktuell, damit neue Trainings mit dem passenden Körpergewicht erfasst werden.</p>
    </div>}

    {showSports && <fieldset className="profile-question profile-options">
      <legend>Welche Volleyballarten spielst du?</legend>
      <p>Mehrfachauswahl möglich.</p>
      {VOLLEYBALL_DISCIPLINES.map((item) => <label className="profile-option" key={item.id}>
        <input type="checkbox" checked={disciplines.includes(item.id)}
          onChange={() => toggleDiscipline(item.id)} />
        <span>{item.label}</span>
      </label>)}
    </fieldset>}

    {showPositions && <div className="profile-question">
      {!onboarding && <h3>Deine Positionen</h3>}
      {disciplines.includes('beach') && <fieldset className="profile-options">
        <legend>Position im Beachvolleyball</legend>
        {BEACH_POSITIONS.map((item) => <label className="profile-option" key={item.id}>
          <input type="radio" name="profile-beach-position" value={item.id}
            checked={beachPosition === item.id} onChange={() => { setBeachPosition(item.id); setMessage('') }} />
          <span>{item.label}</span>
        </label>)}
      </fieldset>}
      {disciplines.includes('indoor') && <fieldset className="profile-options">
        <legend>Position im Hallenvolleyball</legend>
        {INDOOR_POSITIONS.map((item) => <label className="profile-option" key={item.id}>
          <input type="radio" name="profile-indoor-position" value={item.id}
            checked={indoorPosition === item.id} onChange={() => { setIndoorPosition(item.id); setMessage('') }} />
          <span>{item.label}</span>
        </label>)}
      </fieldset>}
      {!disciplines.length && <p className="profile-explanation">Wähle zuerst mindestens eine Volleyballart aus.</p>}
    </div>}

    {showPrecision && <fieldset className="profile-question profile-options">
      <legend>Wie erfasst du deine Trainingsleistungen?</legend>
      <p>Diese Auswahl beschreibt deine Messmöglichkeiten, nicht dein sportliches Können.</p>
      {MEASUREMENT_CAPABILITIES.map((item) => <label className="profile-option profile-option-detailed" key={item.id}>
        <input type="radio" name="profile-measurement" value={item.id}
          checked={measurementCapability === item.id}
          onChange={() => { setMeasurementCapability(item.id); setMessage('') }} />
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
      </label>)}
    </fieldset>}

    {message && <p className="helper-text" role={invalid ? 'alert' : 'status'}>{message}</p>}
    <button className="primary-button" type="submit">{onboarding
      ? step === steps.length - 1 ? 'Los geht’s' : 'Weiter' : 'Änderungen speichern'}</button>
  </form>
}
