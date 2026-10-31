import { useState } from 'react'
import DateWheel from './DateWheel.jsx'
import EntryWindow from './EntryWindow.jsx'
import { isJumpDate, JUMP_TESTS, jumpValuesForDate, parseJumpCentimeters, saveJumpValues } from './jumpMeasurements.js'

const today = () => new Date().toLocaleDateString('sv-SE')
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE')

export default function JumpMeasurementPanel({ measurementCapability, measurements, setMeasurements, setNotice }) {
  const enabled = measurementCapability === 'measured'
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [values, setValues] = useState(() => jumpValuesForDate(measurements, today()))
  const [error, setError] = useState('')
  const sorted = [...measurements].sort((a, b) =>
    b.date.localeCompare(a.date) || JUMP_TESTS.findIndex((test) => test.id === a.testId)
      - JUMP_TESTS.findIndex((test) => test.id === b.testId))

  function openForm() {
    if (!enabled) return
    const currentDate = today()
    setDate(currentDate)
    setValues(jumpValuesForDate(measurements, currentDate))
    setError('')
    setOpen(true)
  }

  function chooseDate(nextDate) {
    setDate(nextDate)
    setValues(jumpValuesForDate(measurements, nextDate))
    setError('')
  }

  function save(event) {
    event.preventDefault()
    if (!enabled || !isJumpDate(date) || date > today()) {
      setError('Bitte wähle ein gültiges Datum bis heute.')
      return
    }
    const next = saveJumpValues(measurements, date, values, () => crypto.randomUUID(), new Date().toISOString())
    if (!next) {
      setError('Trage mindestens einen gültigen Wert in Zentimetern ein.')
      return
    }
    setMeasurements(next)
    setOpen(false)
    setError('')
    setNotice('Sprungwerte gespeichert.')
  }

  function remove(id) {
    if (!window.confirm('Diesen Sprungwert wirklich löschen?')) return
    const next = measurements.filter((item) => item.id !== id)
    setMeasurements(next)
    setValues(jumpValuesForDate(next, date))
    setNotice('Sprungwert gelöscht.')
  }

  return <section className="diary-panel jump-capture-panel" aria-labelledby="jump-capture-title">
    <div className="section-heading"><div>
      <p className="eyebrow">DEINE LEISTUNG</p>
      <h2 id="jump-capture-title">Sprungmessung</h2>
    </div></div>
    <p className="helper-text">Erfasse deine beste Sprunghöhe oder Sprungweite auf festem Hallenboden.</p>
    <button type="button" className="secondary-button jump-capture-button"
      disabled={!enabled} aria-describedby={!enabled ? 'jump-capture-disabled' : undefined}
      onClick={openForm}>＋ Sprungwerte erfassen</button>
    {!enabled && <p id="jump-capture-disabled" className="helper-text jump-capture-disabled">
      Verfügbar, wenn du im Profil „Ich kann Leistungswerte präzise messen“ aktivierst.
    </p>}
    {enabled && measurements.length > 0 && <p className="helper-text jump-capture-count">
      {measurements.length} {measurements.length === 1 ? 'Messwert' : 'Messwerte'} gespeichert
    </p>}

    {open && enabled && <EntryWindow title="Sprungwerte erfassen" subtitle="HALLENVOLLEYBALL"
      onClose={() => setOpen(false)}>
      <form className="jump-measurement-form" onSubmit={save} noValidate>
        <p className="helper-text">Trage den besten einzelnen gültigen Sprung ein: ausgeruht, nach dem Aufwärmen,
          mit Pausen zwischen den Versuchen. Ein Wert genügt. Alle Sprünge zählen nur auf festem Boden.</p>
        <DateWheel label="Datum der Messung" value={date} onChange={chooseDate} />
        {date > today() && <p className="field-error" role="alert">Das Messdatum darf nicht in der Zukunft liegen.</p>}
        <div className="jump-measurement-fields">
          {JUMP_TESTS.map((test) => {
            const invalid = values[test.id] !== '' && parseJumpCentimeters(values[test.id], test.id) === null
            return <div className="jump-measurement-field" key={test.id}>
              <label className="field-label" htmlFor={`jump-${test.id}`}>{test.label}</label>
              <p className="helper-text" id={`jump-hint-${test.id}`}>{test.hint}</p>
              <div className="jump-value-input">
                <input id={`jump-${test.id}`} className="field" type="text" inputMode="decimal"
                  value={values[test.id] ?? ''} placeholder={test.unit === 'Sprungweite' ? 'z. B. 210' : 'z. B. 48'}
                  aria-invalid={invalid} aria-describedby={`jump-hint-${test.id}`}
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [test.id]: event.target.value }))
                    setError('')
                  }} />
                <span>cm</span>
              </div>
              {invalid && <p className="field-error" role="alert">Bitte einen Wert über 0 bis {test.maxCm} cm eingeben.</p>}
            </div>
          })}
        </div>
        <p className="helper-text">Vorhandene Werte für dieses Datum kannst du hier ändern. Ein leeres Feld bleibt unverändert.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button">Sprungwerte speichern</button>
      </form>
      {sorted.length > 0 && <section className="jump-measurement-history">
        <h3>Gespeicherte Sprungwerte</h3>
        <div className="jump-measurement-list">
          {sorted.map((item) => <div className="jump-measurement-item" key={item.id}>
            <div><strong>{JUMP_TESTS.find((test) => test.id === item.testId)?.label}</strong>
              <small>{formatDate(item.date)} · {item.valueCm} cm</small></div>
            <div className="jump-measurement-actions">
              <button type="button" className="secondary-button" onClick={() => chooseDate(item.date)}>Bearbeiten</button>
              <button type="button" className="secondary-button" aria-label={`Sprungwert vom ${formatDate(item.date)} löschen`}
                onClick={() => remove(item.id)}>Löschen</button>
            </div>
          </div>)}
        </div>
      </section>}
    </EntryWindow>}
  </section>
}
