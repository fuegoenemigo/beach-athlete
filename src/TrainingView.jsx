import { useState } from 'react'
import { RatingStepper } from './VolleyballInputs.jsx'
import './TrainingView.css'

const today = () => new Date().toLocaleDateString('sv-SE')
const categories = [
  'Krafttraining', 'Sprungkraft & Explosivität', 'Schnelligkeit & Agilität',
  'Ausdauer', 'Core & Stabilität', 'Mobility', 'Sport', 'Regeneration',
]
const sports = ['Beachvolleyball', 'Hallenvolleyball', 'Schwimmen', 'Laufen',
  'Radfahren', 'Sonstiger Sport']
const types = [
  ['strength', 'Sätze, Wiederholungen, Gewicht'],
  ['reps', 'Sätze und Wiederholungen'],
  ['duration', 'Zeit und Messwert'],
  ['distance', 'Distanz und Zeit'],
  ['jump', 'Sprünge und Messwert'],
]
const muscleGroups = ['Ganzkörper', 'Brust', 'Rücken', 'Schultern', 'Bizeps',
  'Trizeps', 'Beine', 'Core']
const fields = {
  sets: ['Sätze', 'number'], reps: ['Wiederholungen', 'number'],
  weight: ['Gewicht (kg)', 'number'], duration: ['Dauer (Min.)', 'number'],
  distance: ['Distanz mit Einheit', 'text'], result: ['Messwert / Ergebnis', 'text'],
}
const fieldsByType = {
  strength: ['sets', 'reps', 'weight'], reps: ['sets', 'reps'],
  duration: ['duration', 'result'], distance: ['distance', 'duration', 'result'],
  jump: ['sets', 'reps', 'result'], volleyball: ['duration', 'result'],
}
const defaultType = (category) => ({
  Krafttraining: 'strength', 'Sprungkraft & Explosivität': 'jump',
  'Schnelligkeit & Agilität': 'distance', Ausdauer: 'distance',
  'Core & Stabilität': 'duration', Mobility: 'duration', Sport: 'duration',
  Regeneration: 'duration',
})[category] ?? 'duration'

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function newExercise(item) {
  return { id: crypto.randomUUID(), name: item.name, type: item.type,
    ...(item.muscleGroup ? { muscleGroup: item.muscleGroup } : {}),
    sets: '', reps: '', weight: '', duration: '',
    distance: '', result: '', notes: '' }
}

export default function TrainingView({ sessions, setSessions, exerciseLibrary,
  setExerciseLibrary, setNotice }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [newCategory, setNewCategory] = useState('Krafttraining')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [exerciseChoice, setExerciseChoice] = useState('')
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState('strength')
  const [customMuscleGroup, setCustomMuscleGroup] = useState('Ganzkörper')
  const [libraryCategory, setLibraryCategory] = useState('Krafttraining')
  const [libraryName, setLibraryName] = useState('')
  const [libraryType, setLibraryType] = useState('strength')
  const [libraryMuscleGroup, setLibraryMuscleGroup] = useState('Ganzkörper')
  const [renamingIndex, setRenamingIndex] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const sortedSessions = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const availableExercises = exerciseLibrary.filter((item) =>
    item.category === activeSession?.category)

  function startSession() {
    if (!selectedDate) { setNotice('Bitte wähle ein Trainingsdatum.'); return }
    const session = { id: crypto.randomUUID(), date: selectedDate,
      title: newCategory, category: newCategory, subcategory: '',
      durationMinutes: '', intensity: '', notes: '', status: 'ongoing',
      exercises: [], createdAt: new Date().toISOString() }
    setSessions((previous) => [...previous, session])
    setActiveSessionId(session.id)
    setExerciseChoice('')
    setCustomName('')
    setNotice('')
  }

  function updateSession(changes) {
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      ? { ...session, ...changes } : session))
  }

  function updateExercise(exerciseId, field, value) {
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      ? { ...session, exercises: session.exercises.map((exercise) => exercise.id === exerciseId
        ? { ...exercise, [field]: value } : exercise) } : session))
  }

  function addExercise() {
    if (!activeSession) return
    const custom = exerciseChoice === '__custom'
    const name = custom ? customName.trim() : exerciseChoice
    if (!name) { setNotice('Bitte wähle eine Aktivität oder gib einen Namen ein.'); return }
    const item = custom ? { name, type: customType, category: activeSession.category,
      ...(customType === 'strength' ? { muscleGroup: customMuscleGroup } : {}) }
      : availableExercises.find((entry) => entry.name === name)
    if (!item) { setNotice('Bitte wähle eine gültige Aktivität.'); return }
    if (custom && !exerciseLibrary.some((entry) => entry.category === item.category
      && entry.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setExerciseLibrary((previous) => [...previous, item])
    }
    updateSession({ exercises: [...activeSession.exercises,
      newExercise({ ...item, type: item.type || defaultType(activeSession.category) })] })
    setExerciseChoice('')
    setCustomName('')
    setNotice('Aktivität hinzugefügt.')
  }

  function finishSession() {
    updateSession({ status: 'completed', completedAt: new Date().toISOString() })
    setActiveSessionId(null)
    setNotice('Trainingseinheit gespeichert.')
  }

  function deleteSession(session) {
    if (!window.confirm(`Training „${session.title || session.category || 'Einheit'}“ wirklich löschen?`)) return
    setSessions((previous) => previous.filter((item) => item.id !== session.id))
    if (activeSessionId === session.id) setActiveSessionId(null)
  }

  function addLibraryItem() {
    const name = libraryName.trim()
    if (!name) { setNotice('Bitte gib einen Namen für die Aktivität ein.'); return }
    if (exerciseLibrary.some((item) => item.category === libraryCategory
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Aktivität gibt es in der Kategorie bereits.')
      return
    }
    setExerciseLibrary((previous) => [...previous, { name, category: libraryCategory, type: libraryType,
      ...(libraryType === 'strength' ? { muscleGroup: libraryMuscleGroup } : {}) }])
    setLibraryName('')
    setNotice('Aktivität zur Bibliothek hinzugefügt.')
  }

  function renameLibraryItem(index) {
    const name = renameValue.trim()
    if (!name) { setNotice('Bitte gib einen Namen ein.'); return }
    if (exerciseLibrary.some((item, itemIndex) => itemIndex !== index
      && item.category === exerciseLibrary[index].category
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Aktivität gibt es in der Kategorie bereits.')
      return
    }
    setExerciseLibrary((previous) => previous.map((item, itemIndex) =>
      itemIndex === index ? { ...item, name } : item))
    setRenamingIndex(null)
    setNotice('Aktivität umbenannt. Frühere Trainingseinträge bleiben unverändert.')
  }

  return <div className="training-view">
    <section className="diary-intro">
      <p className="eyebrow">TRAININGSTAGEBUCH</p>
      <h2>Dein Training, einfach erfasst.</h2>
      <p>Halte Kraft, Athletik, Sport und Regeneration fest. Deine Einträge bleiben für spätere Auswertungen erhalten.</p>
    </section>

    {!activeSession && <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">NEUE EINHEIT</p><h2>Training starten</h2></div></div>
      <label className="field-label" htmlFor="training-date">Datum</label>
      <input id="training-date" className="field" type="date" value={selectedDate}
        onChange={(event) => setSelectedDate(event.target.value)} />
      <label className="field-label" htmlFor="training-new-category">Art des Trainings</label>
      <select id="training-new-category" className="field" value={newCategory}
        onChange={(event) => setNewCategory(event.target.value)}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
      <button type="button" className="primary-button" onClick={startSession}>＋ Training starten</button>
      {sessions.some((session) => session.date === selectedDate) &&
        <p className="helper-text">Für dieses Datum gibt es bereits Einträge. Du kannst eine weitere Einheit starten oder unten einen Eintrag öffnen.</p>}
    </section>}

    {activeSession && <section className="diary-panel active-workout">
      <div className="section-heading"><div>
        <p className="eyebrow">{formatDate(activeSession.date)}</p>
        <h2>Training bearbeiten</h2>
      </div></div>
      <p className="helper-text">Deine Änderungen werden sofort gespeichert.</p>
      <label className="field-label" htmlFor="session-title">Name der Einheit</label>
      <input id="session-title" className="field" value={activeSession.title ?? ''}
        onChange={(event) => updateSession({ title: event.target.value })}
        placeholder="z. B. Kraft & Sprungkraft" />
      <label className="field-label" htmlFor="session-category">Trainingsart</label>
      <select id="session-category" className="field" value={activeSession.category ?? 'Krafttraining'}
        onChange={(event) => {
          updateSession({ category: event.target.value, subcategory: '' })
          setExerciseChoice('')
          setCustomType(defaultType(event.target.value))
        }}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
      {activeSession.category === 'Sport' && <>
        <label className="field-label" htmlFor="session-sport">Sportart</label>
        <select id="session-sport" className="field" value={activeSession.subcategory ?? ''}
          onChange={(event) => updateSession({ subcategory: event.target.value })}>
          <option value="">Sportart auswählen</option>
          {sports.map((sport) => <option key={sport}>{sport}</option>)}
        </select>
      </>}
      <div className="training-session-basics">
        <label className="field-label" htmlFor="session-duration">Dauer der Einheit (Min., optional)</label>
        <input id="session-duration" className="field" type="number" inputMode="numeric" min="0"
          value={activeSession.durationMinutes ?? ''}
          onChange={(event) => updateSession({ durationMinutes: event.target.value })} />
        <RatingStepper id="session-intensity" label="Wie anstrengend war die Einheit? (1–10, optional)"
          value={activeSession.intensity ?? ''}
          onChange={(value) => updateSession({ intensity: value })} />
      </div>
      <label className="field-label" htmlFor="session-notes">Notizen zur Einheit</label>
      <textarea id="session-notes" className="field notes-field" rows="3"
        value={activeSession.notes ?? ''}
        onChange={(event) => updateSession({ notes: event.target.value })}
        placeholder="Wie lief das Training? Was möchtest du festhalten?" />

      <div className="training-activities">
        <h3>Aktivitäten und Übungen</h3>
        {activeSession.exercises.length === 0 &&
          <p className="helper-text">Noch keine Aktivität eingetragen. Dauer und Notizen kannst du auch ohne einzelne Übung speichern.</p>}
        {activeSession.exercises.map((exercise, index) => {
          const visibleFields = [...new Set([...(fieldsByType[exercise.type] ?? ['duration', 'result']),
            ...Object.keys(fields).filter((field) => exercise[field] !== '' && exercise[field] != null)])]
          return <article className="training-activity" key={exercise.id}>
            <div className="exercise-card-heading"><div>
              <span className="exercise-number">AKTIVITÄT {index + 1}</span>
              <h4>{exercise.name}</h4>
              {exercise.muscleGroup && <span className="history-meta">{exercise.muscleGroup}</span>}
            </div><button type="button" className="icon-button"
              aria-label={`${exercise.name} entfernen`} onClick={() => {
                if (!window.confirm(`„${exercise.name}“ aus dieser Einheit entfernen?`)) return
                updateSession({ exercises: activeSession.exercises.filter((item) => item.id !== exercise.id) })
              }}>×</button></div>
            <div className="training-activity-fields">
              {visibleFields.map((field) => <label key={field} className="training-field">
                {fields[field][0]}
                <input className="field" type={fields[field][1]}
                  inputMode={fields[field][1] === 'number' ? 'decimal' : undefined}
                  min={fields[field][1] === 'number' ? '0' : undefined}
                  step={field === 'weight' ? '0.5' : undefined}
                  value={exercise[field] ?? ''}
                  onChange={(event) => updateExercise(exercise.id, field, event.target.value)} />
              </label>)}
            </div>
            <label className="field-label" htmlFor={`exercise-notes-${exercise.id}`}>Notizen</label>
            <textarea id={`exercise-notes-${exercise.id}`} className="field notes-field" rows="2"
              value={exercise.notes ?? ''}
              onChange={(event) => updateExercise(exercise.id, 'notes', event.target.value)} />
          </article>
        })}
      </div>

      <div className="training-add-activity">
        <label className="field-label" htmlFor="exercise-select">Aktivität hinzufügen</label>
        <select id="exercise-select" className="field" value={exerciseChoice}
          onChange={(event) => {
            setExerciseChoice(event.target.value)
            if (event.target.value === '__custom') setCustomType(defaultType(activeSession.category))
          }}>
          <option value="">Aus Bibliothek wählen</option>
          {availableExercises.map((item) => <option key={`${item.category}-${item.name}`}
            value={item.name}>{item.name}</option>)}
          <option value="__custom">＋ Eigene Aktivität</option>
        </select>
        {exerciseChoice === '__custom' && <>
          <label className="field-label" htmlFor="custom-exercise-name">Name der Aktivität</label>
          <input id="custom-exercise-name" className="field" value={customName}
            onChange={(event) => setCustomName(event.target.value)} placeholder="z. B. Ausfallschritte" />
          <label className="field-label" htmlFor="custom-exercise-type">Was möchtest du erfassen?</label>
          <select id="custom-exercise-type" className="field" value={customType}
            onChange={(event) => setCustomType(event.target.value)}>
            {types.map(([type, description]) => <option key={type} value={type}>{description}</option>)}
          </select>
          {customType === 'strength' && <>
            <label className="field-label" htmlFor="custom-muscle-group">Muskelgruppe</label>
            <select id="custom-muscle-group" className="field" value={customMuscleGroup}
              onChange={(event) => setCustomMuscleGroup(event.target.value)}>
              {muscleGroups.map((group) => <option key={group}>{group}</option>)}
            </select>
          </>}
        </>}
        <button type="button" className="secondary-button" onClick={addExercise}>＋ Aktivität hinzufügen</button>
      </div>
      <div className="training-finish-actions">
        <button type="button" className="primary-button" onClick={finishSession}>Training abschließen</button>
        <button type="button" className="secondary-button" onClick={() => setActiveSessionId(null)}>Für später schließen</button>
      </div>
    </section>}

    <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">DEIN VERLAUF</p><h2>Trainingseinheiten</h2></div>
        <span className="count-badge">{sessions.length}</span></div>
      {sortedSessions.length === 0 ? <p className="helper-text">Noch keine Trainingseinheiten gespeichert.</p>
        : <div className="history-list">{sortedSessions.map((session) => <article className="history-item" key={session.id}>
          <button type="button" className="history-main" onClick={() => {
            setActiveSessionId(session.id)
            setSelectedDate(session.date)
            setExerciseChoice('')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}>
            <span className="history-date">{formatDate(session.date)}</span>
            <strong>{session.title || session.category || 'Training'}</strong>
            <span className="history-meta">{session.category || 'Training'} · {session.exercises.length} {session.exercises.length === 1 ? 'Aktivität' : 'Aktivitäten'}
              {session.durationMinutes ? ` · ${session.durationMinutes} Min.` : ''}
              {session.status === 'ongoing' ? ' · In Bearbeitung' : ''}</span>
          </button>
          <button type="button" className="icon-button delete-button" onClick={() => deleteSession(session)}
            aria-label={`${session.title || 'Training'} löschen`}>×</button>
        </article>)}</div>}
    </section>

    <details className="diary-panel training-library">
      <summary>Übungsbibliothek verwalten</summary>
      <p className="helper-text">Eigene Aktivitäten erscheinen danach in der passenden Trainingsart. Frühere Einträge bleiben beim Umbenennen oder Löschen erhalten.</p>
      <label className="field-label" htmlFor="library-category">Trainingsart</label>
      <select id="library-category" className="field" value={libraryCategory}
        onChange={(event) => {
          setLibraryCategory(event.target.value)
          setLibraryType(defaultType(event.target.value))
        }}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      <label className="field-label" htmlFor="library-name">Neue Aktivität</label>
      <input id="library-name" className="field" value={libraryName}
        onChange={(event) => setLibraryName(event.target.value)} placeholder="Name der Aktivität" />
      <label className="field-label" htmlFor="library-type">Eingabeart</label>
      <select id="library-type" className="field" value={libraryType}
        onChange={(event) => setLibraryType(event.target.value)}>
        {types.map(([type, description]) => <option key={type} value={type}>{description}</option>)}
      </select>
      {libraryType === 'strength' && <>
        <label className="field-label" htmlFor="library-muscle-group">Muskelgruppe</label>
        <select id="library-muscle-group" className="field" value={libraryMuscleGroup}
          onChange={(event) => setLibraryMuscleGroup(event.target.value)}>
          {muscleGroups.map((group) => <option key={group}>{group}</option>)}
        </select>
      </>}
      <button type="button" className="secondary-button" onClick={addLibraryItem}>＋ Zur Bibliothek hinzufügen</button>
      <div className="training-library-list">
        {exerciseLibrary.map((item, index) => item.category === libraryCategory
          && <div className="training-library-item" key={`${item.name}-${index}`}>
            {renamingIndex === index ? <>
              <input className="field" aria-label="Neuer Aktivitätsname" value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)} />
              <button type="button" className="secondary-button" onClick={() => renameLibraryItem(index)}>Speichern</button>
              <button type="button" className="secondary-button" onClick={() => setRenamingIndex(null)}>Abbrechen</button>
            </> : <>
              <span>{item.name}</span>
              <button type="button" className="text-button" onClick={() => {
                setRenamingIndex(index)
                setRenameValue(item.name)
              }}>Umbenennen</button>
              <button type="button" className="text-button" onClick={() => {
                if (!window.confirm(`„${item.name}“ aus der Bibliothek entfernen? Bestehende Trainingseinträge bleiben erhalten.`)) return
                setExerciseLibrary((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
              }}>Entfernen</button>
            </>}
          </div>)}
      </div>
    </details>
  </div>
}
