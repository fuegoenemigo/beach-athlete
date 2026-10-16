import { useEffect, useState } from 'react'
import { elapsedSeconds, formatTimer } from './trainingTimer.js'
import { deviceDistanceMeters, hasWarmupReading, mainDurationSeconds,
  mainPhaseAt, finishGuidedSprint, prescribedSprints,
  sprintRecoverySeconds } from './enduranceFlow.js'
import { ADDITIONAL_PLANS, FOCUS_PLANS, VOLLEYBALL_PLANS } from './volleyballTraining.js'
import { enduranceProgress } from './enduranceProgress.js'
import { RatingStepper } from './VolleyballInputs.jsx'
import { NumberWheel, ChoiceWheel } from './WheelPicker.jsx'
import DateWheel from './DateWheel.jsx'

const freshClock = () => ({ startedAt: Date.now(), elapsedMs: 0, running: true })

export default function GuidedEndurancePanel({ session, sessions, onUpdateFlow, onUpdateSession,
  onUpdateResult, onUpdateReading, onConfirmMain, onContinue,
  onSave, onClose, onCancel, flowMessage }) {
  const flow = session.enduranceFlow
  const spec = flow.spec
  const intensity = spec.intensity ?? [...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
    .find((plan) => plan.id === session.planId)?.guidedEndurance?.intensity
  const [now, setNow] = useState(() => Date.now())
  const elapsed = elapsedSeconds(flow.clock, now)
  const main = mainPhaseAt(spec, elapsed)
  const isMain = flow.phase === 'main'
  const running = flow.clock?.running && (!isMain || main.kind !== 'done')
  const mainName = spec.kind === 'interval' ? 'Intervalltraining'
    : spec.kind === 'sprint' ? 'Sprintserie' : 'Hauptübung'
  const activeStep = flow.phase === 'warmup' ? 0 : ['ready', 'main'].includes(flow.phase) ? 1 : 2
  const guidedExercise = session.exercises.find((exercise) => flow.exerciseId
    ? exercise.id === flow.exerciseId : exercise.guidedEndurance)
  const result = guidedExercise?.entries.find((entry) => entry.guidedCompletion)
  const measuredMeters = deviceDistanceMeters(flow)
  const readingUnit = flow.deviceUnit === 'm' ? 'm' : 'km'
  const progress = flow.phase === 'summary' && !flow.freeTraining
    ? enduranceProgress(session, sessions) : null

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running || !navigator.wakeLock?.request) return undefined
    let lock
    let cancelled = false
    async function keepScreenOn() {
      if (document.visibilityState !== 'visible' || lock) return
      try {
        const requested = await navigator.wakeLock.request('screen')
        if (cancelled) await requested.release()
        else {
          lock = requested
          requested.addEventListener('release', () => { lock = null })
        }
      } catch { /* Nicht jeder Browser unterstützt das Wachhalten des Displays. */ }
    }
    keepScreenOn()
    document.addEventListener('visibilitychange', keepScreenOn)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', keepScreenOn)
      lock?.release()
    }
  }, [running])

  function moveTo(phase, clock = null) {
    onUpdateFlow((current) => ({ ...current, phase, clock }))
    setNow(Date.now())
  }

  function pause() {
    const at = Date.now()
    onUpdateFlow((current) => ({ ...current, clock: { ...current.clock, running: false,
      elapsedMs: elapsedSeconds(current.clock, at) * 1000 } }))
    setNow(at)
  }

  function resume() {
    const at = Date.now()
    onUpdateFlow((current) => ({ ...current, clock: { ...current.clock,
      running: true, startedAt: at } }))
    setNow(at)
  }

  const completed = session.status === 'completed'
  return <section className="diary-panel guided-endurance">
    <p className="eyebrow">GEFÜHRTE AUSDAUEREINHEIT</p>
    <div className="endurance-steps" aria-label="Ablauf">
      {['Aufwärmen', mainName, 'Auslaufen'].map((label, index) => <span key={label}
        className={index === activeStep ? 'current' : ''}>
        {index + 1} {label}</span>)}
    </div>

    {flow.phase === 'warmup' && <>
      <h2>Aufwärmen</h2>
      <p className="helper-text">Beginne locker. Orientierung: {formatTimer(spec.warmupSeconds)}.
        Beende das Aufwärmen, sobald du dich bereit fühlst. Die Dauer wird nicht gespeichert.</p>
      {intensity?.warmup && <p className="endurance-intensity">Richtwert: {intensity.warmup}</p>}
      <output className="endurance-clock">{formatTimer(elapsed)}</output>
      <div className="endurance-actions">
        {!flow.clock && <button type="button" className="primary-button"
          onClick={() => moveTo('warmup', freshClock())}>▶ Aufwärmen starten</button>}
        {flow.clock?.running && <button type="button" className="secondary-button"
          onClick={pause}>Pause</button>}
        {flow.clock && !flow.clock.running && <button type="button" className="secondary-button"
          onClick={resume}>Fortsetzen</button>}
        {flow.clock && <button type="button" className="primary-button"
          onClick={() => moveTo('ready')}>Aufwärmen beenden</button>}
      </div>
    </>}

    {flow.phase === 'ready' && <>
      <h2>Bereit für die Hauptübung</h2>
      {flow.distanceTracking && <div className="endurance-device-reading">
        <h3>Gerätestand nach dem Aufwärmen</h3>
        <p className="helper-text">Lies die bisher zurückgelegte Strecke am Gerät ab.
          Dieser Stand dient nur als Ausgangswert und zählt nicht zur Hauptübung.</p>
        <ChoiceWheel label="Anzeige am Gerät" value={readingUnit}
          options={[{ value: 'km', label: 'Kilometer' }, { value: 'm', label: 'Meter' }]}
          onChange={(unit) => onUpdateReading('deviceUnit', unit)} />
        <NumberWheel label={`Zurückgelegte Strecke am Gerät (${readingUnit})`}
          value={flow.warmupDeviceReading ?? ''} min={0} max={readingUnit === 'km' ? 100 : 100000}
          step={readingUnit === 'km' ? .001 : 1}
          onChange={(value) => onUpdateReading('warmupDeviceReading', value)} />
        {!hasWarmupReading(flow) && <p className="helper-text">Bitte den Gerätestand eintragen, bevor die Hauptübung startet.</p>}
      </div>}
      <p className="helper-text">{spec.kind === 'interval'
        ? `${spec.repeat} Belastungsphasen à ${formatTimer(spec.workSeconds)} mit ${formatTimer(spec.recoverySeconds)} lockerer Bewegung dazwischen. Die App beendet die Hauptübung nach ${formatTimer(mainDurationSeconds(spec))} automatisch.`
        : spec.kind === 'sprint'
          ? `${spec.series} Serien mit je ${spec.sprintsPerSeries} × ${spec.sprintMeters} m. Starte und beende jeden Sprint selbst. Die App zeigt die Pausen und zählt die Läufe.`
          : `${formatTimer(spec.mainSeconds)} gleichmäßige Bewegung. Die App beendet die Hauptübung nach ${formatTimer(mainDurationSeconds(spec))} automatisch.`}</p>
      {intensity?.work && <div className="endurance-intensity-guide">
        <p><strong>Belastung:</strong> {intensity.work}</p>
        {spec.kind === 'interval' && intensity.recovery
          && <p><strong>Erholung:</strong> {intensity.recovery}</p>}
        <small>Startbereiche: Tempo oder Widerstand an dein Belastungsgefühl anpassen.</small>
      </div>}
      <button type="button" className="primary-button"
        disabled={flow.distanceTracking && !hasWarmupReading(flow)}
        onClick={() => {
          if (spec.kind === 'sprint') onUpdateFlow((current) => ({ ...current,
            phase: 'main', clock: freshClock(), sprintStage: 'waiting',
            completedSprints: 0, sprintTimesSeconds: [], sprintStartedAt: null,
            recoveryStartedAt: null }))
          else moveTo('main', freshClock())
        }}>{mainName} starten</button>
    </>}

    {isMain && spec.kind === 'sprint' && <>
      <h2>{flow.sprintStage === 'done' ? 'Sprintserie beendet'
        : `Sprint ${Math.min((flow.completedSprints ?? 0) + 1, prescribedSprints(spec))} von ${prescribedSprints(spec)}`}</h2>
      <p className="endurance-phase-count">Serie {Math.min(Math.floor((flow.completedSprints ?? 0)
        / spec.sprintsPerSeries) + 1, spec.series)} von {spec.series}
        {' · '}{flow.completedSprints ?? 0} von {prescribedSprints(spec)} Läufen geschafft</p>
      {flow.sprintStage === 'waiting' && <>
        <p className="helper-text">Stelle dich für {spec.sprintMeters} m bereit. Starte die Zeit direkt beim Loslaufen.</p>
        <button type="button" className="primary-button" onClick={() => onUpdateFlow((current) => ({
          ...current, sprintStage: 'running', sprintStartedAt: Date.now(),
        }))}>▶ Sprint starten</button>
      </>}
      {flow.sprintStage === 'running' && <>
        <p className="helper-text">{spec.sprintMeters} m sprinten · Zeit seit Start</p>
        <output className="endurance-clock">{Math.max(0,
          (now - flow.sprintStartedAt) / 1000).toFixed(1)} s</output>
        <button type="button" className="primary-button" onClick={() => {
          const at = Date.now()
          onUpdateFlow((current) => finishGuidedSprint(current, at))
          setNow(at)
        }}>{spec.sprintMeters} m geschafft</button>
      </>}
      {flow.sprintStage === 'recovery' && <>
        <p className="helper-text">{flow.completedSprints % spec.sprintsPerSeries === 0
          ? 'Serienpause · locker bewegen und vollständig erholen'
          : 'Laufpause · locker gehen'}</p>
        <output className="endurance-clock endurance-rest-clock">{formatTimer(Math.max(0,
          Math.ceil(sprintRecoverySeconds(spec, flow.completedSprints)
            - (now - flow.recoveryStartedAt) / 1000)))}</output>
        {now - flow.recoveryStartedAt >= sprintRecoverySeconds(spec, flow.completedSprints) * 1000
          && <button type="button" className="primary-button"
            onClick={() => onUpdateFlow((current) => ({ ...current, sprintStage: 'running',
              sprintStartedAt: Date.now(), recoveryStartedAt: null }))}>
            ▶ Nächsten Sprint starten</button>}
      </>}
      {flow.sprintStage === 'done' && <>
        <p className="helper-text">Alle {prescribedSprints(spec)} Sprints wurden erfasst.
          Bestätige nur, wenn du sie wirklich vollständig absolviert hast.</p>
        <p className="endurance-distance-result">{prescribedSprints(spec) * spec.sprintMeters} m Sprintstrecke</p>
        <button type="button" className="primary-button" onClick={onConfirmMain}>
          Sprintserie vollständig absolviert · Auslaufen starten</button>
      </>}
      {flow.sprintStage !== 'done' && <button type="button" className="text-button"
        onClick={() => {
          if (window.confirm('Sprintserie abbrechen und neu starten? Es wird kein Abschluss gespeichert.'))
            onUpdateFlow((current) => ({ ...current, phase: 'ready', clock: null,
              sprintStage: null, completedSprints: 0, sprintTimesSeconds: [] }))
        }}>Sprintserie abbrechen</button>}
    </>}

    {isMain && spec.kind !== 'sprint' && <>
      {main.kind === 'done' ? <>
        <h2>{mainName} beendet</h2>
        <p className="helper-text">Alle vorgesehenen Phasen sind abgelaufen. Bestätige nur,
          wenn du die Hauptübung tatsächlich vollständig absolviert hast.</p>
        <output className="endurance-clock">{formatTimer(main.total)}</output>
        {flow.distanceTracking && <div className="endurance-device-reading">
          <h3>Gerätestand nach der Hauptübung</h3>
          <p className="helper-text">Lies den Stand direkt am Ende der Hauptübung ab,
            bevor die Strecke des Auslaufens dazukommt. Startstand: {flow.warmupDeviceReading} {readingUnit}.</p>
          <NumberWheel label={`Zurückgelegte Strecke am Gerät (${readingUnit})`}
            value={flow.mainDeviceReading ?? ''} min={0} max={readingUnit === 'km' ? 100 : 100000}
            step={readingUnit === 'km' ? .001 : 1}
            onChange={(value) => onUpdateReading('mainDeviceReading', value)} />
          {measuredMeters == null ? <p className="helper-text">Der zweite Stand muss größer sein
            als der Stand nach dem Aufwärmen.</p> : <p className="endurance-distance-result">
            Distanz der Hauptübung: <strong>{measuredMeters} m</strong></p>}
        </div>}
        <button type="button" className="primary-button" disabled={flow.distanceTracking && measuredMeters == null}
          onClick={onConfirmMain}>{mainName} vollständig absolviert · Auslaufen starten</button>
      </> : <>
        <h2 aria-live="polite" className={main.kind === 'recovery' ? 'endurance-recovery' : ''}>
          {main.kind === 'recovery' ? 'Locker gehen / fahren'
            : main.kind === 'work' ? 'Belastung' : 'Gleichmäßig laufen / fahren'}
        </h2>
        {spec.kind === 'interval' && <p className="endurance-phase-count">
          {main.kind === 'recovery' ? 'Erholung nach' : 'Belastung'} {main.interval} von {spec.repeat}
        </p>}
        {intensity?.[main.kind === 'recovery' ? 'recovery' : 'work']
          && <p className="endurance-intensity">Richtwert: {intensity[main.kind === 'recovery' ? 'recovery' : 'work']}</p>}
        <p className="helper-text">Noch in dieser Phase</p>
        <output className={`endurance-clock endurance-countdown${main.kind === 'recovery'
          ? ' endurance-rest-clock' : ''}`}>{formatTimer(Math.ceil(main.remaining))}</output>
        {spec.kind === 'interval' && <p className="helper-text">
          {main.kind === 'recovery' ? `Danach: ${formatTimer(spec.workSeconds)} Belastung`
            : main.interval < spec.repeat
              ? `Danach: ${formatTimer(spec.recoverySeconds)} locker gehen oder fahren`
              : 'Danach ist die Hauptübung abgeschlossen.'}
        </p>}
        <p className="helper-text">Gesamt: {formatTimer(main.elapsed)} / {formatTimer(main.total)}
          {' · '}noch {formatTimer(Math.ceil(main.total - main.elapsed))}.
          Der Wechsel zur nächsten Phase erfolgt automatisch. Lass die App für die Hinweise geöffnet.</p>
        <progress className="endurance-progress" max={main.total} value={main.elapsed} />
        <div className="endurance-actions">
          {flow.clock?.running ? <button type="button" className="secondary-button"
            onClick={pause}>Pausieren</button>
            : <button type="button" className="primary-button" onClick={resume}>Fortsetzen</button>}
          <button type="button" className="text-button" onClick={() => {
            if (window.confirm('Hauptübung abbrechen und neu starten? Es wird kein Abschluss gespeichert.'))
              onUpdateFlow((current) => ({ ...current, phase: 'ready', clock: null,
                warmupDeviceReading: '', mainDeviceReading: '' }))
          }}>Hauptübung abbrechen</button>
        </div>
      </>}
    </>}

    {flow.phase === 'cooldown' && <>
      <h2>Auslaufen</h2>
      <p className="helper-text">Bewege dich locker weiter. Orientierung: {formatTimer(spec.cooldownSeconds)}.
        Du kannst das Auslaufen selbst beenden; die Dauer wird nicht gespeichert.</p>
      {intensity?.cooldown && <p className="endurance-intensity">Richtwert: {intensity.cooldown}</p>}
      <output className="endurance-clock">{formatTimer(elapsed)}</output>
      <div className="endurance-actions">
        {flow.clock?.running ? <button type="button" className="secondary-button"
          onClick={pause}>Pause</button>
          : <button type="button" className="secondary-button" onClick={resume}>Fortsetzen</button>}
        <button type="button" className="primary-button"
          onClick={() => moveTo('summary')}>Auslaufen beenden</button>
      </div>
    </>}

    {flow.phase === 'summary' && <>
      <h2>{mainName} vollständig abgeschlossen</h2>
      <p className="helper-text">{spec.kind === 'interval'
        ? `${spec.repeat} von ${spec.repeat} Belastungsphasen absolviert.`
        : spec.kind === 'sprint' ? `${prescribedSprints(spec)} von ${prescribedSprints(spec)} Sprints absolviert.`
        : 'Die vorgegebene Hauptübung absolviert.'}
        {' '}Gespeichert wird die bestätigte Hauptübung von {formatTimer(spec.kind === 'sprint'
          ? Number(result?.durationValue || 0) : mainDurationSeconds(spec))}.
        Aufwärmen und Auslaufen zählen nicht zur Distanz der Hauptübung.</p>
      {!flow.freeTraining && <>
        <DateWheel label="Trainingsdatum" value={session.date}
          onChange={(date) => onUpdateSession({ date })} />
      </>}
      {flow.distanceTracking ? <div className="endurance-device-reading">
        <h3>Ermittelte Distanz der Hauptübung</h3>
        <p className="endurance-distance-result"><strong>{measuredMeters ?? '–'} m</strong>
          {' '}= Stand nach Hauptübung minus Stand nach Aufwärmen</p>
        <p className="helper-text">Ablesefehler? Korrigiere die beiden Gerätestände hier.</p>
        <NumberWheel label={`Nach Aufwärmen (${readingUnit})`}
          value={flow.warmupDeviceReading ?? ''} min={0} max={readingUnit === 'km' ? 100 : 100000}
          step={readingUnit === 'km' ? .001 : 1}
          onChange={(value) => onUpdateReading('warmupDeviceReading', value)} />
        <NumberWheel label={`Nach Hauptübung (${readingUnit})`}
          value={flow.mainDeviceReading ?? ''} min={0} max={readingUnit === 'km' ? 100 : 100000}
          step={readingUnit === 'km' ? .001 : 1}
          onChange={(value) => onUpdateReading('mainDeviceReading', value)} />
      </div> : spec.kind === 'sprint' ? <p className="endurance-distance-result">
        {result?.distanceValue} m in {result?.completedSprints} Sprints
        {' · '}durchschnittlich {result?.averageSprintSeconds} s pro Sprint
      </p> : guidedExercise?.type === 'distance' ? <>
        <NumberWheel label="Distanz der Hauptübung (km, optional)"
          value={result?.distanceValue ?? ''} min={0} max={100} step={.01}
          onChange={(distanceValue) => onUpdateResult({ distanceValue, distanceUnit: 'km' })} />
      </> : null}
      {!flow.freeTraining && <>
      <RatingStepper id="guided-endurance-intensity" label="Anstrengung der Hauptübung (1–10, optional)"
        value={session.intensity ?? ''} onChange={(intensity) => onUpdateSession({ intensity })} />
      {progress && <div className="endurance-progress-guidance">
        {progress.previousCount > 0 && <label className="endurance-comparable-check">
          <input type="checkbox" checked={flow.sameSetup === true}
            onChange={(event) => onUpdateFlow((current) => ({ ...current,
              sameSetup: event.target.checked }))} />
          Gleiches Gerät und gleiche Einstellungen wie beim letzten Mal
        </label>}
        {progress.changePercent != null && <p><strong>Gegenüber der letzten Einheit desselben Plans:</strong>
          {' '}{progress.changePercent > 0 ? '+' : ''}{progress.changePercent.toLocaleString('de-DE')} % Distanz</p>}
        <p>{progress.text}</p>
      </div>}
      <label className="field-label" htmlFor="guided-endurance-notes">Notiz zur Einheit (optional)</label>
      <textarea id="guided-endurance-notes" className="field notes-field" rows="2"
        value={session.notes ?? ''} onChange={(event) => onUpdateSession({ notes: event.target.value })} />
      </>}
      {flowMessage && <p className="training-flow-error" role="alert">{flowMessage}</p>}
      <button type="button" className="primary-button"
        disabled={flow.freeTraining && flow.distanceTracking && measuredMeters == null}
        onClick={flow.freeTraining ? onContinue : completed ? onClose : onSave}>
        {flow.freeTraining ? 'Weitere Übung wählen' : completed ? 'Schließen' : 'Training speichern'}
      </button>
    </>}

    {!completed && <div className="training-finish-actions">
      <button type="button" className="secondary-button" onClick={onClose}>Für später schließen</button>
      <button type="button" className="text-button training-cancel-action"
        onClick={onCancel}>Training abbrechen</button>
    </div>}
  </section>
}
