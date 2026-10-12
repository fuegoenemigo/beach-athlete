import { RatingStepper } from './VolleyballInputs.jsx'
import ExerciseInfo from './ExerciseInfo.jsx'
import TrainingTimer from './TrainingTimer.jsx'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, MEASUREMENT_TYPES,
  exerciseMeasurement, formatTrainingEntry, previousExercise, previousSetFor, isConfirmedSet,
  hasLegacyValues, canonicalCategory, defaultMeasurement, suggestedTrainingSet,
} from './trainingModel.js'

const legacyLabels = {
  sets: 'Sätze', reps: 'Wiederholungen', weight: 'Gewicht (kg)',
  duration: 'Dauer (Min.)', distance: 'Distanz', result: 'Messwert',
}
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})

function NumberField({ label, value, suggestion, onChange, step = 'any' }) {
  return <label className="training-field">{label}
    <input className="field" type="number" inputMode="decimal" min="0" step={step}
      value={value ?? ''} placeholder={suggestion ?? ''} onChange={(event) => {
        const next = event.target.value
        if (next === '' || (Number.isFinite(Number(next)) && Number(next) >= 0)) onChange(next)
      }} />
  </label>
}

function SetFields({ entry, type, exercise, athleteProfile, previous, onChange }) {
  const suggested = suggestedTrainingSet(entry, previous, type, exercise)
  const number = (label, field, step) => <NumberField label={label} value={entry[field]}
    suggestion={previous ? suggested[field] : ''}
    step={step} onChange={(value) => onChange({ [field]: value })} />
  const timed = ['duration', 'distance', 'carry'].includes(type)
  const bodyweight = exercise.loadMode === 'bodyweight'
  const interval = Boolean(exercise.intervalWorkMinutes)
  const bodyweightKg = entry.bodyweightKg || athleteProfile.bodyweightKg
  return <>
    <div className="training-activity-fields">
      {['strength', 'reps', 'jump'].includes(type) && number('Wiederholungen', 'reps', '1')}
      {['strength', 'jump', 'reps'].includes(type) && bodyweight && <p className="training-bodyweight">
        Eigengewicht: {bodyweightKg ? `${bodyweightKg} kg` : 'noch nicht im Profil hinterlegt'}
      </p>}
      {(type === 'strength' || type === 'jump' || type === 'carry' || (type === 'reps' && bodyweight))
        && number(bodyweight ? 'Zusätzliches Gewicht (kg, optional)' : 'Gewicht (kg, optional)', 'weightKg')}
      {type === 'jump' && number('Sprunghöhe (cm, optional)', 'heightCm')}
      {['distance', 'carry'].includes(type) && number(interval ? 'Distanz (optional)' : 'Distanz', 'distanceValue')}
      {['distance', 'carry'].includes(type) && <label className="training-field">Einheit
        <select className="field" value={entry.distanceUnit ?? 'm'}
          onChange={(event) => onChange({ distanceUnit: event.target.value })}>
          <option value="m">Meter</option><option value="km">Kilometer</option>
        </select></label>}
      {timed && number(interval ? 'Tatsächlich geschaffte Belastungsdauer' : 'Dauer', 'durationValue')}
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

function PreviousExerciseReference({ number, value }) {
  if (!value) return null
  return <aside className="training-reference" aria-label="Werte der letzten Ausführung">
    <strong>Letzter Wert für Satz {number}</strong>
    <span>{value}</span>
  </aside>
}

export default function GuidedTrainingPanel({
  session, sessions, library, plans, athleteProfile, exerciseCategory, setExerciseCategory,
  step, setStep, activeExerciseId, group, setGroup,
  editingSetId, setEditingSetId, flowMessage, newCategory, setNewCategory,
  customName, setCustomName, customType, setCustomType, customGroup, setCustomGroup,
  onAddExercise, onOpenExercise, onApplyPlan, onCreateCustom, onUpdateSession,
  onUpdateExercise, onRemoveExercise, onConfirmSet, onFinishExercise,
  onTimerDuration,
  onSave, onClose, onRecategorize, onCancel,
}) {
  const exercise = session.exercises.find((item) => item.id === activeExerciseId)
  const type = exercise && exerciseMeasurement({ ...exercise, category: session.category })
  const entries = exercise?.entries ?? []
  const confirmed = entries.filter((entry) => isConfirmedSet(entry, type))
  const draft = entries.find((entry) => entry.completed === false)
  const previous = exercise && previousExercise(sessions, session, exercise)
  const previousEntryFor = (index) => previous && exerciseMeasurement({ ...previous.item,
    category: previous.item.category ?? previous.session.category }) === type
    ? previousSetFor(previous, index) : null
  const referenceFor = (index) => {
    const entry = previousSetFor(previous, index)
    return entry ? formatTrainingEntry(entry,
      exerciseMeasurement({ ...previous.item,
        category: previous.item.category ?? previous.session.category }), previous.item) : null
  }
  const available = library.filter((item) => item.category === exerciseCategory
    && !(exerciseCategory === 'Ausdauer' && item.performanceRole === 'support'))
  const groups = [...new Set(available.map((item) => item.muscleGroup || 'Allgemein'))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'))
  const needsGroup = groups.length > 1
  const planOptions = plans.filter((plan) =>
    canonicalCategory(plan.category, plan.name) === session.category)
  const nextPlannedExercise = session.planId && session.exercises.find((item) => !item.done
    && !(item.entries ?? []).some((entry) => isConfirmedSet(entry,
      exerciseMeasurement({ ...item, category: session.category }))))

  return <section className="diary-panel active-workout training-flow">
    <p className="eyebrow">{formatDate(session.date)} · {session.category}</p>
    <div className="training-flow-steps" aria-label="Fortschritt der Trainingserfassung">
      <span className={step === 'exercise' ? 'current' : ''}>1 Übung</span>
      <span className={step === 'set' ? 'current' : ''}>2 {session.category === 'Ausdauer' ? 'Phasen' : 'Sätze'}</span>
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
        {(session.categories ?? [session.category]).length > 1 && <div className="training-category-tabs">
          {(session.categories ?? [session.category]).map((category) => <button type="button"
            key={category} className={exerciseCategory === category ? 'training-choice selected' : 'training-choice'}
            onClick={() => { setExerciseCategory(category); setGroup('');
              setCustomType(defaultMeasurement(category))
              setCustomGroup(library.find((item) => item.category === category)?.muscleGroup || 'Allgemein') }}>
            {category}</button>)}
        </div>}
        {nextPlannedExercise && <div className="training-exercise-row training-next-planned">
          <button type="button" className="training-choice"
            onClick={() => onOpenExercise(nextPlannedExercise)}>
            Nächste Übung: {nextPlannedExercise.name} <span>›</span>
          </button>
          <ExerciseInfo exercise={nextPlannedExercise} />
        </div>}
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
            onClick={() => onApplyPlan(plan)}>{plan.name} · {plan.guidedEndurance
              ? '1 Übung · 3 Phasen' : `${plan.exercises.length} Übungen`}</button>)}
        </details>}
        {needsGroup && <>
          <h3>{exerciseCategory === 'Krafttraining' ? 'Muskelgruppe wählen' : 'Schwerpunkt wählen'}</h3>
          <div className="training-choice-grid">{groups.map((muscle) =>
            <button type="button" key={muscle}
              className={group === muscle ? 'training-choice selected' : 'training-choice'}
              onClick={() => { setGroup(muscle); setCustomGroup(muscle) }}>
              {muscle}</button>)}</div>
        </>}
        {(!needsGroup || group) && <>
          <h3>{group && needsGroup ? `Übungen: ${group}` : 'Übung wählen'}</h3>
          <div className="training-choice-list">{available
            .filter((item) => !needsGroup || (item.muscleGroup || 'Allgemein') === group)
            .sort((a, b) => a.name.localeCompare(b.name, 'de-DE'))
            .map((item) => <div className="training-exercise-row" key={item.id}>
              <button type="button" className="training-choice"
                onClick={() => onAddExercise(item)}>{item.name}<span>›</span></button>
              <ExerciseInfo exercise={item} />
            </div>)}</div>
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
          <>
            <label className="field-label" htmlFor="custom-group">
              {exerciseCategory === 'Krafttraining' ? 'Muskelgruppe' : 'Schwerpunkt'}
            </label>
            <select id="custom-group" className="field" value={customGroup}
              onChange={(event) => setCustomGroup(event.target.value)}>
              {[...new Set([...groups, customGroup,
                ...(exerciseCategory === 'Krafttraining' ? MUSCLE_GROUPS : [])])]
                .map((muscle) => <option key={muscle}>{muscle}</option>)}
            </select></>
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
      <div className="training-exercise-row training-exercise-heading">
        <h2>{exercise.name}</h2>
        <ExerciseInfo key={exercise.id} exercise={exercise} defaultOpen />
      </div>
      <p className="history-meta">{exercise.category === 'Krafttraining'
        ? exercise.muscleGroup || 'Ohne Muskelgruppe' : exercise.category || session.category}</p>
      {exercise.target && <p className="training-target">Vorschlag: {exercise.target}</p>}
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
            <span>✓ Satz {index + 1}: {formatTrainingEntry(entry, type, exercise)}</span>
            <span>{editingSetId === entry.id ? 'Schließen' : 'Bearbeiten'}</span>
          </button>
          {editingSetId === entry.id && <PreviousExerciseReference number={index + 1}
            value={referenceFor(index)} />}
          {editingSetId === entry.id && <SetFields entry={entry} type={type}
            exercise={exercise} athleteProfile={athleteProfile}
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
        <PreviousExerciseReference number={confirmed.length + 1} value={referenceFor(confirmed.length)} />
        {previousEntryFor(confirmed.length) && <p className="training-suggestion-help">
          Graue Werte werden beim Bestätigen übernommen. Tippe ins Feld, um sie zu ändern.
        </p>}
        {['duration', 'distance', 'carry'].includes(type) && <TrainingTimer
          key={draft.id} sessionId={session.id} exercise={exercise} entry={draft}
          confirmedCount={confirmed.length}
          onDuration={(seconds, setId) => onTimerDuration(exercise.id, seconds, setId)} />}
        <SetFields entry={draft} type={type} exercise={exercise} athleteProfile={athleteProfile}
          previous={previousEntryFor(confirmed.length)}
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
    {session.status !== 'completed' && <button type="button" className="text-button training-cancel-action"
      onClick={onCancel}>Training abbrechen</button>}
  </section>
}
