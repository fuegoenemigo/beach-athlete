import { useEffect, useRef, useState } from 'react'
import { elapsedSeconds, formatTimer, intervalPosition, prescribedSeconds } from './trainingTimer.js'

function readClock(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved?.startedAt && Number.isFinite(saved.elapsedMs) ? saved : null
  } catch { return null }
}

export default function TrainingTimer({ sessionId, exercise, confirmedCount, onDuration, onInterval }) {
  const key = `beach-athlete-timer:${sessionId}:${exercise.id}`
  const [clock, setClock] = useState(() => readClock(key))
  const [now, setNow] = useState(() => Date.now())
  const queued = useRef(Math.max(0, confirmedCount - (clock?.startCount ?? confirmedCount)))
  const target = prescribedSeconds(exercise)
  const count = Number(exercise.intervalCount) || 0
  const rest = Number(exercise.intervalRestSeconds) || 0
  const sequence = count > 1 && target > 0 && rest > 0
  const elapsed = elapsedSeconds(clock, now)
  const runs = Math.max(0, count - (clock?.startCount ?? confirmedCount))
  const position = sequence ? intervalPosition(elapsed, runs, target, rest) : null
  const completed = position?.completed
  const phase = position?.phase

  useEffect(() => {
    if (!clock?.running) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [clock?.running])

  useEffect(() => {
    if (!clock?.running || !navigator.wakeLock?.request) return undefined
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
      } catch { /* Nicht jeder Browser erlaubt eine Displaysperre. */ }
    }
    keepScreenOn()
    document.addEventListener('visibilitychange', keepScreenOn)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', keepScreenOn)
      lock?.release()
    }
  }, [clock?.running])

  useEffect(() => {
    try {
      if (clock) localStorage.setItem(key, JSON.stringify(clock))
      else localStorage.removeItem(key)
    } catch { /* Timer funktioniert auch ohne lokalen Speicher. */ }
  }, [clock, key])

  useEffect(() => {
    if (!clock?.running || !sequence || completed == null) return
    if (completed <= queued.current) return
    for (let index = queued.current; index < completed; index += 1) {
      onInterval(target, clock.startCount + index)
    }
    queued.current = completed
    setClock((current) => current ? { ...current, recorded: completed,
      ...(phase === 'done' ? { running: false, finished: true,
        elapsedMs: elapsedSeconds(current, Date.now()) * 1000 } : {}) } : current)
  }, [clock?.running, clock?.startCount, onInterval, completed, phase, sequence, target])

  function start() {
    const next = { startedAt: Date.now(), elapsedMs: 0, running: true,
      startCount: confirmedCount, recorded: 0 }
    queued.current = 0
    setNow(next.startedAt)
    setClock(next)
  }

  function pause() {
    const at = Date.now()
    setClock((current) => ({ ...current, running: false,
      elapsedMs: elapsedSeconds(current, at) * 1000 }))
    setNow(at)
  }

  function resume() {
    const at = Date.now()
    setClock((current) => ({ ...current, running: true, startedAt: at }))
    setNow(at)
  }

  function stop() {
    const seconds = elapsedSeconds(clock, Date.now())
    if (sequence) {
      const current = intervalPosition(seconds, runs, target, rest)
      for (let index = queued.current; index < current.completed; index += 1) {
        onInterval(target, clock.startCount + index)
      }
      if (current.phase === 'work' && current.partial >= 1) {
        onInterval(Math.round(current.partial), clock.startCount + current.completed)
      }
      queued.current = 0
    } else if (seconds >= 1) {
      onDuration(Math.round(seconds), clock.startCount)
    }
    setClock(null)
  }

  const remaining = sequence ? position.remaining : target ? target - elapsed : elapsed
  const label = sequence
    ? clock?.finished || position.phase === 'done' ? 'Alle Intervalle abgeschlossen'
      : `${position.phase === 'work' ? 'Belastung' : 'Lockere Pause'} ${position.index + 1 + (clock?.startCount ?? confirmedCount)}/${count}`
    : target ? `Ziel: ${formatTimer(target)}` : 'Stoppuhr'

  return <div className={`training-timer${sequence ? ` training-timer-${phase}` : ''}`}
    aria-label="Trainingszeit messen">
    <strong aria-live="polite">{label}</strong>
    <output className="training-timer-clock" aria-live="off">
      {target && !sequence && remaining < 0 ? `+${formatTimer(-remaining)}` : formatTimer(remaining)}
    </output>
    {sequence && <p>{count} × {formatTimer(target)} Belastung · {formatTimer(rest)} lockere Pause.
      Die Phasen wechseln automatisch; lass die App dafür geöffnet.</p>}
    {!sequence && <p>{exercise.type === 'duration'
      ? 'Beim Stoppen wird die gemessene Zeit als Satz gespeichert.'
      : 'Beim Stoppen wird die Zeit übernommen. Ergänze danach bei Bedarf die Strecke.'}</p>}
    <div className="training-timer-actions">
      {!clock && (!sequence || confirmedCount < count) && <button type="button" className="primary-button"
        onClick={start}>▶ Zeit starten</button>}
      {clock?.running && <button type="button" className="secondary-button" onClick={pause}>Pause</button>}
      {clock && !clock.running && !clock.finished && <button type="button" className="primary-button"
        onClick={resume}>▶ Fortsetzen</button>}
      {clock && !clock.finished && <button type="button" className="secondary-button"
        onClick={stop}>■ Stoppen &amp; übernehmen</button>}
      {clock?.finished && <button type="button" className="secondary-button"
        onClick={() => setClock(null)}>Fertig</button>}
    </div>
  </div>
}
