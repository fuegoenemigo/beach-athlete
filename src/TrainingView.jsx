import { useEffect, useState } from 'react'
import GuidedTrainingPanel from './GuidedTrainingPanel.jsx'
import GuidedEndurancePanel from './GuidedEndurancePanel.jsx'
import ExerciseInfo from './ExerciseInfo.jsx'
import TrainingHistoryDetails from './TrainingHistoryDetails.jsx'
import EntryWindow from './EntryWindow.jsx'
import DateWheel from './DateWheel.jsx'
import { ChoiceWheel } from './WheelPicker.jsx'
import UIIcon from './UIIcon.jsx'
import { isRecentDate } from './activityHistory.js'
import { DEFAULT_EXERCISES, enrichExercise, guidedCardioPlanForExercise,
  searchTrainingPlans } from './volleyballTraining.js'
import { groupedTrainingPlans, isBuiltInPlan, removeTrainingPlan,
  restoreBuiltInPlans, visibleTrainingPlans, plansForCategory } from './trainingPlanLibrary.js'
import {
  TRAINING_CATEGORIES, MUSCLE_GROUPS, MEASUREMENT_TYPES,
  defaultMeasurement, exerciseIdentity, exerciseMeasurement,
  createLoggedExercise, createTrainingSet, hasLegacyValues, trainingWithAddedExercise,
  canonicalCategory,
  hasMeasuredValue, hasRequiredIntervalDuration, isConfirmedSet, confirmAndAdvanceSet,
  previousExercise, previousSetFor, suggestedTrainingSet,
  finishTrainingExerciseEntries, isOpenTraining, addTrainingIfNoOpen,
  isSportTrainingCategory, isSportTrainingAttendance, createSportTrainingSession,
} from './trainingModel.js'
import { formatTimer, timerStorageKey } from './trainingTimer.js'
import { strengthRoleFor } from './strengthClassification.js'
import { guidedEnduranceSpec, guidedMainReference, mainDurationSeconds,
  tracksDeviceDistance, deviceDistanceMeters,
  confirmGuidedMain } from './enduranceFlow.js'
import './TrainingView.css'

const today = () => new Date().toLocaleDateString('sv-SE')
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
})

function timerIsActive(sessionId, exerciseId, setId) {
  if (!setId) return false
  try {
    return Boolean(localStorage.getItem(timerStorageKey(sessionId, exerciseId, setId)))
  } catch { return false }
}

function groupsFor(library, category) {
  const items = library.filter((item) => item.category === category)
    .sort((a, b) => a.name.localeCompare(b.name, 'de-DE'))
  return [...new Set(items.map((item) => item.muscleGroup || 'Allgemein'))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'))
    .map((group) => [group, items.filter((item) => (item.muscleGroup || 'Allgemein') === group)])
}

function ExercisePicker({ library, category, value, onChange }) {
  return <ChoiceWheel label="Übung aus Bibliothek" value={value} onChange={onChange}
    options={[{ value: '', label: 'Übung auswählen' },
      ...groupsFor(library, category).flatMap(([group, items]) => items.map((item) => ({
        value: exerciseIdentity(item), label: `${item.name} · ${group}`,
      })))]} />
}

function WheelEdit({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => (typeof option === 'string' ? option : option.value) === value)
  return <>
    <button type="button" className="secondary-button training-wheel-edit"
      onClick={() => setOpen(true)} aria-label={label}>
      {typeof selected === 'string' ? selected : selected?.label ?? 'Auswählen'}
    </button>
    {open && <EntryWindow title={label} subtitle="AUSWAHL"
      onClose={() => setOpen(false)}>
      <ChoiceWheel label={label} value={value} options={options} onChange={onChange} />
      <button type="button" className="primary-button" onClick={() => setOpen(false)}>Übernehmen</button>
    </EntryWindow>}
  </>
}

function SportTrainingEditor({ session, onSave, onClose }) {
  const [date, setDate] = useState(session.date)
  const [error, setError] = useState('')

  function save() {
    if (!date) { setError('Bitte wähle ein Trainingsdatum.'); return }
    onSave({ date })
  }

  return <section className="diary-panel training-start-window">
    <p className="helper-text">Dieser Trainingstag ist abgeschlossen. Hier kannst du sein Datum korrigieren.</p>
    <DateWheel label="Datum" value={date}
      onChange={(next) => { setDate(next); setError('') }} />
    {error && <p className="training-flow-error" role="alert">{error}</p>}
    <div className="training-finish-actions">
      <button type="button" className="primary-button" onClick={save}>Änderungen speichern</button>
      <button type="button" className="secondary-button" onClick={onClose}>Schließen</button>
    </div>
  </section>
}

function GuidedPlanPreview({ plan }) {
  const spec = guidedEnduranceSpec(plan)
  const main = guidedMainReference(plan)
  const phases = [
    ['Aufwärmen', spec.warmupSeconds, spec.intensity?.warmup],
    [spec.kind === 'interval' ? 'Intervalltraining' : spec.kind === 'sprint' ? 'Sprintserie' : 'Hauptübung',
      mainDurationSeconds(spec), spec.intensity?.work],
    ['Auslaufen', spec.cooldownSeconds, spec.intensity?.cooldown],
  ]
  return <>
    <h3 className="training-preview-heading">Eine Übung · drei Phasen</h3>
    <div className="training-guided-exercise"><strong>{main.name}</strong>
      <ExerciseInfo exercise={main} /></div>
    <ol className="training-plan-preview">
      {phases.map(([name, duration, intensity], index) => <li key={name}>
        <strong>{index + 1}. {name}</strong>
        <small>{index === 1 && spec.kind === 'interval'
          ? `${spec.repeat} × ${formatTimer(spec.workSeconds)} Belastung · ${formatTimer(spec.recoverySeconds)} lockere Bewegung dazwischen · gesamt ${formatTimer(duration)}`
          : index === 1 && spec.kind === 'sprint'
            ? `${spec.series} Serien à ${spec.sprintsPerSeries} × ${spec.sprintMeters} m · ${spec.recoverySeconds} s Laufpause · ${formatTimer(spec.seriesRecoverySeconds)} Serienpause`
          : `${formatTimer(duration)} ${index === 1 ? 'fest' : 'Orientierung · frei beenden'}`}</small>
        {intensity && <small>{intensity}</small>}
        {index === 1 && ['interval', 'sprint'].includes(spec.kind) && spec.intensity?.recovery
          && <small>Erholung: {spec.intensity.recovery}</small>}
      </li>)}
    </ol>
    {spec.intensity && <p className="helper-text">Die Gerätewerte sind Startbereiche, keine Pflichtwerte.
      Passe Tempo oder Widerstand an dein Belastungsgefühl an.</p>}
  </>
}

function TrainingSessionCard({ session, planName, onShow, onOpen, onDelete }) {
  const ongoing = isOpenTraining(session)
  return <article id={`training-session-${session.id}`} className={`diary-panel training-session-card${ongoing ? ' training-session-open' : ''}`}>
    <div className="volleyball-day-header">
      <h3>{formatDate(session.date)}</h3>
      <span>{isSportTrainingAttendance(session) ? 'Abgeschlossen'
        : session.enduranceFlow ? 'Geführte Einheit' : `${session.exercises.length} Übungen`}</span>
    </div>
    <p className="training-session-category">{canonicalCategory(session.category, session.subcategory) || 'Training'}</p>
    {planName && <p className="training-history-plan">Vorlage: {planName}</p>}
    {ongoing && <>
      <p className="training-open-hint">Diese Einheit ist noch nicht abgeschlossen.</p>
      <button type="button" className="primary-button" onClick={onOpen}>Training fortsetzen</button>
    </>}
    <button type="button" className="secondary-button" onClick={onShow}>Training anzeigen</button>
    <button type="button" className="secondary-button volleyball-delete-action" onClick={onDelete}>
      Training löschen
    </button>
  </article>
}

export default function TrainingView({ sessions, setSessions, exerciseLibrary,
  setExerciseLibrary, trainingPlans, setTrainingPlans, setNotice, athleteProfile, onOpenArchive, navigationTarget, onReturn }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [customDate, setCustomDate] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [newCategory, setNewCategory] = useState('Krafttraining')
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)
  const [planSearch, setPlanSearch] = useState('')
  const [sportDateError, setSportDateError] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [showPlans, setShowPlans] = useState(false)
  const [expandedPlanCategory, setExpandedPlanCategory] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
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
  const [customStrengthRole, setCustomStrengthRole] = useState('compound')
  const [libraryCategory, setLibraryCategory] = useState('Krafttraining')
  const [libraryName, setLibraryName] = useState('')
  const [libraryType, setLibraryType] = useState('strength')
  const [libraryGroup, setLibraryGroup] = useState('Brust')
  const [libraryStrengthRole, setLibraryStrengthRole] = useState('compound')
  const [renamingIndex, setRenamingIndex] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  useEffect(() => {
    if (!navigationTarget) return
    let scrollFrame
    const frame = window.requestAnimationFrame(() => {
      if (navigationTarget.mode === 'create') {
        setPendingPlan(null)
        setPlanSearch('')
        setSportDateError('')
        setSelectedDate(navigationTarget.date)
        setCustomDate(true)
        if (TRAINING_CATEGORIES.includes(navigationTarget.category)) setNewCategory(navigationTarget.category)
        setNewSessionOpen(true)
        return
      }
      setShowHistory(true)
      setExpandedSessionId(navigationTarget.id)
      scrollFrame = window.requestAnimationFrame(() => {
        document.getElementById(`training-session-${navigationTarget.id}`)?.scrollIntoView({ block: 'start' })
      })
    })
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(scrollFrame) }
  }, [navigationTarget])
  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const managedLibrary = exerciseLibrary.map((item, sourceIndex) => {
    const enriched = enrichExercise({ ...item, category: canonicalCategory(item.category, item.name) })
    return { ...enriched,
      muscleGroup: enriched.muscleGroup === 'Ganzkörper'
        ? enriched.category === 'Core und Mobility' ? 'Mobility' : 'Ohne Muskelgruppe'
        : enriched.muscleGroup,
      id: exerciseIdentity(item), sourceIndex }
  })
  const visibleLibrary = [...managedLibrary, ...DEFAULT_EXERCISES.filter((item) =>
    !managedLibrary.some((existing) => existing.category === item.category
      && existing.name === item.name))]
  const visiblePlans = visibleTrainingPlans(trainingPlans)
  const planGroups = groupedTrainingPlans(visiblePlans)
  const matchingPlans = searchTrainingPlans(plansForCategory(visiblePlans, newCategory), planSearch)
  const libraryGroups = groupsFor(visibleLibrary, libraryCategory).map(([group]) => group)
  const sortedSessions = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const openSessions = sortedSessions.filter(isOpenTraining)
  const completedSessions = sortedSessions.filter((session) => !isOpenTraining(session)
    && isRecentDate(session.date))

  function planNameFor(session) {
    return session.planName || trainingPlans.find((plan) => plan.id === session.planId)?.name
  }
  function deleteSession(session) {
    const label = isOpenTraining(session) ? 'Das offene Training' : `Training vom ${formatDate(session.date)}`
    if (!window.confirm(`${label} wirklich löschen? Erfasste Werte gehen verloren.`)) return
    setSessions((previous) => previous.filter((item) => item.id !== session.id))
    setExpandedSessionId(null)
    if (activeSessionId === session.id) closeTraining()
  }

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
    const guided = guidedEnduranceSpec(plan)
    const references = guided ? [guidedMainReference(plan)] : plan.exercises
    return references.map((reference, index) => {
      const item = visibleLibrary.find((candidate) => exerciseIdentity(candidate) === reference.libraryId)
        ?? visibleLibrary.find((candidate) => candidate.name === reference.name
          && candidate.category === (reference.category ?? plan.category))
        ?? { ...reference, id: reference.libraryId, category: reference.category ?? plan.category }
      const exercise = createLoggedExercise({ ...item, ...reference,
        id: item.id, loadMode: reference.loadMode ?? item.loadMode,
        target: reference.target ?? item.target })
      if (guided) return { ...exercise, guidedEndurance: true,
        guidedProtocolId: plan.id,
        targetDurationSeconds: mainDurationSeconds(guided) }
      return index === 0 ? { ...exercise,
        entries: [{ ...createTrainingSet(exercise.type,
          exercise.defaultDurationUnit ?? (exercise.intervalWorkMinutes ? 'min' : 's')),
          completed: false }] } : exercise
    })
  }
  function openNewTraining(plan = null) {
    if (openSessions.length) {
      setNotice('Bitte setze zuerst dein offenes Training fort oder schließe es ab.'); return
    }
    setPendingPlan(isSportTrainingCategory(plan?.category) ? null : plan)
    setPlanSearch('')
    setSportDateError('')
    setCustomDate(false)
    setSelectedDate(today())
    if (plan) setNewCategory(plan.category)
    setShowPlans(false)
    setExpandedPlanCategory(null)
    setNewSessionOpen(true)
  }
  function saveSportTraining() {
    const entryDate = customDate ? selectedDate : today()
    if (!entryDate) { setSportDateError('Bitte wähle ein Trainingsdatum.'); return }
    const timestamp = new Date().toISOString()
    const session = createSportTrainingSession({ id: crypto.randomUUID(), date: entryDate,
      category: newCategory, timestamp })
    if (!session) return
    if (openSessions.length) {
      setSportDateError('Bitte schließe zuerst dein offenes Training ab.'); return
    }
    setSessions((previous) => [...previous, session])
    setNewSessionOpen(false)
    setSportDateError('')
    setNotice(`${newCategory} abgeschlossen.`)
  }
  function startSession(plan = null) {
    if (openSessions.length) {
      setNewSessionOpen(false)
      setNotice('Es gibt bereits ein offenes Training. Bitte setze es zuerst fort.'); return
    }
    const entryDate = customDate ? selectedDate : today()
    if (!entryDate) { setNotice('Bitte wähle ein Trainingsdatum.'); return }
    const exercises = plan ? exercisesFromPlan(plan) : []
    const guided = guidedEnduranceSpec(plan)
    const category = plan && (plan.categories ?? [plan.category]).includes(newCategory)
      ? newCategory : plan?.category ?? 'Krafttraining'
    const session = {
      id: crypto.randomUUID(), date: entryDate,
      category, categories: plan?.categories ?? [category], subcategory: '',
      planId: plan?.id ?? null, planName: plan?.name ?? '',
      durationMinutes: '', intensity: '', notes: '', status: 'ongoing',
      ...(guided ? { enduranceFlow: { spec: guided, phase: 'warmup',
        clock: null, mainConfirmed: false,
        distanceTracking: tracksDeviceDistance(guided), deviceUnit: 'km',
        warmupDeviceReading: '', mainDeviceReading: '' } } : {}),
      exercises, createdAt: new Date().toISOString(),
    }
    setSessions((previous) => addTrainingIfNoOpen(previous, session))
    setNewSessionOpen(false)
    setPendingPlan(null)
    setActiveSessionId(session.id)
    setActiveExerciseId(exercises[0]?.id ?? null)
    setFlowStep(exercises.length ? 'set' : 'exercise')
    setFlowMessage('')
    setSelectedGroup('')
    setSelectedExerciseCategory(plan ? exercises[0]?.category ?? category : null)
    setCustomGroup(groupsFor(visibleLibrary, exercises[0]?.category ?? category)[0]?.[0] ?? 'Allgemein')
    setCustomType(defaultMeasurement(category))
    setNotice('')
  }
  function addExercise(item) {
    if (item.category === 'Ausdauer') {
      const plan = visiblePlans.find((candidate) => guidedEnduranceSpec(candidate)
        && candidate.guidedEndurance.mainLibraryId === item.id)
        ?? guidedCardioPlanForExercise(item)
      if (plan) { startGuidedExercise(item, plan); return }
    }
    const exercise = createLoggedExercise(item)
    exercise.entries = [{ ...createTrainingSet(exercise.type,
      exercise.defaultDurationUnit ?? (exercise.intervalWorkMinutes ? 'min' : 's')),
      completed: false }]
    updateSession(trainingWithAddedExercise(activeSession, exercise))
    setActiveExerciseId(exercise.id)
    setFlowStep('set')
    setEditingSetId(null)
    setFlowMessage('')
    setNotice('')
  }
  function startGuidedExercise(item, plan) {
    const spec = guidedEnduranceSpec(plan)
    if (!spec) {
      setFlowMessage('Für diese Ausdauerübung ist kein geführter Ablauf verfügbar.'); return
    }
    const exercise = { ...createLoggedExercise(item), guidedEndurance: true,
      guidedProtocolId: plan.id, entries: [] }
    updateSession(trainingWithAddedExercise(activeSession, exercise, {
      spec, planId: plan.id, exerciseId: exercise.id, freeTraining: true,
      phase: 'warmup', clock: null, mainConfirmed: false,
      distanceTracking: tracksDeviceDistance(spec), deviceUnit: 'km',
      warmupDeviceReading: '', mainDeviceReading: '',
    }))
    setActiveExerciseId(null)
    setSelectedExerciseCategory('Ausdauer')
    setFlowMessage('')
    setNotice('')
  }
  function openExercise(exercise) {
    const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
    if (!(exercise.entries ?? []).some((entry) => entry.completed === false)) {
      updateExercise(exercise.id, { entries: [...(exercise.entries ?? []),
        { ...createTrainingSet(type,
          exercise.defaultDurationUnit ?? (exercise.intervalWorkMinutes ? 'min' : 's')),
          completed: false }] })
    }
    setActiveExerciseId(exercise.id)
    setFlowStep('set')
    setEditingSetId(null)
    setFlowMessage('')
  }
  function confirmSet() {
    const exercise = activeSession.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return
    const type = exerciseMeasurement({ ...exercise, category: activeSession.category })
    const entries = exercise.entries ?? []
    const draft = entries.find((entry) => entry.completed === false)
    const previous = previousExercise(sessions, activeSession, exercise)
    const sameType = previous && exerciseMeasurement({ ...previous.item,
      category: previous.item.category ?? previous.session.category }) === type
    const reference = sameType ? previousSetFor(previous,
      entries.filter((entry) => isConfirmedSet(entry, type)).length) : null
    const values = suggestedTrainingSet(draft, reference, type, exercise)
    if (timerIsActive(activeSession.id, exercise.id, draft?.id)) {
      setFlowMessage('Bitte stoppe zuerst die Zeitmessung für diesen Satz.'); return
    }
    if (draft && !hasRequiredIntervalDuration(exercise, values)) {
      setFlowMessage('Bitte gib die tatsächlich geschaffte Dauer dieses Intervalls ein.'); return
    }
    const advanced = confirmAndAdvanceSet(entries, type, athleteProfile.bodyweightKg, reference, exercise)
    if (!advanced) {
      setFlowMessage(exercise.libraryId === 'gym:assisted-pullup'
        ? 'Bitte gib Wiederholungen und die Unterstützung der Maschine in kg ein.'
        : 'Bitte gib die Werte für diesen Satz ein.'); return
    }
    updateExercise(exercise.id, { entries: advanced })
    setFlowMessage('')
  }
  function recordTimerDuration(exerciseId, seconds, setId) {
    setSessions((previous) => previous.map((session) => {
      if (session.id !== activeSessionId) return session
      return { ...session, exercises: session.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise
        const entries = exercise.entries ?? []
        if (!entries.some((entry) => entry.id === setId && entry.completed === false)) return exercise
        return { ...exercise, entries: entries.map((entry) => entry.id === setId
          ? { ...entry, durationValue: String(seconds), durationUnit: 's' } : entry) }
      }) }
    }))
    setFlowMessage('')
  }
  function updateEnduranceFlow(updater) {
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      && session.enduranceFlow
      ? { ...session, enduranceFlow: updater(session.enduranceFlow) } : session))
  }
  function confirmEnduranceMain() {
    const now = Date.now()
    const entryId = crypto.randomUUID()
    setSessions((previous) => previous.map((session) => session.id === activeSessionId
      ? confirmGuidedMain(session, now, entryId) : session))
  }
  function updateGuidedResult(changes) {
    const exercise = activeSession?.exercises.find((item) => activeSession.enduranceFlow?.exerciseId
      ? item.id === activeSession.enduranceFlow.exerciseId : item.guidedEndurance)
    if (!exercise) return
    updateExercise(exercise.id, { entries: exercise.entries.map((entry) =>
      entry.guidedCompletion ? { ...entry, ...changes } : entry) })
  }
  function updateGuidedReading(field, value) {
    setSessions((previous) => previous.map((session) => {
      if (session.id !== activeSessionId || !session.enduranceFlow?.distanceTracking) return session
      const flow = field === 'deviceUnit'
        ? { ...session.enduranceFlow, deviceUnit: value,
          warmupDeviceReading: '', mainDeviceReading: '' }
        : { ...session.enduranceFlow, [field]: value }
      const distance = deviceDistanceMeters(flow)
      return { ...session, enduranceFlow: flow,
        exercises: session.exercises.map((exercise) => {
          if (flow.exerciseId && exercise.id !== flow.exerciseId) return exercise
          return { ...exercise, entries: (exercise.entries ?? []).map((entry) =>
            entry.guidedCompletion
              ? { ...entry, distanceValue: distance == null ? '' : String(distance / 1000),
                deviceStartReading: flow.warmupDeviceReading,
                deviceEndReading: flow.mainDeviceReading,
                deviceReadingUnit: flow.deviceUnit }
              : entry) }
        }) }
    }))
    setFlowMessage('')
  }
  function continueAfterGuidedExercise() {
    const flow = activeSession?.enduranceFlow
    if (!flow?.freeTraining || flow.phase !== 'summary' || !flow.mainConfirmed) return
    if (flow.distanceTracking && deviceDistanceMeters(flow) == null) {
      setFlowMessage('Bitte prüfe die beiden Gerätestände vor der nächsten Übung.'); return
    }
    updateSession({ enduranceFlow: null })
    setSelectedExerciseCategory('Ausdauer')
    setSelectedGroup('')
    setFlowStep('exercise')
    setFlowMessage('')
  }
  function finishExercise() {
    const exercise = activeSession.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return
    const draft = (exercise.entries ?? []).find((entry) => entry.completed === false)
    if (timerIsActive(activeSession.id, exercise.id, draft?.id)) {
      setFlowMessage('Bitte stoppe zuerst die laufende Zeitmessung.'); return
    }
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
    setShowHistory(false)
    setExpandedSessionId(null)
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
    setCustomGroup(groupsFor(visibleLibrary, category)[0]?.[0] ?? 'Allgemein')
    document.querySelector('.app-scroll-region')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function recategorizeSession(category) {
    updateSession({ category, categories: [category], legacyCategory: activeSession.category,
      exercises: activeSession.exercises.map((exercise) => ({ ...exercise,
        ...(exercise.category ? { category } : {}) })) })
    setCustomType(defaultMeasurement(category))
    setCustomGroup(groupsFor(visibleLibrary, category)[0]?.[0] ?? 'Allgemein')
  }
  function createCustomExercise() {
    const name = customName.trim()
    if (!name || !activeSession) { setFlowMessage('Bitte gib einen Übungsnamen ein.'); return }
    if (visibleLibrary.some((item) => item.category === selectedExerciseCategory
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setFlowMessage('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    const item = { id: crypto.randomUUID(), name, category: selectedExerciseCategory,
      type: customType, muscleGroup: customGroup,
      ...(selectedExerciseCategory === 'Krafttraining'
        ? { strengthRole: customStrengthRole } : {}) }
    setExerciseLibrary((previous) => [...previous, item])
    if (item.category === 'Ausdauer') {
      startGuidedExercise(item, guidedCardioPlanForExercise(item))
      setCustomName('')
      setNotice('Cardio-Übung angelegt und geführte Phase gestartet.')
      return
    }
    const exercise = createLoggedExercise(item)
    exercise.entries = [{ ...createTrainingSet(exercise.type), completed: false }]
    updateSession(trainingWithAddedExercise(activeSession, exercise))
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
    if (activeSession.enduranceFlow && (activeSession.enduranceFlow.phase !== 'summary'
      || !activeSession.enduranceFlow.mainConfirmed)) {
      setFlowMessage('Bitte absolviere und bestätige zuerst die geführte Hauptübung.'); return
    }
    if (activeSession.enduranceFlow?.distanceTracking
      && deviceDistanceMeters(activeSession.enduranceFlow) == null) {
      setFlowMessage('Bitte prüfe die beiden Gerätestände. Der Stand nach der Hauptübung muss größer sein.'); return
    }
    if (activeSession.exercises.some((exercise) => (exercise.entries ?? [])
      .some((entry) => isConfirmedSet(entry, exerciseMeasurement(exercise))
        && !hasRequiredIntervalDuration(exercise, entry)))) {
      setFlowMessage('Bei einem Intervall fehlt die tatsächlich geschaffte Dauer.'); return
    }
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
    setShowPlans(true)
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
      ...(item.strengthRole ? { strengthRole: item.strengthRole } : {}),
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
  function deletePlan(plan) {
    const standard = isBuiltInPlan(plan)
    const question = standard
      ? `Standardvorlage „${plan.name}“ aus deiner Vorlagenliste entfernen? Abgeschlossene Einheiten bleiben erhalten.`
      : `Vorlage „${plan.name}“ löschen? Abgeschlossene Einheiten bleiben erhalten.`
    if (!window.confirm(question)) return
    setTrainingPlans((previous) => removeTrainingPlan(previous, plan))
    setPlanDraft(null)
    setNotice(standard ? 'Standardvorlage aus deiner Liste entfernt.' : 'Trainingsvorlage gelöscht.')
  }
  function addLibraryItem() {
    const name = libraryName.trim()
    if (!name) { setNotice('Bitte gib einen Übungsnamen ein.'); return }
    if (visibleLibrary.some((item) => item.category === libraryCategory
      && item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
      setNotice('Diese Übung gibt es in der Kategorie bereits.'); return
    }
    setExerciseLibrary((previous) => [...previous, { id: crypto.randomUUID(), name,
      category: libraryCategory, type: libraryType, muscleGroup: libraryGroup,
      ...(libraryCategory === 'Krafttraining'
        ? { strengthRole: libraryStrengthRole } : {}) }])
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
  function changeLibraryStrengthRole(index, strengthRole) {
    const item = exerciseLibrary[index]
    const id = exerciseIdentity(item)
    setExerciseLibrary((previous) => previous.map((entry, i) => i === index
      ? { ...entry, id, strengthRole } : entry))
    setSessions((previous) => previous.map((session) => ({ ...session,
      exercises: session.exercises.map((exercise) => exercise.libraryId === id
        ? { ...exercise, strengthRole } : exercise),
    })))
    setTrainingPlans((previous) => previous.map((plan) => ({ ...plan,
      exercises: plan.exercises.map((reference) => reference.libraryId === id
        ? { ...reference, strengthRole } : reference),
    })))
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
        muscleGroup: category === 'Krafttraining'
          ? MUSCLE_GROUPS.includes(item.muscleGroup) ? item.muscleGroup : 'Ohne Muskelgruppe'
          : groupsFor(visibleLibrary, category)[0]?.[0] ?? 'Allgemein' }
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
      <span className="area-emblem tone-strength"><UIIcon name="training" /></span>
      <p className="eyebrow">DEIN TRAININGSTAGEBUCH</p><h2>Dein Training.</h2>
      <p>Wähle deine Trainingsart. Erfasse Übungen und Werte oder bestätige ein absolviertes Volleyballtraining.</p>
    </section>

    {openSessions.length > 0 && <section className="diary-panel training-open-section">
      <div className="section-heading"><div><p className="eyebrow">OFFENE EINHEIT</p>
        <h2>{openSessions.length === 1 ? 'Training fortsetzen' : 'Offene Trainings fortsetzen'}</h2>
      </div><span className="count-badge">{openSessions.length}</span></div>
      <p className="helper-text">Schließe dein offenes Training ab oder verwirf es, bevor du eine neue Einheit startest.</p>
      <div className="volleyball-day-list">{openSessions.map((session) => <TrainingSessionCard
        key={session.id} session={session} planName={planNameFor(session)}
        onShow={() => { setShowHistory(false); setExpandedSessionId(session.id) }}
        onOpen={() => openHistorySession(session)} onDelete={() => deleteSession(session)} />)}</div>
    </section>}

    {expandedSessionId && sessions.some((session) => session.id === expandedSessionId)
      && <EntryWindow layer={2} title={`Training · ${formatDate(sessions.find((session) => session.id === expandedSessionId).date)}`}
        subtitle="TRAININGSERGEBNISSE" onClose={() => {
          setExpandedSessionId(null)
          if (navigationTarget?.id === expandedSessionId) onReturn(navigationTarget)
        }}>
        <TrainingHistoryDetails session={sessions.find((session) => session.id === expandedSessionId)} />
        <div className="training-history-actions">
          <button type="button" className="secondary-button"
            onClick={() => openHistorySession(sessions.find((session) => session.id === expandedSessionId))}>
            {isOpenTraining(sessions.find((session) => session.id === expandedSessionId))
              ? 'Training fortsetzen' : 'Training bearbeiten'}
          </button>
        </div>
      </EntryWindow>}

    {!activeSession && <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">NEUE EINHEIT</p><h2>Training starten</h2></div></div>
      <p className="helper-text">{openSessions.length
        ? 'Eine neue Einheit ist verfügbar, sobald das offene Training abgeschlossen oder verworfen ist.'
        : 'Erfasse eine freie Einheit oder suche beim Start nach einer passenden Vorlage.'}</p>
      <button type="button" className="primary-button" disabled={openSessions.length > 0}
        onClick={() => openNewTraining()}>
        ＋ Training hinzufügen
      </button>
    </section>}

    {newSessionOpen && !activeSession && <EntryWindow title={pendingPlan?.name || 'Neues Training'}
      subtitle="TRAININGS-EINGABE" onClose={() => {
        setNewSessionOpen(false); setPendingPlan(null)
        if (navigationTarget?.mode === 'create') onReturn(navigationTarget)
      }}>
      <section className="diary-panel training-start-window">
      {pendingPlan ? <>
        <p className="training-plan-description">{pendingPlan.description}</p>
        {pendingPlan.evidence && <a className="training-plan-evidence" href={pendingPlan.evidence.url}
          target="_blank" rel="noopener noreferrer">Trainingsgrundlage: {pendingPlan.evidence.label} ↗</a>}
        {pendingPlan.weeklyEvidence && <a className="training-plan-evidence" href={pendingPlan.weeklyEvidence.url}
          target="_blank" rel="noopener noreferrer">Wochenrhythmus: {pendingPlan.weeklyEvidence.label} ↗</a>}
        <p className="history-meta">{(pendingPlan.categories ?? [pendingPlan.category]).join(' + ')}
          {' · '}{guidedEnduranceSpec(pendingPlan) ? '1 Übung · 3 Phasen'
            : `${pendingPlan.exercises.length} Übungen`}</p>
        {guidedEnduranceSpec(pendingPlan) ? <GuidedPlanPreview plan={pendingPlan} /> : <>
        <h3 className="training-preview-heading">Übungen in diesem Plan</h3>
        <ol className="training-plan-preview">
          {pendingPlan.exercises.map((item, index) => <li className="training-exercise-row"
            key={`${item.libraryId}-${index}`}>
            <span className="training-exercise-main"><strong>{index + 1}. {item.name}</strong>
              {item.target && <small>{item.target}</small>}</span>
            <ExerciseInfo exercise={item} />
          </li>)}
        </ol></>}
        <button type="button" className="text-button" onClick={() => setPendingPlan(null)}>
          Andere Vorlage wählen
        </button>
      </> : <>
      <ChoiceWheel label="Hauptkategorie für Vorlagen" value={newCategory}
        options={TRAINING_CATEGORIES}
        onChange={(category) => { setNewCategory(category); setPlanSearch(''); setSportDateError('') }} />
      {isSportTrainingCategory(newCategory) ? <>
        <p className="helper-text">Hat dieses Training am gewählten Tag stattgefunden? Es werden keine Übungen, Zeiten oder Leistungswerte erfasst.</p>
      </> : <>
      <label className="field-label" htmlFor="training-plan-search">Trainingsvorlage suchen</label>
      <input id="training-plan-search" className="field" type="search" value={planSearch}
        onChange={(event) => setPlanSearch(event.target.value)}
        placeholder="z. B. Rücken, Core oder Sprungkraft" />
      <p className="helper-text">Suche nach Planname, Muskelgruppe oder Übung. Tippe auf einen Treffer, um ihn zu verwenden.</p>
      <div className="training-plan-search-results" aria-live="polite">
        {matchingPlans.length ? matchingPlans.map((plan) => <button type="button"
          className="training-choice" key={plan.id} onClick={() => {
            if (isSportTrainingCategory(plan.category)) setNewCategory(plan.category)
            else setPendingPlan(plan)
          }}>
          <span><strong>{plan.name}</strong><small>{(plan.categories ?? [plan.category]).join(' + ')}
            {' · '}{guidedEnduranceSpec(plan) ? '1 Übung · 3 Phasen'
              : `${plan.exercises.length} Übungen`}</small></span><span aria-hidden="true">›</span>
        </button>) : <p className="helper-text">Keine passende Vorlage gefunden. Wähle eine andere Kategorie oder starte ein individuelles Training.</p>}
      </div>
      </>}
      </>}
      <p className="helper-text">Trainingsdatum: <strong>{customDate && !selectedDate
        ? 'Bitte wählen' : formatDate(customDate ? selectedDate : today())}</strong></p>
      <button type="button" className="secondary-button training-date-option"
        onClick={() => setShowDatePicker(true)}>Anderes Datum erfassen</button>
      {showDatePicker && <EntryWindow title="Trainingsdatum" subtitle="NEUES TRAINING"
        onClose={() => setShowDatePicker(false)}>
        <DateWheel label="Trainingsdatum" value={customDate ? selectedDate : today()}
          onChange={(date) => { setSelectedDate(date); setCustomDate(true) }} />
        {customDate && <button type="button" className="text-button"
          onClick={() => setCustomDate(false)}>Wieder heute verwenden</button>}
        <button type="button" className="primary-button" onClick={() => setShowDatePicker(false)}>Datum übernehmen</button>
      </EntryWindow>}
      {openSessions.length > 0 && <p className="training-open-hint" role="status">
        Ein anderes Training ist noch offen. Schließe dieses Fenster und setze es oben fort.
      </p>}
      {sportDateError && <p className="training-flow-error" role="alert">{sportDateError}</p>}
      <button type="button" className="primary-button" disabled={openSessions.length > 0}
        onClick={() => isSportTrainingCategory(newCategory) && !pendingPlan
          ? saveSportTraining() : startSession(pendingPlan)}>
        {isSportTrainingCategory(newCategory) && !pendingPlan ? 'Ja, Training abgeschlossen'
          : pendingPlan ? '＋ Vorlage starten' : '＋ Individuelles Training starten'}
      </button>
      {sessions.some((session) => session.date === (customDate ? selectedDate : today())) &&
        <p className="helper-text">An diesem Tag gibt es bereits Einheiten. Du kannst eine weitere beginnen oder unten eine öffnen.</p>}
      </section>
    </EntryWindow>}

    {activeSession && <EntryWindow title={activeSession.planName || 'Individuelles Training'}
      subtitle={`${formatDate(activeSession.date)} · ${(activeSession.categories ?? [activeSession.category]).join(' + ')}`}
      onClose={() => { closeTraining(); if (navigationTarget) onReturn(navigationTarget) }}>
      {isSportTrainingAttendance(activeSession)
        ? <SportTrainingEditor key={activeSession.id} session={activeSession} onClose={closeTraining}
          onSave={(changes) => { updateSession(changes); closeTraining(); setNotice('Trainingsdatum gespeichert.') }} />
        : activeSession.enduranceFlow ? <GuidedEndurancePanel session={activeSession} sessions={sessions}
          onUpdateFlow={updateEnduranceFlow} onUpdateSession={updateSession}
          onUpdateResult={updateGuidedResult} onUpdateReading={updateGuidedReading}
          onConfirmMain={confirmEnduranceMain} onSave={saveTraining}
          onContinue={continueAfterGuidedExercise}
          onClose={closeTraining} onCancel={cancelTraining} flowMessage={flowMessage} />
        : <GuidedTrainingPanel
      session={activeSession} sessions={sessions} library={visibleLibrary}
      athleteProfile={athleteProfile} exerciseCategory={selectedExerciseCategory}
      setExerciseCategory={setSelectedExerciseCategory}
      step={flowStep} setStep={setFlowStep} activeExerciseId={activeExerciseId}
      group={selectedGroup} setGroup={setSelectedGroup}
      editingSetId={editingSetId} setEditingSetId={setEditingSetId}
      flowMessage={flowMessage} newCategory={newCategory} setNewCategory={setNewCategory}
      customName={customName} setCustomName={setCustomName}
      customType={customType} setCustomType={setCustomType}
      customGroup={customGroup} setCustomGroup={setCustomGroup}
      customStrengthRole={customStrengthRole} setCustomStrengthRole={setCustomStrengthRole}
      onAddExercise={addExercise} onOpenExercise={openExercise}
      onCreateCustom={createCustomExercise} onUpdateSession={updateSession}
      onUpdateExercise={updateExercise} onRemoveExercise={removeExercise} onConfirmSet={confirmSet}
      onTimerDuration={recordTimerDuration}
      onFinishExercise={finishExercise} onSave={saveTraining}
      onRecategorize={recategorizeSession} onClose={closeTraining}
      onCancel={cancelTraining} />}
    </EntryWindow>}
    {!activeSession && <section className="diary-panel training-plans">
      <div className="section-heading">
        <div><p className="eyebrow">WIEDERVERWENDBAR</p><h2>Trainingsvorlagen</h2></div>
      </div>
      <button type="button" className="secondary-button training-section-toggle"
        onClick={() => { setExpandedPlanCategory(null); setShowPlans(true) }}>
        Vorlagen anzeigen
      </button>
      {showPlans && <EntryWindow key={planDraft ? `draft-${planDraft.id}` : expandedPlanCategory ?? 'all-plans'}
        title={planDraft ? 'Vorlage anpassen' : expandedPlanCategory ?? 'Trainingsvorlagen'}
        subtitle="WIEDERVERWENDBAR" onClose={() => {
          if (planDraft) setPlanDraft(null)
          else if (expandedPlanCategory) setExpandedPlanCategory(null)
          else setShowPlans(false)
        }}>
      {!planDraft && <>
        <p className="helper-text">Wähle einen Trainingsbereich und öffne dort eine passende Vorlage.</p>
        {openSessions.length > 0 && <p className="helper-text">Zum Starten einer Vorlage zuerst das offene Training abschließen.</p>}
        <div className="training-plan-groups">{planGroups.filter(({ category }) =>
          !expandedPlanCategory || category === expandedPlanCategory).map(({ category, plans }) =>
          <section className="training-plan-group" key={category}>
            {!expandedPlanCategory && <button type="button" className="training-plan-group-toggle"
              onClick={() => setExpandedPlanCategory(category)}>
              <strong>{category}</strong><span>{plans.length} {plans.length === 1 ? 'Vorlage' : 'Vorlagen'}</span>
              <span aria-hidden="true">›</span>
            </button>}
            {expandedPlanCategory === category && <div className="training-plan-group-content">
              {plans.map((plan) => <div className="training-plan-row" key={plan.id}>
                <div><strong>{plan.name}</strong>
                  <span className="history-meta">{(plan.categories ?? [plan.category]).join(' + ')} · {guidedEnduranceSpec(plan) ? '1 Übung · 3 Phasen' : `${plan.exercises.length} Übungen`}{!isBuiltInPlan(plan) ? ' · Eigene Vorlage' : ''}</span>
                  {plan.description && <span className="training-plan-description">{plan.description}</span>}
                  {plan.evidence && <a className="training-plan-evidence" href={plan.evidence.url}
                    target="_blank" rel="noopener noreferrer">Trainingsgrundlage: {plan.evidence.label} ↗</a>}</div>
                <button type="button" className="secondary-button" disabled={openSessions.length > 0}
                  onClick={() => openNewTraining(plan)}>Starten</button>
                <button type="button" className="secondary-button" onClick={() => beginPlan(plan)}>Anpassen</button>
              </div>)}
            </div>}
          </section>)}</div>
        {trainingPlans.some((plan) => isBuiltInPlan(plan) && plan.hidden) &&
          <button type="button" className="text-button" onClick={() => {
            setTrainingPlans((previous) => restoreBuiltInPlans(previous))
            setNotice('Standardvorlagen wiederhergestellt.')
          }}>Entfernte Standardvorlagen wiederherstellen</button>}
        <button type="button" className="secondary-button" onClick={() => beginPlan(null)}>＋ Vorlage erstellen</button>
      </>}
      {planDraft && <div className="training-plan-editor">
        <label className="field-label" htmlFor="plan-name">Name der Vorlage</label>
        <input id="plan-name" className="field" value={planDraft.name}
          onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))}
          placeholder="z. B. Oberkörper" />
        <ChoiceWheel label="Hauptkategorie" value={planDraft.category}
          options={[...(!TRAINING_CATEGORIES.includes(planDraft.category)
            ? [{ value: planDraft.category, label: `${planDraft.category} (alte Kategorie)` }] : []),
          ...TRAINING_CATEGORIES]}
          onChange={(category) => { setPlanDraft((draft) => ({ ...draft, category }));
            setPlanExerciseCategory(category); setPlanChoice('') }} />
        {planDraft.exercises.map((item, index) => <div className="training-plan-row" key={item.libraryId}>
          <span>{index + 1}. {item.name} · {item.category ?? planDraft.category}
            {(item.category ?? planDraft.category) === 'Krafttraining' && ` · ${item.muscleGroup || 'Ohne Muskelgruppe'}`}</span>
          <button type="button" className="text-button" onClick={() => setPlanDraft((draft) => ({ ...draft,
            exercises: draft.exercises.filter((reference) => reference.libraryId !== item.libraryId),
          }))}>Entfernen</button>
        </div>)}
        <ChoiceWheel label="Kategorie der nächsten Übung" value={planExerciseCategory}
          options={TRAINING_CATEGORIES}
          onChange={(category) => { setPlanExerciseCategory(category); setPlanChoice('') }} />
        <ExercisePicker id="plan-exercise" library={visibleLibrary} category={planExerciseCategory}
          value={planChoice} onChange={setPlanChoice} />
        <button type="button" className="secondary-button" onClick={addPlanExercise}>＋ Übung zur Vorlage</button>
        <div className="training-finish-actions">
          <button type="button" className="primary-button" onClick={savePlan}>Vorlage speichern</button>
          <button type="button" className="secondary-button" onClick={() => setPlanDraft(null)}>Abbrechen</button>
          {(isBuiltInPlan(planDraft) || trainingPlans.some((plan) => plan.id === planDraft.id)) &&
            <button type="button" className="secondary-button training-plan-delete"
              onClick={() => deletePlan(planDraft)}>Vorlage löschen</button>}
        </div>
      </div>}
      </EntryWindow>}
    </section>}

    <section className="diary-panel">
      <div className="section-heading"><div><p className="eyebrow">DEIN VERLAUF</p><h2>Trainingseinheiten</h2></div>
        <span className="count-badge">{completedSessions.length}</span></div>
      <p className="helper-text">Abgeschlossene Einheiten der letzten fünf Tage. Ältere Einträge findest du im Archiv.</p>
      {!completedSessions.length ? <p className="helper-text">Hier sind aktuell keine abgeschlossenen Trainingseinheiten.</p>
        : <>
          <button type="button" className="secondary-button training-section-toggle"
            onClick={() => { setExpandedSessionId(null); setShowHistory(true) }}>
            Aktuelle Trainingseinheiten anzeigen
          </button>
          {showHistory && <EntryWindow title="Trainingseinheiten"
            subtitle="DEIN VERLAUF" onClose={() => setShowHistory(false)}>
          <div className="volleyball-day-list training-history-list">
            {completedSessions.map((session) => <TrainingSessionCard key={session.id}
              session={session} planName={planNameFor(session)}
              onShow={() => setExpandedSessionId(session.id)}
              onOpen={() => openHistorySession(session)} onDelete={() => deleteSession(session)} />)}
          </div>
          </EntryWindow>}
        </>}
      <button type="button" className="secondary-button" onClick={() => { setShowHistory(false); setExpandedSessionId(null); onOpenArchive() }}>Zum Archiv</button>
    </section>

    <section className="diary-panel training-library">
      <div className="section-heading"><div><p className="eyebrow">ÜBUNGEN</p>
        <h2>Übungsbibliothek verwalten</h2></div></div>
      <button type="button" className="secondary-button training-section-toggle"
        onClick={() => setShowLibrary(true)}>
        Bibliothek anzeigen
      </button>
      {showLibrary && <EntryWindow title="Übungsbibliothek" subtitle="ÜBUNGEN VERWALTEN"
        onClose={() => setShowLibrary(false)}>
      <p className="helper-text">Jede Übung gehört zu einer Hauptkategorie und einer Muskelgruppe oder einem Schwerpunkt.</p>
      <ChoiceWheel label="Hauptkategorie" value={libraryCategory}
        options={TRAINING_CATEGORIES}
        onChange={(category) => {
          setLibraryCategory(category); setLibraryType(defaultMeasurement(category))
          setLibraryGroup(groupsFor(visibleLibrary, category)[0]?.[0] ?? 'Allgemein') }} />
      <label className="field-label" htmlFor="library-name">Neue Übung</label>
      <input id="library-name" className="field" value={libraryName}
        onChange={(event) => setLibraryName(event.target.value)} />
      <ChoiceWheel label="Messart" value={libraryType}
        options={MEASUREMENT_TYPES.map(([value, label]) => ({ value, label }))}
        onChange={setLibraryType} />
      <ChoiceWheel label={libraryCategory === 'Krafttraining' ? 'Muskelgruppe' : 'Schwerpunkt'}
        value={libraryGroup} onChange={setLibraryGroup}
        options={[...new Set([...libraryGroups, libraryGroup,
          ...(libraryCategory === 'Krafttraining' ? MUSCLE_GROUPS : [])])]} />
      {libraryCategory === 'Krafttraining' && <>
        <ChoiceWheel label="Übungsart" value={libraryStrengthRole}
          options={[{ value: 'compound', label: 'Grundübung' },
            { value: 'isolation', label: 'Isolationsübung' }]}
          onChange={setLibraryStrengthRole} />
      </>}
      <button type="button" className="secondary-button" onClick={addLibraryItem}>＋ Zur Bibliothek</button>
      <div className="training-library-list">
        {groupsFor(visibleLibrary, libraryCategory).map(([group, items]) => <div key={group}>
          <h3 className="training-group-heading">{group}</h3>
          {items.map((item) => {
            const index = item.sourceIndex
            return <div className="training-library-item" key={exerciseIdentity(item)}>
              {index === undefined ? <>
                <span>{item.name}</span><span className="history-meta">Empfohlene Übung
                  {libraryCategory === 'Krafttraining'
                    ? ` · ${strengthRoleFor(item) === 'compound' ? 'Grundübung' : 'Isolationsübung'}` : ''}</span>
              </> : <>
                <span>{item.name}</span>
                <WheelEdit label={`${libraryCategory === 'Krafttraining' ? 'Muskelgruppe' : 'Schwerpunkt'} für ${item.name}`}
                  value={item.muscleGroup || 'Allgemein'} onChange={(group) => changeLibraryGroup(index, group)}
                  options={[...new Set([...libraryGroups, item.muscleGroup || 'Allgemein',
                    ...(libraryCategory === 'Krafttraining' ? MUSCLE_GROUPS : [])])]} />
                {libraryCategory === 'Krafttraining' && <WheelEdit
                  label={`Übungsart für ${item.name}`} value={strengthRoleFor(item)}
                  onChange={(role) => changeLibraryStrengthRole(index, role)}
                  options={[{ value: 'compound', label: 'Grundübung' },
                    { value: 'isolation', label: 'Isolationsübung' }]} />}
                <button type="button" className="text-button" onClick={() => { setRenamingIndex(index); setRenameValue(item.name) }}>Umbenennen</button>
                <button type="button" className="text-button" onClick={() => {
                  if (!window.confirm(`„${item.name}“ aus der Bibliothek entfernen? Bestehende Einheiten bleiben erhalten.`)) return
                  setExerciseLibrary((previous) => previous.filter((_, i) => i !== index))
                }}>Entfernen</button>
              </>}
            </div>
          })}</div>)}
      </div>
      {renamingIndex !== null && exerciseLibrary[renamingIndex] && <EntryWindow
        title="Übung umbenennen" subtitle={exerciseLibrary[renamingIndex].name}
        onClose={() => setRenamingIndex(null)}>
        <label className="field-label" htmlFor="library-rename">Neuer Übungsname</label>
        <input id="library-rename" className="field" value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)} />
        <button type="button" className="primary-button" onClick={() => renameLibraryItem(renamingIndex)}>Speichern</button>
      </EntryWindow>}
      {managedLibrary.some((item) => !TRAINING_CATEGORIES.includes(item.category))
        && <div className="training-legacy">
          <strong>Ältere Übungen ohne neue Hauptkategorie</strong>
          <p className="helper-text">Diese Übungen bleiben erhalten. Ordne sie bei Bedarf selbst zu.</p>
          {managedLibrary.filter((item) => !TRAINING_CATEGORIES.includes(item.category))
            .map((item) => <div className="training-field" key={item.id}>{item.name} · {item.category}
              <WheelEdit label={`Neue Kategorie für ${item.name}`} value=""
                onChange={(category) => { if (category) reassignLibraryItem(item.sourceIndex, category) }}
                options={[{ value: '', label: 'Neue Kategorie wählen' }, ...TRAINING_CATEGORIES]} />
            </div>)}
        </div>}
      </EntryWindow>}
    </section>
  </div>
}
