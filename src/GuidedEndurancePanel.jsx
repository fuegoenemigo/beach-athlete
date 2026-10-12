import { useEffect, useState } from 'react'
import { elapsedSeconds, formatTimer } from './trainingTimer.js'
import { mainDurationSeconds, mainPhaseAt } from './enduranceFlow.js'
import { RatingStepper } from './VolleyballInputs.jsx'

const freshClock = () => ({ startedAt: Date.now(), elapsedMs: 0, running: true })

export default function GuidedEndurancePanel({ session, onUpdateFlow, onUpdateSession,
  onUpdateResult, onConfirmMain, onSave, onClose, onCancel, flowMessage }) {
  const flow = session.enduranceFlow
  const spec = flow.spec
  const [now, setNow] = useState(() => Date.now())
  const elapsed = elapsedSeconds(flow.clock, now)
  const main = mainPhaseAt(spec, elapsed)
  const isMain = flow.phase === 'main'
  const running = flow.clock?.running && (!isMain || main.kind !== 'done')
  const mainName = spec.kind === 'interval' ? 'Intervalltraining' : 'Hauptübung'
  const activeStep = flow.phase === 'warmup' ? 0 : ['ready', 'main'].includes(flow.phase) ? 1 : 2
  const result = session.exercises.find((exercise) => exercise.guidedEndurance)
    ?.entries.find((entry) => entry.guidedCompletion)

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
      <p className="helper-text">{spec.kind === 'interval'
        ? `${spec.repeat} Belastungsphasen à ${formatTimer(spec.workSeconds)} mit ${formatTimer(spec.recoverySeconds)} lockerer Bewegung dazwischen.`
        : `${formatTimer(spec.mainSeconds)} gleichmäßige Bewegung.`}
        {' '}Die App zeigt dir jede Phase und beendet die Hauptübung nach {formatTimer(mainDurationSeconds(spec))} automatisch.</p>
      <button type="button" className="primary-button"
        onClick={() => moveTo('main', freshClock())}>{mainName} starten</button>
    </>}

    {isMain && <>
      {main.kind === 'done' ? <>
        <h2>{mainName} beendet</h2>
        <p className="helper-text">Alle vorgesehenen Phasen sind abgelaufen. Bestätige nur,
          wenn du die Hauptübung tatsächlich vollständig absolviert hast.</p>
        <output className="endurance-clock">{formatTimer(main.total)}</output>
        <button type="button" className="primary-button"
          onClick={onConfirmMain}>{mainName} vollständig absolviert · Auslaufen starten</button>
      </> : <>
        <h2 aria-live="polite" className={main.kind === 'recovery' ? 'endurance-recovery' : ''}>
          {main.kind === 'recovery' ? 'Locker gehen / fahren'
            : main.kind === 'work' ? 'Belastung' : 'Gleichmäßig laufen / fahren'}
        </h2>
        {spec.kind === 'interval' && <p className="endurance-phase-count">
          {main.kind === 'recovery' ? 'Erholung nach' : 'Belastung'} {main.interval} von {spec.repeat}
        </p>}
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
              moveTo('ready')
          }}>Hauptübung abbrechen</button>
        </div>
      </>}
    </>}

    {flow.phase === 'cooldown' && <>
      <h2>Auslaufen</h2>
      <p className="helper-text">Bewege dich locker weiter. Orientierung: {formatTimer(spec.cooldownSeconds)}.
        Du kannst das Auslaufen selbst beenden; die Dauer wird nicht gespeichert.</p>
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
        : 'Die vorgegebene Hauptübung absolviert.'}
        {' '}Gespeichert wird die bestätigte Hauptübung von {formatTimer(mainDurationSeconds(spec))}.
        Aufwärmen und Auslaufen bleiben ohne Messwerte.</p>
      <label className="field-label" htmlFor="guided-endurance-date">Trainingsdatum</label>
      <input id="guided-endurance-date" className="field" type="date" value={session.date}
        onChange={(event) => { if (event.target.value) onUpdateSession({ date: event.target.value }) }} />
      <label className="field-label" htmlFor="guided-endurance-distance">
        Distanz der Hauptübung (km, optional)</label>
      <input id="guided-endurance-distance" className="field" type="number" min="0" step="any"
        inputMode="decimal" value={result?.distanceValue ?? ''}
        onChange={(event) => {
          const value = event.target.value
          if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0))
            onUpdateResult({ distanceValue: value, distanceUnit: 'km' })
        }} />
      <RatingStepper id="guided-endurance-intensity" label="Anstrengung der Hauptübung (1–10, optional)"
        value={session.intensity ?? ''} onChange={(intensity) => onUpdateSession({ intensity })} />
      <label className="field-label" htmlFor="guided-endurance-notes">Notiz zur Einheit (optional)</label>
      <textarea id="guided-endurance-notes" className="field notes-field" rows="2"
        value={session.notes ?? ''} onChange={(event) => onUpdateSession({ notes: event.target.value })} />
      {flowMessage && <p className="training-flow-error" role="alert">{flowMessage}</p>}
      <button type="button" className="primary-button"
        onClick={completed ? onClose : onSave}>{completed ? 'Schließen' : 'Training speichern'}</button>
    </>}

    {!completed && <div className="training-finish-actions">
      <button type="button" className="secondary-button" onClick={onClose}>Für später schließen</button>
      <button type="button" className="text-button training-cancel-action"
        onClick={onCancel}>Training abbrechen</button>
    </div>}
  </section>
}
