import { useState } from 'react'
import { RatingStepper } from './VolleyballInputs.jsx'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, SPORTS, MEASUREMENT_TYPES,
  defaultMeasurement, exerciseIdentity, exerciseMeasurement,
  createLoggedExercise, createTrainingSet, hasLegacyValues,
  previousExercise, formatTrainingEntry,
} from './trainingModel.js'
import './TrainingView.css'

const today = () => new Date().toLocaleDateString('sv-SE')
const legacyLabels = {
  sets: 'Sätze', reps: 'Wiederholungen', weight: 'Gewicht (kg)',
  duration: 'Dauer (Min.)', distance: 'Distanz', result: 'Messwert',
}
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
})

function groupsFor(library, category) {
  const items = library.filter((item) => item.category === category)
    .sort((a, b) => a.name.localeCompare(b.name, 'de-DE'))
  if (category !== 'Krafttraining') return [['Übungen', items]]
  return [...new Set(items.map((item) => item.muscleGroup || 'Ohne Muskelgruppe'))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'))
    .map((group) => [group, items.filter((item) => (item.muscleGroup || 'Ohne Muskelgruppe') === group)])
}

function ExercisePicker({ id, library, category, value, onChange }) {
  return <select id={id} className="field" value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Übung auswählen</option>
    {groupsFor(library, category).map(([group, items]) =>
      <optgroup label={group} key={group}>{items.map((item) =>
        <option key={exerciseIdentity(item)} value={exerciseIdentity(item)}>{item.name}</option>)}</optgroup>)}
  </select>
}

function NumberField({ label, value, onChange, step = 'any' }) {
  return <label className="training-field">{label}
    <input className="field" type="number" min="0" step={step} inputMode="decimal"
      value={value ?? ''} onChange={(event) => {
        const next = event.target.value
        if (next === '' || (Number.isFinite(Number(next)) && Number(next) >= 0)) onChange(next)
      }} />
  </label>
}

function SetEditor({ entry, type, index, onChange, onRemove }) {
  const number = (label, field, step) => <NumberField label={label} value={entry[field]}
    step={step} onChange={(value) => onChange({ [field]: value })} />
  const timed = type === 'duration' || type === 'distance'
  return <div className="training-set">
    <div className="training-set-heading"><strong>Satz {index + 1}</strong>
      <button type="button" className="text-button" onClick={onRemove}>Entfernen</button></div>
    <div className="training-activity-fields">
      {['strength', 'reps', 'jump'].includes(type) && number('Wiederholungen', 'reps', '1')}
      {type === 'strength' && number('Gewicht (kg)', 'weightKg')}
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
    <input className="field training-set-note" aria-label={`Notiz zu Satz ${index + 1}`}
      placeholder="Notiz zum Satz (optional)" value={entry.notes ?? ''}
      onChange={(event) => onChange({ notes: event.target.value })} />
  </div>
}

export default function TrainingView({ sessions, setSessions, exerciseLibrary,
  setExerciseLibrary, trainingPlans, setTrainingPlans, setNotice }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [newCategory, setNewCategory] = useState('Krafttraining')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [exerciseChoice, setExerciseChoice] = useState('')
  const [planChoice, setPlanChoice] = useState('')
  const [planDraft, setPlanDraft] = useState(null)
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState('strength')
  const [customGroup, setCustomGroup] = useState('Brust')
  const [libraryCategory, setLibraryCategory] = useState('Krafttraining')
  const [libraryName, setLibraryName] = useState('')
  const [libraryType, setLibraryType] = useState('strength')
  const [libraryGroup, setLibraryGroup] = useState('Brust')
  const [renamingIndex, setRenamingIndex] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const sortedSessions = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  function updateSession(changes) {
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      ? { ...session, ...changes } : session))
  }
  function updateExercise(id, changes) {
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      ? { ...session, exercises: session.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, ...changes } : exercise) } : session))
  }
  function startSession() {
    if (!selectedDate) { setNotice('Bitte wähle ein Trainingsdatum.'); return }
    const plan = trainingPlans.find((item) => item.id === selectedPlanId && item.category === newCategory)
    const session = {
      id: crypto.randomUUID(), date: selectedDate, title: plan?.name || newCategory,
      category: newCategory, subcategory: '', planId: plan?.id ?? null,
      durationMinutes: '', intensity: '', notes: '', status: 'ongoing',
      exercises: (plan?.exercises ?? []).map((reference) => {
        const item = exerciseLibrary.find((candidate) => exerciseIdentity(candidate) === reference.libraryId)
        return createLoggedExercise(item ?? { ...reference, id: reference.libraryId, category: newCategory })
      }), createdAt: new Date().toISOString(),
    }
    setSessions((previous) => [...previous, session])
    setActiveSessionId(session.id)
    setCustomType(defaultMeasurement(newCategory))
    setExerciseChoice('')
    setNotice('')
  }
  function addExercise() {
    const item = exerciseLibrary.find((candidate) => candidate.category === activeSession?.category
      && exerciseIdentity(candidate) === exerciseChoice)
    if (!item) { setNotice('Bitte wähle eine Übung aus.'); return }
    updateSession({ exercises: [...activeSession.exercises, createLoggedExercise(item)] })
    setExerciseChoice('')
    setNotice('Übung hinzugefügt.')
  }
  function createCustomExercise() {
    const name = customName.trim()
    if (!name || !activeSession) { setNotice('Bitte gib einen Übungsnamen ein.'); return }
    if (exerciseLibrary.some((item) => item.category === activeSession.category
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    const item = { id: crypto.randomUUID(), name, category: activeSession.category,
      type: customType, ...(activeSession.category === 'Krafttraining' ? { muscleGroup: customGroup } : {}) }
    setExerciseLibrary((previous) => [...previous, item])
    updateSession({ exercises: [...activeSession.exercises, createLoggedExercise(item)] })
    setCustomName('')
    setNotice('Neue Übung angelegt und hinzugefügt.')
  }
  function beginPlan(plan) {
    setPlanDraft(plan ? { ...plan, exercises: [...plan.exercises] }
      : { id: crypto.randomUUID(), name: '', category: newCategory, exercises: [] })
    setPlanChoice('')
  }
  function addPlanExercise() {
    const item = exerciseLibrary.find((candidate) => candidate.category === planDraft?.category
      && exerciseIdentity(candidate) === planChoice)
    if (!item) { setNotice('Bitte wähle eine Übung für die Vorlage aus.'); return }
    if (planDraft.exercises.some((reference) => reference.libraryId === planChoice)) {
      setNotice('Diese Übung ist bereits in der Vorlage.'); return
    }
    setPlanDraft((draft) => ({ ...draft, exercises: [...draft.exercises, {
      libraryId: exerciseIdentity(item), name: item.name, type: exerciseMeasurement(item),
      ...(item.muscleGroup ? { muscleGroup: item.muscleGroup } : {}),
    }] }))
    setPlanChoice('')
  }
  function savePlan() {
    if (!planDraft.name.trim()) { setNotice('Bitte gib der Vorlage einen Namen.'); return }
    if (!planDraft.exercises.length) { setNotice('Füge mindestens eine Übung zur Vorlage hinzu.'); return }
    const saved = { ...planDraft, name: planDraft.name.trim() }
    setTrainingPlans((previous) => previous.some((plan) => plan.id === saved.id)
      ? previous.map((plan) => plan.id === saved.id ? saved : plan) : [...previous, saved])
    setNewCategory(saved.category)
    setSelectedPlanId(saved.id)
    setPlanDraft(null)
    setNotice('Trainingsvorlage gespeichert.')
  }
  function addLibraryItem() {
    const name = libraryName.trim()
    if (!name) { setNotice('Bitte gib einen Übungsnamen ein.'); return }
    if (exerciseLibrary.some((item) => item.category === libraryCategory
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    setExerciseLibrary((previous) => [...previous, { id: crypto.randomUUID(), name,
      category: libraryCategory, type: libraryType,
      ...(libraryCategory === 'Krafttraining' ? { muscleGroup: libraryGroup } : {}) }])
    setLibraryName('')
    setNotice('Übung zur Bibliothek hinzugefügt.')
  }
  function renameLibraryItem(index) {
    const old = exerciseLibrary[index]
    const name = renameValue.trim()
    if (!name) { setNotice('Bitte gib einen Übungsnamen ein.'); return }
    if (exerciseLibrary.some((item, i) => i !== index && item.category === old.category
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    const id = exerciseIdentity(old)
    setExerciseLibrary((previous) => previous.map((item, i) => i === index ? { ...item, id, name } : item))
    setSessions((previous) => previous.map((session) => ({ ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.libraryId === id || (!exercise.libraryId && session.category === old.category
          && exercise.name === old.name) ? { ...exercise, libraryId: id, name } : exercise),
    })))
    setTrainingPlans((previous) => previous.map((plan) => ({ ...plan,
      exercises: plan.exercises.map((reference) => reference.libraryId === id
        ? { ...reference, name } : reference),
    })))
    setPlanDraft((draft) => draft ? { ...draft, exercises: draft.exercises.map((reference) =>
      reference.libraryId === id ? { ...reference, name } : reference) } : null)
    setRenamingIndex(null)
    setNotice('Übung umbenannt; ihre Trainingswerte bleiben zugeordnet.')
  }
  function changeLibraryGroup(index, group) {
    const item = exerciseLibrary[index]
    const id = exerciseIdentity(item)
    setExerciseLibrary((previous) => previous.map((entry, i) =>
      i === index ? { ...entry, id, muscleGroup: group } : entry))
    setSessions((previous) => previous.map((session) => ({ ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.libraryId === id || (!exercise.libraryId && session.category === item.category
          && exercise.name === item.name)
          ? { ...exercise, libraryId: id, muscleGroup: group } : exercise),
    })))
    setTrainingPlans((previous) => previous.map((plan) => ({ ...plan,
      exercises: plan.exercises.map((reference) => reference.libraryId === id
        ? { ...reference, muscleGroup: group } : reference),
    })))
    setPlanDraft((draft) => draft ? { ...draft, exercises: draft.exercises.map((reference) =>
      reference.libraryId === id ? { ...reference, muscleGroup: group } : reference) } : null)
  }

  return <div className="training-view">
    <section className="diary-intro">
      <p className="eyebrow">TRAININGSTAGEBUCH</p><h2>Trainieren. Erfassen. Entwickeln.</h2>
      <p>Wähle eine Vorlage oder starte frei. Erfasse die tatsächlichen Werte jeder Übung und jedes Satzes.</p>
    </section>

    {!activeSession && <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">NEUE EINHEIT</p><h2>Training starten</h2></div></div>
      <div className="training-start-grid">
        <label className="training-field" htmlFor="training-date">Datum
          <input id="training-date" className="field" type="date" value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)} /></label>
        <label className="training-field" htmlFor="training-category">Hauptkategorie
          <select id="training-category" className="field" value={newCategory}
            onChange={(event) => { setNewCategory(event.target.value); setSelectedPlanId('') }}>
            {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select></label>
      </div>
      <label className="field-label" htmlFor="training-plan">Trainingsvorlage (optional)</label>
      <select id="training-plan" className="field" value={selectedPlanId}
        onChange={(event) => setSelectedPlanId(event.target.value)}>
        <option value="">Freies Training</option>
        {trainingPlans.filter((plan) => plan.category === newCategory)
          .map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
      </select>
      {selectedPlanId && <p className="helper-text">{trainingPlans.find((plan) => plan.id === selectedPlanId)
        ?.exercises.map((item) => item.name).join(' · ')}</p>}
      <button type="button" className="primary-button" onClick={startSession}>＋ Training starten</button>
      {sessions.some((session) => session.date === selectedDate) &&
        <p className="helper-text">An diesem Tag gibt es bereits Einheiten. Du kannst eine weitere beginnen oder unten eine öffnen.</p>}
    </section>}

    {activeSession && <section className="diary-panel active-workout">
      <div className="section-heading"><div>
        <p className="eyebrow">{formatDate(activeSession.date)} · {activeSession.category}</p>
        <h2>Training erfassen</h2></div></div>
      <p className="helper-text">Änderungen werden sofort gespeichert.</p>
      <label className="field-label" htmlFor="session-title">Name der Einheit</label>
      <input id="session-title" className="field" value={activeSession.title ?? ''}
        onChange={(event) => updateSession({ title: event.target.value })} />
      {!activeSession.exercises.length && <>
        <label className="field-label" htmlFor="session-category">Hauptkategorie</label>
        <select id="session-category" className="field" value={activeSession.category}
          onChange={(event) => {
            const category = event.target.value
            updateSession({ category, subcategory: '',
              title: activeSession.title === activeSession.category ? category : activeSession.title })
            setCustomType(defaultMeasurement(category))
            setExerciseChoice('')
          }}>
          {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select></>}
      {activeSession.category === 'Sport' && <>
        <label className="field-label" htmlFor="session-sport">Sportart</label>
        <select id="session-sport" className="field" value={activeSession.subcategory ?? ''}
          onChange={(event) => updateSession({ subcategory: event.target.value })}>
          <option value="">Sportart auswählen</option>
          {SPORTS.map((sport) => <option key={sport}>{sport}</option>)}
        </select></>}
      <div className="training-session-basics">
        <NumberField label="Dauer der Einheit (Min., optional)" value={activeSession.durationMinutes}
          onChange={(value) => updateSession({ durationMinutes: value })} />
        <RatingStepper id="session-intensity" label="Anstrengung der Einheit (1–10, optional)"
          value={activeSession.intensity ?? ''}
          onChange={(value) => updateSession({ intensity: value })} />
      </div>
      <label className="field-label" htmlFor="session-notes">Notizen zur Einheit</label>
      <textarea id="session-notes" className="field notes-field" rows="3" value={activeSession.notes ?? ''}
        onChange={(event) => updateSession({ notes: event.target.value })} />
      <div className="training-activities">
        <h3>Übungen</h3>
        {!activeSession.exercises.length && <p className="helper-text">Noch keine Übung erfasst. Du kannst unten eine auswählen oder anlegen.</p>}
        {activeSession.exercises.map((exercise, index) => {
          const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
          const previous = previousExercise(sessions, activeSession, exercise)
          const previousSets = previous?.item.entries?.map((entry) =>
            formatTrainingEntry(entry, exerciseMeasurement({ ...previous.item, category: activeSession.category })))
            .filter(Boolean)
          return <article className="training-activity" key={exercise.id}>
            <div className="exercise-card-heading"><div>
              <span className="exercise-number">ÜBUNG {index + 1}</span><h4>{exercise.name}</h4>
              <span className="history-meta">{activeSession.category}
                {activeSession.category === 'Krafttraining' && ` · ${exercise.muscleGroup || 'Ohne Muskelgruppe'}`}</span>
            </div><button type="button" className="icon-button" aria-label={`${exercise.name} entfernen`}
              onClick={() => {
                if (!window.confirm(`„${exercise.name}“ aus dieser Einheit entfernen?`)) return
                updateSession({ exercises: activeSession.exercises.filter((item) => item.id !== exercise.id) })
              }}>×</button></div>
            {previousSets?.length > 0 && <p className="training-previous">
              Zuletzt am {formatDate(previous.session.date)}: {previousSets.join(' · ')}
            </p>}
            {hasLegacyValues(exercise) && <div className="training-legacy">
              <strong>Früherer Sammeleintrag</strong>
              <p className="helper-text">Diese Werte bleiben erhalten. Einzelne Sätze wurden damals nicht erfasst.</p>
              <div className="training-activity-fields">{Object.entries(legacyLabels)
                .filter(([field]) => exercise[field] !== '' && exercise[field] != null)
                .map(([field, label]) => <label className="training-field" key={field}>{label}
                  <input className="field" value={exercise[field] ?? ''}
                    onChange={(event) => updateExercise(exercise.id, { [field]: event.target.value })} /></label>)}</div>
            </div>}
            {(exercise.entries ?? []).map((entry, entryIndex) => <SetEditor key={entry.id}
              entry={entry} type={type} index={entryIndex}
              onChange={(changes) => updateExercise(exercise.id, { entries: exercise.entries.map((item) =>
                item.id === entry.id ? { ...item, ...changes } : item) })}
              onRemove={() => updateExercise(exercise.id, { entries: exercise.entries.filter((item) => item.id !== entry.id) })} />)}
            <button type="button" className="secondary-button"
              onClick={() => updateExercise(exercise.id, { entries: [...(exercise.entries ?? []), createTrainingSet(type)] })}>
              ＋ Satz hinzufügen</button>
            <label className="field-label" htmlFor={`exercise-notes-${exercise.id}`}>Notizen zur Übung</label>
            <textarea id={`exercise-notes-${exercise.id}`} className="field notes-field" rows="2"
              value={exercise.notes ?? ''} onChange={(event) => updateExercise(exercise.id, { notes: event.target.value })} />
          </article>
        })}
      </div>
      <div className="training-add-activity">
        <label className="field-label" htmlFor="exercise-select">Übung hinzufügen</label>
        <ExercisePicker id="exercise-select" library={exerciseLibrary} category={activeSession.category}
          value={exerciseChoice} onChange={setExerciseChoice} />
        <button type="button" className="secondary-button" onClick={addExercise}>＋ Übung hinzufügen</button>
        <details className="training-custom"><summary>Eigene Übung anlegen</summary>
          <label className="field-label" htmlFor="custom-name">Übungsname</label>
          <input id="custom-name" className="field" value={customName}
            onChange={(event) => setCustomName(event.target.value)} />
          <label className="field-label" htmlFor="custom-type">Was wird gemessen?</label>
          <select id="custom-type" className="field" value={customType}
            onChange={(event) => setCustomType(event.target.value)}>
            {MEASUREMENT_TYPES.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
          {activeSession.category === 'Krafttraining' && <>
            <label className="field-label" htmlFor="custom-group">Muskelgruppe</label>
            <select id="custom-group" className="field" value={customGroup}
              onChange={(event) => setCustomGroup(event.target.value)}>
              {MUSCLE_GROUPS.map((group) => <option key={group}>{group}</option>)}
            </select></>}
          <button type="button" className="secondary-button" onClick={createCustomExercise}>Anlegen und hinzufügen</button>
        </details>
      </div>
      <div className="training-finish-actions">
        <button type="button" className="primary-button" onClick={() => {
          updateSession({ status: 'completed', completedAt: new Date().toISOString() })
          setActiveSessionId(null); setNotice('Trainingseinheit abgeschlossen.')
        }}>Training abschließen</button>
        <button type="button" className="secondary-button" onClick={() => setActiveSessionId(null)}>Für später schließen</button>
      </div>
    </section>}

    {!activeSession && <section className="diary-panel training-plans">
      <div className="section-heading"><div><p className="eyebrow">WIEDERVERWENDBAR</p><h2>Trainingsvorlagen</h2></div></div>
      {!planDraft && <>
        <p className="helper-text">Die Vorlage enthält geplante Übungen. Deine Werte gehören zur absolvierten Einheit.</p>
        {trainingPlans.map((plan) => <div className="training-plan-row" key={plan.id}>
          <div><strong>{plan.name}</strong><span className="history-meta">{plan.category} · {plan.exercises.length} Übungen</span></div>
          <button type="button" className="text-button" onClick={() => beginPlan(plan)}>Bearbeiten</button>
          <button type="button" className="text-button" onClick={() => {
            if (!window.confirm(`Vorlage „${plan.name}“ löschen? Abgeschlossene Einheiten bleiben erhalten.`)) return
            setTrainingPlans((previous) => previous.filter((item) => item.id !== plan.id))
            if (selectedPlanId === plan.id) setSelectedPlanId('')
          }}>Löschen</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => beginPlan(null)}>＋ Vorlage erstellen</button>
      </>}
      {planDraft && <div className="training-plan-editor">
        <label className="field-label" htmlFor="plan-name">Name der Vorlage</label>
        <input id="plan-name" className="field" value={planDraft.name}
          onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))}
          placeholder="z. B. Oberkörper" />
        <label className="field-label" htmlFor="plan-category">Hauptkategorie</label>
        <select id="plan-category" className="field" value={planDraft.category}
          onChange={(event) => { setPlanDraft((draft) => ({ ...draft, category: event.target.value, exercises: [] })); setPlanChoice('') }}>
          {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        {planDraft.exercises.map((item, index) => <div className="training-plan-row" key={item.libraryId}>
          <span>{index + 1}. {item.name}{planDraft.category === 'Krafttraining' && ` · ${item.muscleGroup || 'Ohne Muskelgruppe'}`}</span>
          <button type="button" className="text-button" onClick={() => setPlanDraft((draft) => ({ ...draft,
            exercises: draft.exercises.filter((reference) => reference.libraryId !== item.libraryId),
          }))}>Entfernen</button>
        </div>)}
        <label className="field-label" htmlFor="plan-exercise">Übung aus Bibliothek</label>
        <ExercisePicker id="plan-exercise" library={exerciseLibrary} category={planDraft.category}
          value={planChoice} onChange={setPlanChoice} />
        <button type="button" className="secondary-button" onClick={addPlanExercise}>＋ Übung zur Vorlage</button>
        <div className="training-finish-actions">
          <button type="button" className="primary-button" onClick={savePlan}>Vorlage speichern</button>
          <button type="button" className="secondary-button" onClick={() => setPlanDraft(null)}>Abbrechen</button>
        </div>
      </div>}
    </section>}

    <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">DEIN VERLAUF</p><h2>Trainingseinheiten</h2></div>
        <span className="count-badge">{sessions.length}</span></div>
      {!sortedSessions.length ? <p className="helper-text">Noch keine Trainingseinheiten gespeichert.</p>
        : <div className="history-list">{sortedSessions.map((session) => <article className="history-item" key={session.id}>
          <button type="button" className="history-main" onClick={() => {
            setActiveSessionId(session.id); setSelectedDate(session.date); setExerciseChoice('')
            setCustomType(defaultMeasurement(session.category))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}>
            <span className="history-date">{formatDate(session.date)}</span>
            <strong>{session.title || session.category || 'Training'}</strong>
            <span className="history-meta">{session.category || 'Training'} · {session.exercises.length} Übungen
              {session.durationMinutes ? ` · ${session.durationMinutes} Min.` : ''}
              {session.status === 'ongoing' ? ' · In Bearbeitung' : ''}</span>
          </button>
          <button type="button" className="icon-button delete-button" onClick={() => {
            if (!window.confirm(`Training „${session.title || session.category || 'Einheit'}“ wirklich löschen?`)) return
            setSessions((previous) => previous.filter((item) => item.id !== session.id))
            if (activeSessionId === session.id) setActiveSessionId(null)
          }} aria-label={`${session.title || 'Training'} löschen`}>×</button>
        </article>)}</div>}
    </section>

    <details className="diary-panel training-library">
      <summary>Übungsbibliothek verwalten</summary>
      <p className="helper-text">Jede Übung gehört zu einer Hauptkategorie und bei Krafttraining zu einer Muskelgruppe.</p>
      <label className="field-label" htmlFor="library-category">Hauptkategorie</label>
      <select id="library-category" className="field" value={libraryCategory}
        onChange={(event) => { setLibraryCategory(event.target.value); setLibraryType(defaultMeasurement(event.target.value)) }}>
        {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
      </select>
      <label className="field-label" htmlFor="library-name">Neue Übung</label>
      <input id="library-name" className="field" value={libraryName}
        onChange={(event) => setLibraryName(event.target.value)} />
      <label className="field-label" htmlFor="library-type">Messart</label>
      <select id="library-type" className="field" value={libraryType}
        onChange={(event) => setLibraryType(event.target.value)}>
        {MEASUREMENT_TYPES.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
      </select>
      {libraryCategory === 'Krafttraining' && <>
        <label className="field-label" htmlFor="library-group">Muskelgruppe</label>
        <select id="library-group" className="field" value={libraryGroup}
          onChange={(event) => setLibraryGroup(event.target.value)}>
          {MUSCLE_GROUPS.map((group) => <option key={group}>{group}</option>)}
        </select></>}
      <button type="button" className="secondary-button" onClick={addLibraryItem}>＋ Zur Bibliothek</button>
      <div className="training-library-list">
        {groupsFor(exerciseLibrary, libraryCategory).map(([group, items]) => <div key={group}>
          {libraryCategory === 'Krafttraining' && <h3 className="training-group-heading">{group}</h3>}
          {items.map((item) => {
            const index = exerciseLibrary.indexOf(item)
            return <div className="training-library-item" key={exerciseIdentity(item)}>
              {renamingIndex === index ? <>
                <input className="field" aria-label="Neuer Übungsname" value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)} />
                <button type="button" className="text-button" onClick={() => renameLibraryItem(index)}>Speichern</button>
                <button type="button" className="text-button" onClick={() => setRenamingIndex(null)}>Abbrechen</button>
              </> : <>
                <span>{item.name}</span>
                {libraryCategory === 'Krafttraining' && <select className="field training-group-select"
                  aria-label={`Muskelgruppe für ${item.name}`} value={item.muscleGroup || ''}
                  onChange={(event) => changeLibraryGroup(index, event.target.value)}>
                  <option value="" disabled>Muskelgruppe wählen</option>
                  {MUSCLE_GROUPS.map((muscle) => <option key={muscle}>{muscle}</option>)}
                </select>}
                <button type="button" className="text-button" onClick={() => { setRenamingIndex(index); setRenameValue(item.name) }}>Umbenennen</button>
                <button type="button" className="text-button" onClick={() => {
                  if (!window.confirm(`„${item.name}“ aus der Bibliothek entfernen? Bestehende Einheiten bleiben erhalten.`)) return
                  setExerciseLibrary((previous) => previous.filter((_, i) => i !== index))
                }}>Entfernen</button>
              </>}
            </div>
          })}</div>)}
      </div>
    </details>
  </div>
}
