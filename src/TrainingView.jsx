import { useState } from 'react'
import GuidedTrainingPanel from './GuidedTrainingPanel.jsx'
import TrainingHistoryDetails from './TrainingHistoryDetails.jsx'
import EntryWindow from './EntryWindow.jsx'
import { DEFAULT_EXERCISES, VOLLEYBALL_PLANS, enrichExercise } from './volleyballTraining.js'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, MEASUREMENT_TYPES,
  defaultMeasurement, exerciseIdentity, exerciseMeasurement,
  createLoggedExercise, createTrainingSet, hasLegacyValues,
  canonicalCategory,
  hasMeasuredValue, isConfirmedSet, confirmAndAdvanceSet,
  finishTrainingExerciseEntries,
} from './trainingModel.js'
import './TrainingView.css'

const today = () => new Date().toLocaleDateString('sv-SE')
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

export default function TrainingView({ sessions, setSessions, exerciseLibrary,
  setExerciseLibrary, trainingPlans, setTrainingPlans, setNotice, athleteProfile }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [customDate, setCustomDate] = useState(false)
  const [newCategory, setNewCategory] = useState('Krafttraining')
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [flowStep, setFlowStep] = useState('exercise')
  const [flowMessage, setFlowMessage] = useState('')
  const [activeExerciseId, setActiveExerciseId] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState('Krafttraining')
  const [editingSetId, setEditingSetId] = useState(null)
  const [planChoice, setPlanChoice] = useState('')
  const [planExerciseCategory, setPlanExerciseCategory] = useState('Krafttraining')
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
  const managedLibrary = exerciseLibrary.map((item, sourceIndex) => ({
    ...enrichExercise({ ...item, category: canonicalCategory(item.category, item.name) }),
    id: exerciseIdentity(item),
    sourceIndex,
  }))
  const visibleLibrary = [...managedLibrary, ...DEFAULT_EXERCISES.filter((item) =>
    !managedLibrary.some((existing) => existing.category === item.category
      && existing.name === item.name))]
  const visiblePlans = [...trainingPlans, ...VOLLEYBALL_PLANS.filter((plan) =>
    !trainingPlans.some((saved) => saved.id === plan.id))]
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
  function exercisesFromPlan(plan) {
    return plan.exercises.map((reference, index) => {
      const item = visibleLibrary.find((candidate) => exerciseIdentity(candidate) === reference.libraryId)
        ?? visibleLibrary.find((candidate) => candidate.name === reference.name
          && candidate.category === (reference.category ?? plan.category))
        ?? { ...reference, id: reference.libraryId, category: reference.category ?? plan.category }
      const exercise = createLoggedExercise({ ...item, target: reference.target ?? item.target })
      return index === 0 ? { ...exercise,
        entries: [{ ...createTrainingSet(exercise.type), completed: false }] } : exercise
    })
  }
  function openNewTraining(plan = null) {
    setPendingPlan(plan)
    setCustomDate(false)
    setSelectedDate(today())
    setNewSessionOpen(true)
  }
  function startSession(plan = null) {
    const entryDate = customDate ? selectedDate : today()
    if (!entryDate) { setNotice('Bitte wähle ein Trainingsdatum.'); return }
    const exercises = plan ? exercisesFromPlan(plan) : []
    const category = plan?.category ?? newCategory
    const session = {
      id: crypto.randomUUID(), date: entryDate,
      category, categories: plan?.categories ?? [category], subcategory: '',
      planId: plan?.id ?? null, planName: plan?.name ?? '',
      durationMinutes: '', intensity: '', notes: '', status: 'ongoing',
      exercises, createdAt: new Date().toISOString(),
    }
    setSessions((previous) => [...previous, session])
    setNewSessionOpen(false)
    setPendingPlan(null)
    setActiveSessionId(session.id)
    setActiveExerciseId(exercises[0]?.id ?? null)
    setFlowStep(exercises.length ? 'set' : 'exercise')
    setFlowMessage('')
    setSelectedGroup('')
    setSelectedExerciseCategory(exercises[0]?.category ?? category)
    setCustomType(defaultMeasurement(category))
    setNotice('')
  }
  function addExercise(item) {
    const exercise = createLoggedExercise(item)
    exercise.entries = [{ ...createTrainingSet(exercise.type), completed: false }]
    updateSession({ exercises: [...activeSession.exercises, exercise] })
    setActiveExerciseId(exercise.id)
    setFlowStep('set')
    setEditingSetId(null)
    setFlowMessage('')
    setNotice('')
  }
  function openExercise(exercise) {
    const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
    if (!(exercise.entries ?? []).some((entry) => entry.completed === false)) {
      updateExercise(exercise.id, { entries: [...(exercise.entries ?? []),
        { ...createTrainingSet(type), completed: false }] })
    }
    setActiveExerciseId(exercise.id)
    setFlowStep('set')
    setEditingSetId(null)
    setFlowMessage('')
  }
  function applyPlan(plan) {
    if (activeSession.exercises.length) {
      setFlowMessage('Eine Vorlage kannst du nur vor der ersten Übung laden.'); return
    }
    const exercises = exercisesFromPlan(plan)
    if (exercises.length) {
      const first = exercises[0]
      updateSession({ planId: plan.id, planName: plan.name,
        categories: plan.categories ?? [plan.category], exercises })
      setActiveExerciseId(first.id)
      setSelectedExerciseCategory(first.category)
      setFlowStep('set')
      setEditingSetId(null)
      setFlowMessage('')
    }
  }
  function confirmSet() {
    const exercise = activeSession.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return
    const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
    const entries = exercise.entries ?? []
    const advanced = confirmAndAdvanceSet(entries, type,
      exercise.loadMode === 'bodyweight' ? athleteProfile.bodyweightKg : '')
    if (!advanced) {
      setFlowMessage('Bitte gib die Werte für diesen Satz ein.'); return
    }
    updateExercise(exercise.id, { entries: advanced })
    setFlowMessage('')
  }
  function finishExercise() {
    const exercise = activeSession.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return
    const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
    const kept = finishTrainingExerciseEntries(exercise.entries ?? [], type)
    if (!kept) {
      setFlowMessage('Bestätige den begonnenen Satz mit dem Haken oder entferne seine Werte.'); return
    }
    if (!kept.length && !hasLegacyValues(exercise)) {
      setFlowMessage('Bestätige mindestens einen Satz, bevor du die Übung beendest.'); return
    }
    const exercises = activeSession.exercises.map((item) => item.id === exercise.id
      ? { ...item, entries: kept, done: true } : item)
    updateSession({ exercises })
    setActiveExerciseId(null)
    const next = exercises.find((item) => !item.done)
    if (next?.category) setSelectedExerciseCategory(next.category)
    setFlowStep('exercise')
    setFlowMessage('')
  }
  function openHistorySession(session) {
    const category = canonicalCategory(session.category, session.subcategory)
    if (category !== session.category) {
      setSessions((previous) => previous.map((item) => item.id === session.id
        ? { ...item, category, legacyCategory: item.category,
          exercises: item.exercises.map((exercise) => ({ ...exercise,
            ...(exercise.category ? { category } : {}) })) } : item))
    }
    setActiveSessionId(session.id)
    setSelectedDate(session.date)
    setNewCategory(TRAINING_CATEGORIES.includes(category) ? category : 'Krafttraining')
    setCustomType(defaultMeasurement(category))
    setActiveExerciseId(null)
    setFlowStep('exercise')
    setFlowMessage('')
    setSelectedGroup('')
    setSelectedExerciseCategory(category)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function recategorizeSession(category) {
    updateSession({ category, categories: [category], legacyCategory: activeSession.category,
      exercises: activeSession.exercises.map((exercise) => ({ ...exercise,
        ...(exercise.category ? { category } : {}) })) })
    setCustomType(defaultMeasurement(category))
  }
  function createCustomExercise() {
    const name = customName.trim()
    if (!name || !activeSession) { setFlowMessage('Bitte gib einen Übungsnamen ein.'); return }
    if (visibleLibrary.some((item) => item.category === selectedExerciseCategory
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setFlowMessage('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    const item = { id: crypto.randomUUID(), name, category: selectedExerciseCategory,
      type: customType, ...(selectedExerciseCategory === 'Krafttraining' ? { muscleGroup: customGroup } : {}) }
    setExerciseLibrary((previous) => [...previous, item])
    const exercise = createLoggedExercise(item)
    exercise.entries = [{ ...createTrainingSet(exercise.type), completed: false }]
    updateSession({ exercises: [...activeSession.exercises, exercise] })
    setActiveExerciseId(exercise.id)
    setFlowStep('set')
    setEditingSetId(null)
    setCustomName('')
    setFlowMessage('')
    setNotice('Neue Übung angelegt und hinzugefügt.')
  }
  function removeExercise(exercise) {
    if (!window.confirm(`„${exercise.name}“ aus dieser Einheit entfernen?`)) return
    updateSession({ exercises: activeSession.exercises.filter((item) => item.id !== exercise.id) })
    setActiveExerciseId(null)
    setFlowStep('exercise')
    setFlowMessage('')
  }
  function saveTraining() {
    if (!activeSession.date) { setFlowMessage('Bitte wähle ein Trainingsdatum.'); return }
    if (activeSession.exercises.some((exercise) => {
      const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
      return (exercise.entries ?? []).some((entry) => entry.completed === true
        && !hasMeasuredValue(entry, type))
    })) {
      setFlowMessage('Ein bestätigter Satz hat keine gültigen Werte. Bitte korrigiere ihn.'); return
    }
    const unfinished = activeSession.exercises.some((exercise) =>
      (exercise.entries ?? []).some((entry) => entry.completed === false
        && hasMeasuredValue(entry, exerciseMeasurement({ ...exercise,
          category: activeSession.category }))))
    if (unfinished) {
      setFlowMessage('Bei einer Übung sind Satzwerte noch nicht mit dem Haken bestätigt.'); return
    }
    const exercises = activeSession.exercises.map((exercise) => {
      const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
      return { ...exercise, entries: (exercise.entries ?? [])
        .filter((entry) => isConfirmedSet(entry, type)) }
    }).filter((exercise) => exercise.entries.length || hasLegacyValues(exercise)
      || exercise.notes?.trim() || !Array.isArray(activeSession.exercises
        .find((original) => original.id === exercise.id)?.entries))
    if (!exercises.length && !activeSession.durationMinutes && !activeSession.notes?.trim()) {
      setFlowMessage('Bitte erfasse mindestens eine Übung, eine Dauer oder eine Notiz.'); return
    }
    updateSession({ exercises, status: 'completed', completedAt: new Date().toISOString() })
    setActiveSessionId(null)
    setActiveExerciseId(null)
    setFlowStep('exercise')
    setNotice('Trainingseinheit abgeschlossen.')
  }
  function beginPlan(plan) {
    setPlanDraft(plan ? { ...plan,
      category: canonicalCategory(plan.category, plan.name),
      exercises: [...plan.exercises] }
      : { id: crypto.randomUUID(), name: '', category: newCategory, exercises: [] })
    setPlanChoice('')
    setPlanExerciseCategory(plan?.category ?? newCategory)
  }
  function addPlanExercise() {
    const item = visibleLibrary.find((candidate) => candidate.category === planExerciseCategory
      && exerciseIdentity(candidate) === planChoice)
    if (!item) { setNotice('Bitte wähle eine Übung für die Vorlage aus.'); return }
    if (planDraft.exercises.some((reference) => reference.libraryId === planChoice)) {
      setNotice('Diese Übung ist bereits in der Vorlage.'); return
    }
    setPlanDraft((draft) => ({ ...draft, exercises: [...draft.exercises, {
      libraryId: exerciseIdentity(item), name: item.name, type: exerciseMeasurement(item),
      category: item.category, ...(item.loadMode ? { loadMode: item.loadMode } : {}),
      ...(item.muscleGroup ? { muscleGroup: item.muscleGroup } : {}),
    }], categories: [...new Set([draft.category, ...(draft.categories ?? []), item.category])] }))
    setPlanChoice('')
  }
  function savePlan() {
    if (!planDraft.name.trim()) { setNotice('Bitte gib der Vorlage einen Namen.'); return }
    if (!TRAINING_CATEGORIES.includes(planDraft.category)) {
      setNotice('Bitte ordne die ältere Vorlage einer neuen Hauptkategorie zu.'); return
    }
    if (!planDraft.exercises.length) { setNotice('Füge mindestens eine Übung zur Vorlage hinzu.'); return }
    const saved = { ...planDraft, name: planDraft.name.trim(),
      categories: [...new Set([planDraft.category, ...planDraft.exercises
        .map((item) => item.category ?? planDraft.category)])] }
    setTrainingPlans((previous) => previous.some((plan) => plan.id === saved.id)
      ? previous.map((plan) => plan.id === saved.id ? saved : plan) : [...previous, saved])
    setNewCategory(saved.category)
    setPlanDraft(null)
    setNotice('Trainingsvorlage gespeichert.')
  }
  function addLibraryItem() {
    const name = libraryName.trim()
    if (!name) { setNotice('Bitte gib einen Übungsnamen ein.'); return }
    if (visibleLibrary.some((item) => item.category === libraryCategory
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
    if (visibleLibrary.some((item) => item.sourceIndex !== index
      && item.category === canonicalCategory(old.category, old.name)
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
  function reassignLibraryItem(index, category) {
    const item = exerciseLibrary[index]
    if (visibleLibrary.some((entry) => entry.sourceIndex !== index
      && entry.category === category
      && entry.name.toLocaleLowerCase('de-DE') === item.name.toLocaleLowerCase('de-DE'))) {
      setNotice('In dieser Kategorie gibt es bereits eine Übung mit diesem Namen.'); return
    }
    setExerciseLibrary((previous) => previous.map((entry, i) => i === index
      ? { ...entry, id: exerciseIdentity(item), category,
        ...(category === 'Krafttraining' ? { muscleGroup: item.muscleGroup || 'Ganzkörper' } : {}) }
      : entry))
    setNotice('Ältere Übung der neuen Hauptkategorie zugeordnet.')
  }

  function closeTraining() {
    setActiveSessionId(null)
    setActiveExerciseId(null)
    setFlowMessage('')
  }
  function cancelTraining() {
    if (!activeSession || activeSession.status === 'completed') {
      closeTraining()
      return
    }
    const hasInput = activeSession.exercises.length || activeSession.notes?.trim()
      || activeSession.durationMinutes
    if (hasInput && !window.confirm('Diese Trainingseinheit einschließlich aller erfassten Werte verwerfen?')) return
    setSessions((previous) => previous.filter((session) => session.id !== activeSession.id))
    closeTraining()
    setNotice('Training abgebrochen.')
  }

  return <div className="training-view">
    <section className="diary-intro">
      <p className="eyebrow">TRAININGSTAGEBUCH</p><h2>Trainieren. Erfassen. Entwickeln.</h2>
      <p>Wähle deine Trainingsart und erfasse Übung für Übung deine tatsächlichen Werte.</p>
    </section>

    {!activeSession && <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">NEUE EINHEIT</p><h2>Training starten</h2></div></div>
      <p className="helper-text">Erfasse eine freie Einheit oder starte unten eine Volleyball-Vorlage.</p>
      <button type="button" className="primary-button" onClick={() => openNewTraining()}>
        ＋ Training hinzufügen
      </button>
    </section>}

    {newSessionOpen && !activeSession && <EntryWindow title={pendingPlan?.name || 'Neues Training'}
      subtitle="TRAININGS-EINGABE" onClose={() => { setNewSessionOpen(false); setPendingPlan(null) }}>
      <section className="diary-panel training-start-window">
      {pendingPlan ? <>
        <p className="training-plan-description">{pendingPlan.description}</p>
        <p className="history-meta">{(pendingPlan.categories ?? [pendingPlan.category]).join(' + ')}
          {' · '}{pendingPlan.exercises.length} Übungen</p>
      </> : <>
      <label className="field-label" htmlFor="training-category">Hauptkategorie</label>
      <select id="training-category" className="field" value={newCategory}
        onChange={(event) => setNewCategory(event.target.value)}>
        {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
      </select>
      </>}
      <details className="training-date-option"><summary>Anderes Datum erfassen</summary>
        <label className="field-label" htmlFor="training-date">Trainingsdatum</label>
        <input id="training-date" className="field" type="date"
          value={customDate ? selectedDate : today()}
          onChange={(event) => { setSelectedDate(event.target.value); setCustomDate(true) }} />
        {customDate && <button type="button" className="text-button"
          onClick={() => setCustomDate(false)}>Wieder heute verwenden</button>}
      </details>
      <button type="button" className="primary-button" onClick={() => startSession(pendingPlan)}>＋ Training starten</button>
      {sessions.some((session) => session.date === (customDate ? selectedDate : today())) &&
        <p className="helper-text">An diesem Tag gibt es bereits Einheiten. Du kannst eine weitere beginnen oder unten eine öffnen.</p>}
      </section>
    </EntryWindow>}

    {activeSession && <EntryWindow title={activeSession.planName || 'Training erfassen'}
      subtitle={`${formatDate(activeSession.date)} · ${activeSession.category}`} onClose={closeTraining}>
      <GuidedTrainingPanel
      session={activeSession} sessions={sessions} library={visibleLibrary} plans={visiblePlans}
      athleteProfile={athleteProfile} exerciseCategory={selectedExerciseCategory}
      setExerciseCategory={setSelectedExerciseCategory}
      step={flowStep} setStep={setFlowStep} activeExerciseId={activeExerciseId}
      group={selectedGroup} setGroup={setSelectedGroup}
      editingSetId={editingSetId} setEditingSetId={setEditingSetId}
      flowMessage={flowMessage} newCategory={newCategory} setNewCategory={setNewCategory}
      customName={customName} setCustomName={setCustomName}
      customType={customType} setCustomType={setCustomType}
      customGroup={customGroup} setCustomGroup={setCustomGroup}
      onAddExercise={addExercise} onOpenExercise={openExercise} onApplyPlan={applyPlan}
      onCreateCustom={createCustomExercise} onUpdateSession={updateSession}
      onUpdateExercise={updateExercise} onRemoveExercise={removeExercise} onConfirmSet={confirmSet}
      onFinishExercise={finishExercise} onSave={saveTraining}
      onRecategorize={recategorizeSession} onClose={closeTraining}
      onCancel={cancelTraining} />
    </EntryWindow>}
    {!activeSession && <section className="diary-panel training-plans">
      <div className="section-heading"><div><p className="eyebrow">WIEDERVERWENDBAR</p><h2>Trainingsvorlagen</h2></div></div>
      {!planDraft && <>
        <p className="helper-text">Starte einen vorgeschlagenen Volleyball-Trainingstag oder erstelle eine eigene Vorlage. Passe Umfang und Belastung an deine Spieltage an.</p>
        <h3 className="training-group-heading">Volleyball-Vorschläge</h3>
        {VOLLEYBALL_PLANS.map((plan) => <div className="training-plan-row" key={plan.id}>
          <div><strong>{plan.name}</strong>
            <span className="history-meta">{(plan.categories ?? [plan.category]).join(' + ')} · {plan.exercises.length} Übungen</span>
            <span className="training-plan-description">{plan.description}</span></div>
          <button type="button" className="secondary-button" onClick={() => openNewTraining(plan)}>Starten</button>
          <button type="button" className="text-button" onClick={() => beginPlan({ ...plan,
            id: crypto.randomUUID(), name: `${plan.name} · Eigene Variante` })}>Kopie anpassen</button>
        </div>)}
        {trainingPlans.length > 0 && <h3 className="training-group-heading">Meine Vorlagen</h3>}
        {trainingPlans.map((plan) => <div className="training-plan-row" key={plan.id}>
          <div><strong>{plan.name}</strong><span className="history-meta">{plan.category} · {plan.exercises.length} Übungen</span></div>
          <button type="button" className="secondary-button" onClick={() => openNewTraining(plan)}>Starten</button>
          <button type="button" className="text-button" onClick={() => beginPlan(plan)}>Bearbeiten</button>
          <button type="button" className="text-button" onClick={() => {
            if (!window.confirm(`Vorlage „${plan.name}“ löschen? Abgeschlossene Einheiten bleiben erhalten.`)) return
            setTrainingPlans((previous) => previous.filter((item) => item.id !== plan.id))
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
          onChange={(event) => { setPlanDraft((draft) => ({ ...draft, category: event.target.value }));
            setPlanExerciseCategory(event.target.value); setPlanChoice('') }}>
          {!TRAINING_CATEGORIES.includes(planDraft.category)
            && <option value={planDraft.category}>{planDraft.category} (alte Kategorie)</option>}
          {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        {planDraft.exercises.map((item, index) => <div className="training-plan-row" key={item.libraryId}>
          <span>{index + 1}. {item.name} · {item.category ?? planDraft.category}
            {(item.category ?? planDraft.category) === 'Krafttraining' && ` · ${item.muscleGroup || 'Ohne Muskelgruppe'}`}</span>
          <button type="button" className="text-button" onClick={() => setPlanDraft((draft) => ({ ...draft,
            exercises: draft.exercises.filter((reference) => reference.libraryId !== item.libraryId),
          }))}>Entfernen</button>
        </div>)}
        <label className="field-label" htmlFor="plan-exercise">Übung aus Bibliothek</label>
        <select className="field" aria-label="Kategorie der nächsten Übung" value={planExerciseCategory}
          onChange={(event) => { setPlanExerciseCategory(event.target.value); setPlanChoice('') }}>
          {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        <ExercisePicker id="plan-exercise" library={visibleLibrary} category={planExerciseCategory}
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
        : <div className="history-list">{sortedSessions.map((session) => {
          const planName = session.planName || trainingPlans.find((plan) => plan.id === session.planId)?.name
          const expanded = expandedSessionId === session.id
          return <article className="history-item training-history-item" key={session.id}>
            <div className="training-history-header">
              <button type="button" className="history-main" aria-expanded={expanded}
                onClick={() => setExpandedSessionId(expanded ? null : session.id)}>
                <span className="history-date">{formatDate(session.date)}</span>
                <strong>{canonicalCategory(session.category, session.subcategory) || 'Training'}</strong>
                {planName && <span className="training-history-plan">Vorlage: {planName}</span>}
                <span className="history-meta">{session.exercises.length} Übungen
                  {session.status === 'ongoing' ? ' · In Bearbeitung' : ''}</span>
              </button>
              <span className="training-history-chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
            </div>
            {expanded && <>
              <TrainingHistoryDetails session={session} />
              <div className="training-history-actions">
                <button type="button" className="secondary-button" onClick={() => openHistorySession(session)}>
                  {session.status === 'ongoing' ? 'Training fortsetzen' : 'Training bearbeiten'}
                </button>
                <button type="button" className="text-button" onClick={() => {
                  if (!window.confirm(`Training vom ${formatDate(session.date)} wirklich löschen?`)) return
                  setSessions((previous) => previous.filter((item) => item.id !== session.id))
                  setExpandedSessionId(null)
                  if (activeSessionId === session.id) setActiveSessionId(null)
                }}>Training löschen</button>
              </div>
            </>}
          </article>
        })}</div>}
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
        {groupsFor(visibleLibrary, libraryCategory).map(([group, items]) => <div key={group}>
          {libraryCategory === 'Krafttraining' && <h3 className="training-group-heading">{group}</h3>}
          {items.map((item) => {
            const index = item.sourceIndex
            return <div className="training-library-item" key={exerciseIdentity(item)}>
              {index === undefined ? <>
                <span>{item.name}</span><span className="history-meta">Empfohlene Übung</span>
              </> : renamingIndex === index ? <>
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
      {managedLibrary.some((item) => !TRAINING_CATEGORIES.includes(item.category))
        && <div className="training-legacy">
          <strong>Ältere Übungen ohne neue Hauptkategorie</strong>
          <p className="helper-text">Diese Übungen bleiben erhalten. Ordne sie bei Bedarf selbst zu.</p>
          {managedLibrary.filter((item) => !TRAINING_CATEGORIES.includes(item.category))
            .map((item) => <label className="training-field" key={item.id}>{item.name} · {item.category}
              <select className="field" value="" onChange={(event) =>
                reassignLibraryItem(item.sourceIndex, event.target.value)}>
                <option value="">Neue Kategorie wählen</option>
                {TRAINING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>)}
        </div>}
    </details>
  </div>
}
