import { useState } from 'react'
import { RatingStepper } from './VolleyballInputs.jsx'
import { NumberWheel, ChoiceWheel } from './WheelPicker.jsx'
import DateWheel from './DateWheel.jsx'
import EntryWindow from './EntryWindow.jsx'
import { strengthRoleFor } from './strengthClassification.js'
import ExerciseInfo from './ExerciseInfo.jsx'
import TrainingTimer from './TrainingTimer.jsx'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, MEASUREMENT_TYPES,
  exerciseMeasurement, formatTrainingEntry, previousExercise, previousSetFor, isConfirmedSet,
  hasLegacyValues, defaultMeasurement, suggestedTrainingSet, isSportTrainingCategory,
  dumbbellCount, isBodyweightOnly, isExternalLoad,
} from './trainingModel.js'

const legacyLabels = {
  sets: 'Sätze', reps: 'Wiederholungen', weight: 'Gewicht (kg)',
  duration: 'Dauer (Min.)', distance: 'Distanz', result: 'Messwert',
}
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})

function NumberField({ label, value, suggestion, onChange, min = 0, max = 300, step = 1 }) {
  return <NumberWheel label={label} value={value} suggestion={suggestion}
    min={min} max={max} step={step} onChange={onChange} />
}

function SetFields({ entry, type, exercise, athleteProfile, previous, onChange }) {
  const suggested = suggestedTrainingSet(entry, previous, type, exercise)
  const number = (label, field) => <NumberField label={label} value={entry[field]}
    suggestion={previous ? suggested[field] : ''}
    min={field === 'reps' ? 1 : 0}
    max={field === 'reps' ? 100 : field === 'weightKg' ? 300 : field === 'heightCm' ? 200
      : field === 'distanceValue' ? entry.distanceUnit === 'km' ? 100 : 10000
        : entry.durationUnit === 'min' ? 240 : 3600}
    step={field === 'weightKg' ? .5 : field === 'distanceValue' && entry.distanceUnit === 'km' ? .01 : 1}
    onChange={(value) => onChange({ [field]: value })} />
  const timed = ['duration', 'distance', 'carry'].includes(type)
  const bodyweightOnly = isBodyweightOnly(exercise)
  const bodyweight = exercise.loadMode === 'bodyweight'
    && !bodyweightOnly && !isExternalLoad(exercise)
  const dumbbells = dumbbellCount(exercise)
  const interval = Boolean(exercise.intervalWorkMinutes)
  const bodyweightKg = entry.bodyweightKg || athleteProfile.bodyweightKg
  return <>
    <div className="training-activity-fields">
      {['strength', 'reps', 'jump'].includes(type) && number('Wiederholungen', 'reps')}
      {['strength', 'jump', 'reps', 'duration'].includes(type) && bodyweight && <p className="training-bodyweight">
        Eigengewicht: {bodyweightKg ? `${bodyweightKg} kg` : 'noch nicht im Profil hinterlegt'}
      </p>}
      {!bodyweightOnly && (type === 'strength' || type === 'jump' || type === 'carry'
        || (type === 'reps' && bodyweight))
        && number(bodyweight && dumbbells === 2 ? 'Zusatzgewicht je Hantel (kg, optional)'
          : bodyweight && dumbbells === 1 ? 'Zusatzgewicht der Hantel (kg, optional)'
            : bodyweight ? 'Zusatzgewicht gesamt (kg, optional)'
          : dumbbells === 2 ? 'Gewicht je Hantel (kg, optional)'
            : dumbbells === 1 ? 'Gewicht der Hantel (kg, optional)'
              : 'Gewicht (kg, optional)', 'weightKg')}
      {type === 'jump' && number('Sprunghöhe (cm, optional)', 'heightCm')}
      {['distance', 'carry'].includes(type) && number(interval ? 'Distanz (optional)' : 'Distanz', 'distanceValue')}
      {['distance', 'carry'].includes(type) && <ChoiceWheel label="Distanzeinheit"
        value={entry.distanceUnit ?? 'm'} options={[{ value: 'm', label: 'Meter' }, { value: 'km', label: 'Kilometer' }]}
        onChange={(distanceUnit) => onChange({ distanceUnit })} />}
      {timed && number(interval ? 'Tatsächlich geschaffte Belastungsdauer' : 'Dauer', 'durationValue')}
      {timed && <ChoiceWheel label="Zeiteinheit" value={entry.durationUnit ?? 's'}
        options={[{ value: 's', label: 'Sekunden' }, { value: 'min', label: 'Minuten' }]}
        onChange={(durationUnit) => onChange({ durationUnit })} />}
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
  session, sessions, library, athleteProfile, exerciseCategory, setExerciseCategory,
  step, setStep, activeExerciseId, group, setGroup,
  editingSetId, setEditingSetId, flowMessage, newCategory, setNewCategory,
  customName, setCustomName, customType, setCustomType, customGroup, setCustomGroup,
  customStrengthRole, setCustomStrengthRole,
  onAddExercise, onOpenExercise, onCreateCustom, onUpdateSession,
  onUpdateExercise, onRemoveExercise, onConfirmSet, onFinishExercise,
  onTimerDuration,
  onSave, onClose, onRecategorize, onCancel,
}) {
  const [showCustomExercise, setShowCustomExercise] = useState(false)
  const exercise = session.exercises.find((item) => item.id === activeExerciseId)
  const type = exercise && exerciseMeasurement({ ...exercise, category: session.category })
  const entries = exercise?.entries ?? []
  const confirmed = entries.filter((entry) => isConfirmedSet(entry, type))
  const editingIndex = confirmed.findIndex((entry) => entry.id === editingSetId)
  const editingEntry = confirmed[editingIndex]
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
    .sort((a, b) => exerciseCategory === 'Krafttraining'
      ? (MUSCLE_GROUPS.includes(a) ? MUSCLE_GROUPS.indexOf(a) : MUSCLE_GROUPS.length)
        - (MUSCLE_GROUPS.includes(b) ? MUSCLE_GROUPS.indexOf(b) : MUSCLE_GROUPS.length)
        || a.localeCompare(b, 'de-DE')
      : a.localeCompare(b, 'de-DE'))
  const needsGroup = groups.length > 1
  const categoryChoices = session.planId ? session.categories ?? [session.category]
    : TRAINING_CATEGORIES.filter((category) => !isSportTrainingCategory(category))
  const nextPlannedExercise = session.planId && session.exercises.find((item) => !item.done
    && !(item.entries ?? []).some((entry) => isConfirmedSet(entry,
      exerciseMeasurement({ ...item, category: session.category }))))

  return <section className="diary-panel active-workout training-flow">
    <p className="eyebrow">{formatDate(session.date)} · {session.planId
      ? session.category : 'Individuelles Training'}</p>
    <div className="training-flow-steps" aria-label="Fortschritt der Trainingserfassung">
      <span className={step === 'exercise' ? 'current' : ''}>1 Übung</span>
      <span className={step === 'set' ? 'current' : ''}>2 {exercise?.category === 'Ausdauer' ? 'Phasen' : 'Sätze'}</span>
      <span className={step === 'summary' ? 'current' : ''}>3 Abschluss</span>
    </div>

    {step === 'exercise' && <>
      <h2>Nächste Übung wählen</h2>
      {!TRAINING_CATEGORIES.includes(session.category) ? <div className="training-legacy">
        <p>Dieser ältere Eintrag gehört noch zur Kategorie „{session.category}“. Wähle die passende neue Kategorie, damit seine Übungen eindeutig zugeordnet werden.</p>
        <ChoiceWheel label="Neue Hauptkategorie" value={newCategory}
          options={TRAINING_CATEGORIES} onChange={setNewCategory} />
        <button type="button" className="secondary-button" onClick={() => onRecategorize(newCategory)}>Kategorie übernehmen</button>
      </div> : <>
        {!session.planId && <h3>Hauptkategorie wählen</h3>}
        {(categoryChoices.length > 1 || !session.planId) && <div className="training-category-tabs">
          {categoryChoices.map((category) => <button type="button"
            key={category} className={exerciseCategory === category ? 'training-choice selected' : 'training-choice'}
            onClick={() => { setExerciseCategory(category); setGroup('');
              setCustomType(defaultMeasurement(category))
              setCustomGroup(category === 'Krafttraining' ? MUSCLE_GROUPS[0]
                : library.find((item) => item.category === category)?.muscleGroup || 'Allgemein') }}>
            {category}</button>)}
        </div>}
        {!exerciseCategory && <p className="helper-text">Wähle zuerst eine Hauptkategorie. Du kannst sie nach jeder Übung wieder wechseln.</p>}
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
            if (item.guidedEndurance && item.done) return <div className="training-done-row" key={item.id}>
              <span>{item.name}</span><span>Geführte Übung abgeschlossen ✓</span>
            </div>
            return <button type="button" className="training-done-row" key={item.id}
              onClick={() => onOpenExercise(item)}>
              <span>{item.name}</span><span>{count ? `${count} Sätze ✓` : 'Offen'} ›</span>
            </button>
          })}
        </div>}
        {exerciseCategory && needsGroup && <>
          <h3>{exerciseCategory === 'Krafttraining' ? 'Muskelgruppe wählen' : 'Schwerpunkt wählen'}</h3>
          <div className="training-choice-grid">{groups.map((muscle) =>
            <button type="button" key={muscle}
              className={group === muscle ? 'training-choice selected' : 'training-choice'}
              onClick={() => { setGroup(muscle); setCustomGroup(muscle) }}>
              {muscle}</button>)}</div>
        </>}
        {exerciseCategory && (!needsGroup || group) && <>
          <h3>{group && needsGroup ? `Übungen: ${group}` : 'Übung wählen'}</h3>
          <div className="training-choice-list">{available
            .filter((item) => !needsGroup || (item.muscleGroup || 'Allgemein') === group)
            .sort((a, b) => exerciseCategory === 'Krafttraining'
              ? Number(strengthRoleFor(a) === 'isolation')
                - Number(strengthRoleFor(b) === 'isolation')
                || a.name.localeCompare(b.name, 'de-DE')
              : a.name.localeCompare(b.name, 'de-DE'))
            .map((item) => <div className="training-exercise-row" key={item.id}>
              <button type="button" className="training-choice"
                onClick={() => onAddExercise(item)}>{item.name}
                {exerciseCategory === 'Krafttraining'
                  && <small>{strengthRoleFor(item) === 'compound' ? 'Grundübung' : 'Isolationsübung'}</small>}
                <span>›</span></button>
              <ExerciseInfo exercise={item} />
            </div>)}</div>
        </>}
        {exerciseCategory && <button type="button" className="secondary-button training-custom"
          onClick={() => setShowCustomExercise(true)}>Eigene Übung anlegen</button>}
        {exerciseCategory && showCustomExercise && <EntryWindow title="Eigene Übung anlegen" subtitle="DEIN TRAINING"
          onClose={() => setShowCustomExercise(false)}>
          <label className="field-label" htmlFor="custom-name">Übungsname</label>
          <input id="custom-name" className="field" value={customName}
            onChange={(event) => setCustomName(event.target.value)} />
          <ChoiceWheel label="Was wird gemessen?" value={customType}
            options={MEASUREMENT_TYPES.map(([value, label]) => ({ value, label }))}
            onChange={setCustomType} />
          <>
            <ChoiceWheel label={exerciseCategory === 'Krafttraining' ? 'Muskelgruppe' : 'Schwerpunkt'}
              value={customGroup} onChange={setCustomGroup}
              options={[...new Set([...groups, customGroup,
                ...(exerciseCategory === 'Krafttraining' ? MUSCLE_GROUPS : [])])]} />
          </>
          {exerciseCategory === 'Krafttraining' && <>
            <ChoiceWheel label="Übungsart" value={customStrengthRole}
              options={[{ value: 'compound', label: 'Grundübung' },
                { value: 'isolation', label: 'Isolationsübung' }]}
              onChange={setCustomStrengthRole} />
          </>}
          <button type="button" className="secondary-button"
            onClick={() => { onCreateCustom(); setShowCustomExercise(false) }}>Anlegen und ersten Satz öffnen</button>
        </EntryWindow>}
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
        <ExerciseInfo key={exercise.id} exercise={exercise} />
      </div>
      <p className="history-meta">{exercise.category === 'Krafttraining'
        ? exercise.muscleGroup || 'Ohne Muskelgruppe' : exercise.category || session.category}</p>
      {exercise.target && <p className="training-target">Vorschlag: {exercise.target}</p>}
      {hasLegacyValues(exercise) && <div className="training-legacy">
        <strong>Früherer Sammeleintrag</strong>
        <p className="helper-text">Die alten Werte bleiben erhalten. Damals wurden keine einzelnen Sätze erfasst.</p>
        <div className="training-activity-fields">{Object.entries(legacyLabels)
          .filter(([field]) => exercise[field] !== '' && exercise[field] != null)
          .map(([field, label]) => field === 'result'
            ? <label className="training-field" key={field}>{label}
              <input className="field" value={exercise[field] ?? ''}
                onChange={(event) => onUpdateExercise(exercise.id, { [field]: event.target.value })} /></label>
            : <NumberWheel key={field} label={label} value={exercise[field] ?? ''}
              min={field === 'reps' || field === 'sets' ? 1 : 0}
              max={field === 'weight' ? 300 : field === 'distance' ? 10000 : 240}
              step={field === 'weight' ? .5 : 1} allowEmpty={false}
              onChange={(value) => onUpdateExercise(exercise.id, { [field]: value })} />)}</div>
      </div>}
      {confirmed.length > 0 && <div className="training-done-list">
        <h3>Bestätigte Sätze</h3>
        {confirmed.map((entry, index) => <div className="training-completed-set" key={entry.id}>
          <button type="button" className="training-done-row"
            onClick={() => setEditingSetId(entry.id)}>
            <span>✓ Satz {index + 1}: {formatTrainingEntry(entry, type, exercise)}</span>
            <span>Bearbeiten</span>
          </button>
        </div>)}
      </div>}
      {editingEntry && <EntryWindow title={`Satz ${editingIndex + 1} bearbeiten`}
        subtitle={exercise.name} onClose={() => setEditingSetId(null)}>
        <PreviousExerciseReference number={editingIndex + 1} value={referenceFor(editingIndex)} />
        <SetFields entry={editingEntry} type={type} exercise={exercise} athleteProfile={athleteProfile}
          onChange={(changes) => onUpdateExercise(exercise.id, { entries: entries.map((item) =>
            item.id === editingEntry.id ? { ...item, ...changes } : item) })} />
        <button type="button" className="secondary-button" onClick={() => setEditingSetId(null)}>Werte übernehmen</button>
        <button type="button" className="text-button" onClick={() => {
          onUpdateExercise(exercise.id, { entries: entries.filter((item) => item.id !== editingEntry.id) })
          setEditingSetId(null)
        }}>Satz entfernen</button>
      </EntryWindow>}
      {draft && <div className="training-current-set">
        <p className="eyebrow">SATZ {confirmed.length + 1}</p>
        <h3>Werte eintragen</h3>
        <PreviousExerciseReference number={confirmed.length + 1} value={referenceFor(confirmed.length)} />
        {previousEntryFor(confirmed.length) && <p className="training-suggestion-help">
          Vorschläge werden beim Bestätigen übernommen. Drehe ein Rad, um den Wert zu ändern.
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
      <DateWheel label="Datum" value={session.date}
        onChange={(date) => onUpdateSession({ date })} />
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
          return <p key={item.id}>{item.name}: {item.guidedEndurance && item.done
            ? 'geführte Übung abgeschlossen' : `${count} bestätigte Sätze`}</p>
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
