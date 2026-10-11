import { RatingStepper } from './VolleyballInputs.jsx'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, MEASUREMENT_TYPES,
  exerciseMeasurement, formatTrainingEntry, previousExercise, isConfirmedSet,
  hasLegacyValues, canonicalCategory,
} from './trainingModel.js'

const legacyLabels = {
  sets: 'Sätze', reps: 'Wiederholungen', weight: 'Gewicht (kg)',
  duration: 'Dauer (Min.)', distance: 'Distanz', result: 'Messwert',
}
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})

function NumberField({ label, value, onChange, step = 'any' }) {
  return <label className="training-field">{label}
    <input className="field" type="number" inputMode="decimal" min="0" step={step}
      value={value ?? ''} onChange={(event) => {
        const next = event.target.value
        if (next === '' || (Number.isFinite(Number(next)) && Number(next) >= 0)) onChange(next)
      }} />
  </label>
}

function SetFields({ entry, type, onChange }) {
  const number = (label, field, step) => <NumberField label={label} value={entry[field]}
    step={step} onChange={(value) => onChange({ [field]: value })} />
  const timed = ['duration', 'distance'].includes(type)
  return <>
    <div className="training-activity-fields">
      {['strength', 'reps', 'jump'].includes(type) && number('Wiederholungen', 'reps', '1')}
      {type === 'strength' && number('Gewicht (kg, optional bei Eigengewicht)', 'weightKg')}
      {type === 'jump' && number('Sprunghöhe (cm)', 'heightCm')}
      {type === 'distance' && number('Distanz', 'distanceValue')}
      {type === 'distance' && <label className="training-field">Einheit
        <select className="field" value={entry.distanceUnit ?? 'm'}
          onChange={(event) => onChange({ distanceUnit: event.target.value })}>
          <option value="m">Meter</option><option value="km">Kilometer</option>
        </select></label>}
      {timed && number('Dauer', 'durationValue')}
      {timed && <label className="training-field">Einheit
        <select className="field" value={entry.durationUnit ?? 's'}
          onChange={(event) => onChange({ durationUnit: event.target.value })}>
          <option value="s">Sekunden</option><option value="min">Minuten</option>
        </select></label>}
    </div>
    <input className="field training-set-note" aria-label="Notiz zum Satz"
      placeholder="Notiz zum Satz (optional)" value={entry.notes ?? ''}
      onChange={(event) => onChange({ notes: event.target.value })} />
  </>
}

export default function GuidedTrainingPanel({
  session, sessions, library, plans, step, setStep, activeExerciseId, group, setGroup,
  editingSetId, setEditingSetId, flowMessage, newCategory, setNewCategory,
  customName, setCustomName, customType, setCustomType, customGroup, setCustomGroup,
  onAddExercise, onOpenExercise, onApplyPlan, onCreateCustom, onUpdateSession,
  onUpdateExercise, onRemoveExercise, onConfirmSet, onFinishExercise,
  onSave, onClose, onRecategorize,
}) {
  const exercise = session.exercises.find((item) => item.id === activeExerciseId)
  const type = exercise && exerciseMeasurement({ ...exercise, category: session.category })
  const entries = exercise?.entries ?? []
  const confirmed = entries.filter((entry) => isConfirmedSet(entry, type))
  const draft = entries.find((entry) => entry.completed === false)
  const previous = exercise && previousExercise(sessions, session, exercise)
  const previousSets = previous?.item.entries?.filter((entry) => isConfirmedSet(entry,
    exerciseMeasurement({ ...previous.item, category: session.category })))
    .map((entry) => formatTrainingEntry(entry,
      exerciseMeasurement({ ...previous.item, category: session.category }))).filter(Boolean)
  const available = library.filter((item) => item.category === session.category)
  const groups = [...new Set(available.map((item) => item.muscleGroup || 'Ohne Muskelgruppe'))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'))
  const planOptions = plans.filter((plan) =>
    canonicalCategory(plan.category, plan.name) === session.category)
  const nextPlannedExercise = session.planId && session.exercises.find((item) => !item.done
    && !(item.entries ?? []).some((entry) => isConfirmedSet(entry,
      exerciseMeasurement({ ...item, category: session.category }))))

  return <section className="diary-panel active-workout training-flow">
    <p className="eyebrow">{formatDate(session.date)} · {session.category}</p>
    <div className="training-flow-steps" aria-label="Fortschritt der Trainingserfassung">
      <span className={step === 'exercise' ? 'current' : ''}>1 Übung</span>
      <span className={step === 'set' ? 'current' : ''}>2 Sätze</span>
      <span className={step === 'summary' ? 'current' : ''}>3 Abschluss</span>
    </div>

    {step === 'exercise' && <>
      <h2>Nächste Übung wählen</h2>
      {!TRAINING_CATEGORIES.includes(session.category) ? <div className="training-legacy">
        <p>Dieser ältere Eintrag gehört noch zur Kategorie „{session.category}“. Wähle die passende neue Kategorie, damit seine Übungen eindeutig zugeordnet werden.</p>
        <select className="field" aria-label="Neue Hauptkategorie" value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}>
          {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        <button type="button" className="secondary-button" onClick={() => onRecategorize(newCategory)}>Kategorie übernehmen</button>
      </div> : <>
        {nextPlannedExercise && <button type="button" className="training-choice training-next-planned"
          onClick={() => onOpenExercise(nextPlannedExercise)}>
          Nächste Übung: {nextPlannedExercise.name} <span>›</span>
        </button>}
        {session.exercises.length > 0 && <div className="training-done-list">
          <h3>Diese Einheit</h3>
          {session.exercises.map((item) => {
            const itemType = exerciseMeasurement({ ...item, category: session.category })
            const count = (item.entries ?? []).filter((entry) => isConfirmedSet(entry, itemType)).length
            return <button type="button" className="training-done-row" key={item.id}
              onClick={() => onOpenExercise(item)}>
              <span>{item.name}</span><span>{count ? `${count} Sätze ✓` : 'Offen'} ›</span>
            </button>
          })}
        </div>}
        {!session.exercises.length && planOptions.length > 0 && <details className="training-custom">
          <summary>Trainingsvorlage verwenden</summary>
          {planOptions.map((plan) => <button type="button" className="training-choice" key={plan.id}
            onClick={() => onApplyPlan(plan)}>{plan.name} · {plan.exercises.length} Übungen</button>)}
        </details>}
        {session.category === 'Krafttraining' && <>
          <h3>Muskelgruppe wählen</h3>
          <div className="training-choice-grid">{groups.map((muscle) =>
            <button type="button" key={muscle}
              className={group === muscle ? 'training-choice selected' : 'training-choice'}
              onClick={() => { setGroup(muscle); setCustomGroup(muscle === 'Ohne Muskelgruppe' ? 'Ganzkörper' : muscle) }}>
              {muscle}</button>)}</div>
        </>}
        {(session.category !== 'Krafttraining' || group) && <>
          <h3>{session.category === 'Krafttraining' ? `Übungen: ${group}` : 'Übung wählen'}</h3>
          <div className="training-choice-list">{available
            .filter((item) => session.category !== 'Krafttraining'
              || (item.muscleGroup || 'Ohne Muskelgruppe') === group)
            .map((item) => <button type="button" className="training-choice" key={item.id}
              onClick={() => onAddExercise(item)}>{item.name}<span>›</span></button>)}</div>
        </>}
        <details className="training-custom"><summary>Eigene Übung anlegen</summary>
          <label className="field-label" htmlFor="custom-name">Übungsname</label>
          <input id="custom-name" className="field" value={customName}
            onChange={(event) => setCustomName(event.target.value)} />
          <label className="field-label" htmlFor="custom-type">Was wird gemessen?</label>
          <select id="custom-type" className="field" value={customType}
            onChange={(event) => setCustomType(event.target.value)}>
            {MEASUREMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {session.category === 'Krafttraining' && <>
            <label className="field-label" htmlFor="custom-group">Muskelgruppe</label>
            <select id="custom-group" className="field" value={customGroup}
              onChange={(event) => setCustomGroup(event.target.value)}>
              {MUSCLE_GROUPS.map((muscle) => <option key={muscle}>{muscle}</option>)}
            </select></>}
          <button type="button" className="secondary-button" onClick={onCreateCustom}>Anlegen und ersten Satz öffnen</button>
        </details>
        {flowMessage && <p className="training-flow-error" role="alert">{flowMessage}</p>}
        <div className="training-finish-actions">
          <button type="button" className="primary-button" onClick={() => setStep('summary')}>Training beenden</button>
          <button type="button" className="secondary-button" onClick={onClose}>Für später schließen</button>
        </div>
      </>}
    </>}

    {step === 'set' && exercise && <>
      <h2>{exercise.name}</h2>
      <p className="history-meta">{session.category === 'Krafttraining'
        ? exercise.muscleGroup || 'Ohne Muskelgruppe' : session.category}</p>
      {previousSets?.length > 0 && <p className="training-previous">
        Zuletzt am {formatDate(previous.session.date)}: {previousSets.join(' · ')}
      </p>}
      {hasLegacyValues(exercise) && <div className="training-legacy">
        <strong>Früherer Sammeleintrag</strong>
        <p className="helper-text">Die alten Werte bleiben erhalten. Damals wurden keine einzelnen Sätze erfasst.</p>
        <div className="training-activity-fields">{Object.entries(legacyLabels)
          .filter(([field]) => exercise[field] !== '' && exercise[field] != null)
          .map(([field, label]) => <label className="training-field" key={field}>{label}
            <input className="field" value={exercise[field] ?? ''}
              onChange={(event) => onUpdateExercise(exercise.id, { [field]: event.target.value })} /></label>)}</div>
      </div>}
      {confirmed.length > 0 && <div className="training-done-list">
        <h3>Bestätigte Sätze</h3>
        {confirmed.map((entry, index) => <div className="training-completed-set" key={entry.id}>
          <button type="button" className="training-done-row"
            onClick={() => setEditingSetId(editingSetId === entry.id ? null : entry.id)}>
            <span>✓ Satz {index + 1}: {formatTrainingEntry(entry, type)}</span>
            <span>{editingSetId === entry.id ? 'Schließen' : 'Bearbeiten'}</span>
          </button>
          {editingSetId === entry.id && <SetFields entry={entry} type={type}
            onChange={(changes) => onUpdateExercise(exercise.id, { entries: entries.map((item) =>
              item.id === entry.id ? { ...item, ...changes } : item) })} />}
          {editingSetId === entry.id && <button type="button" className="text-button"
            onClick={() => { onUpdateExercise(exercise.id, { entries: entries.filter((item) =>
              item.id !== entry.id) }); setEditingSetId(null) }}>Satz entfernen</button>}
        </div>)}
      </div>}
      {draft && <div className="training-current-set">
        <p className="eyebrow">SATZ {confirmed.length + 1}</p>
        <h3>Werte eintragen</h3>
        <SetFields entry={draft} type={type}
          onChange={(changes) => onUpdateExercise(exercise.id, { entries: entries.map((item) =>
            item.id === draft.id ? { ...item, ...changes } : item) })} />
        {flowMessage && <p className="training-flow-error" role="alert">{flowMessage}</p>}
        <button type="button" className="primary-button" onClick={onConfirmSet}>✓ Satz bestätigen · nächster Satz</button>
      </div>}
      <label className="field-label" htmlFor="exercise-notes">Notizen zur Übung</label>
      <textarea id="exercise-notes" className="field notes-field" rows="2"
        value={exercise.notes ?? ''} onChange={(event) => onUpdateExercise(exercise.id,
          { notes: event.target.value })} />
      {flowMessage && !draft && <p className="training-flow-error" role="alert">{flowMessage}</p>}
      <div className="training-finish-actions">
        <button type="button" className="secondary-button" onClick={onFinishExercise}>✓ Übung abschließen</button>
        <button type="button" className="text-button" onClick={() => setStep('exercise')}>Zur Übungsauswahl</button>
        <button type="button" className="text-button" onClick={() => onRemoveExercise(exercise)}>Übung entfernen</button>
      </div>
    </>}

    {step === 'summary' && <>
      <h2>Training abschließen</h2>
      <p className="helper-text">Prüfe deine Einheit. Erst mit „Training speichern“ ist sie abgeschlossen.</p>
      <label className="field-label" htmlFor="session-date">Datum</label>
      <input id="session-date" className="field" type="date" value={session.date}
        onChange={(event) => onUpdateSession({ date: event.target.value })} />
      <NumberField label="Dauer der Einheit (Min., optional)" value={session.durationMinutes}
        onChange={(value) => onUpdateSession({ durationMinutes: value })} />
      <RatingStepper id="session-intensity" label="Anstrengung der Einheit (1–10, optional)"
        value={session.intensity ?? ''} onChange={(value) => onUpdateSession({ intensity: value })} />
      <label className="field-label" htmlFor="session-notes">Notizen zur Einheit</label>
      <textarea id="session-notes" className="field notes-field" rows="3" value={session.notes ?? ''}
        onChange={(event) => onUpdateSession({ notes: event.target.value })} />
      <div className="training-done-list">
        {session.exercises.map((item) => {
          const itemType = exerciseMeasurement({ ...item, category: session.category })
          const count = (item.entries ?? []).filter((entry) => isConfirmedSet(entry, itemType)).length
          return <p key={item.id}>{item.name}: {count} bestätigte Sätze</p>
        })}
      </div>
      {flowMessage && <p className="training-flow-error" role="alert">{flowMessage}</p>}
      <div className="training-finish-actions">
        <button type="button" className="primary-button" onClick={onSave}>Training speichern</button>
        <button type="button" className="secondary-button" onClick={() => setStep('exercise')}>Zur Übungsauswahl</button>
      </div>
    </>}
  </section>
}
