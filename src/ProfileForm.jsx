import { useEffect, useRef, useState } from 'react'
import { parseProfileNumber } from './athleteProfile.js'
import UIIcon from './UIIcon.jsx'

export default function ProfileForm({ profile, onSave, onboarding = false }) {
  const [step, setStep] = useState(onboarding && profile.firstName ? 1 : 0)
  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [height, setHeight] = useState(profile.heightCm ?? '')
  const [weight, setWeight] = useState(profile.bodyweightKg ?? '')
  const [message, setMessage] = useState('')
  const [invalid, setInvalid] = useState(false)
  const showName = !onboarding || step === 0
  const showBody = !onboarding || step === 1
  const heading = useRef(null)
  useEffect(() => { if (onboarding) heading.current?.focus() }, [step, onboarding])

  function submit(event) {
    event.preventDefault()
    const name = firstName.trim()
    if (onboarding && !name) return fail('Bitte gib deinen Vornamen ein.')
    if (onboarding && step === 0) {
      onSave({ firstName: name })
      setStep(1)
      setMessage('')
      return
    }
    const heightCm = parseProfileNumber(height)
    const bodyweightKg = parseProfileNumber(weight)
    if (heightCm === null || bodyweightKg === null) return fail('Bitte gib für Größe und Gewicht eine Zahl größer als 0 und höchstens 300 ein. Komma oder Punkt sind möglich.')
    if (onboarding && (!heightCm || !bodyweightKg)) return fail('Bitte ergänze deine Körpergröße und dein Körpergewicht.')
    onSave({ firstName: name, heightCm, bodyweightKg, ...(onboarding ? { onboardingCompleted: true } : {}) })
    setHeight(heightCm)
    setWeight(bodyweightKg)
    setInvalid(false)
    setMessage('Deine Profildaten sind gespeichert.')
  }

  function fail(text) { setInvalid(true); setMessage(text) }

  return <form className="profile-form" onSubmit={submit}>
    {onboarding && <>
      <div className="setup-progress">
        {step === 1 && <button className="entry-window-back" type="button" aria-label="Zurück zum Vornamen"
          onClick={() => { setStep(0); setMessage('') }}><UIIcon name="back" /></button>}
        <p className="eyebrow">DEIN START · SCHRITT {step + 1} VON 2</p>
      </div>
      <h1 ref={heading} tabIndex={-1}>{step === 0 ? 'Schön, dass du da bist.' : `Hallo, ${firstName.trim()}.`}</h1>
      <p className="profile-intro">{step === 0 ? 'Wie heißt du? So begrüßen wir dich künftig in deiner App.' : 'Ein paar Angaben für dein persönliches Training.'}</p>
    </>}
    {showName && <label className="field-label" htmlFor="profile-first-name">Vorname
      <input id="profile-first-name" className="field" type="text" autoComplete="given-name" maxLength={60}
        value={firstName} onChange={event => { setFirstName(event.target.value); setMessage('') }} required={onboarding} />
    </label>}
    {showBody && <>
      <p id="profile-body-help" className="profile-explanation">Dein Körpergewicht hilft uns, deine relative Kraft zu ermitteln und deine Kraftleistungen einzuordnen. Deine Körpergröße ergänzt dein persönliches Profil.</p>
      <div className="profile-body-fields">
        <label className="field-label" htmlFor="profile-height">Körpergröße (cm)
          <input id="profile-height" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help" placeholder="z. B. 180" required={onboarding}
            value={height} onChange={event => { setHeight(event.target.value); setMessage('') }} />
        </label>
        <label className="field-label" htmlFor="profile-weight">Körpergewicht (kg)
          <input id="profile-weight" className="field" type="text" inputMode="decimal" maxLength={8}
            aria-describedby="profile-body-help profile-reminder" placeholder="z. B. 75,5" required={onboarding}
            value={weight} onChange={event => { setWeight(event.target.value); setMessage('') }} />
        </label>
      </div>
      <p id="profile-reminder" className="profile-reminder"><UIIcon name="profile" />Du kannst diese Angaben jederzeit unter „Mein Profil“ ändern. Halte besonders dein Gewicht aktuell, damit neue Trainings mit dem passenden Körpergewicht erfasst werden.</p>
    </>}
    {message && <p className="helper-text" role={invalid ? 'alert' : 'status'}>{message}</p>}
    <button className="primary-button" type="submit">{onboarding ? step === 0 ? 'Weiter' : 'Los geht’s' : 'Änderungen speichern'}</button>
  </form>
}
