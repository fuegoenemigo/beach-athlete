import { useEffect, useState } from 'react'
import { elapsedSeconds, formatTimer, prescribedSeconds, timerStorageKey } from './trainingTimer.js'

function readClock(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved?.startedAt && Number.isFinite(saved.elapsedMs) ? saved : null
  } catch { return null }
}

function storeClock(key, clock) {
  try {
    if (clock) localStorage.setItem(key, JSON.stringify(clock))
    else localStorage.removeItem(key)
  } catch { /* Die Zeitmessung funktioniert auch ohne lokalen Speicher. */ }
}

export default function TrainingTimer({ sessionId, exercise, entry, confirmedCount, onDuration }) {
  const key = timerStorageKey(sessionId, exercise.id, entry.id)
  const [clock, setClock] = useState(() => readClock(key))
  const [now, setNow] = useState(() => Date.now())
  const target = prescribedSeconds(exercise)
  const rest = Number(exercise.intervalRestSeconds) || 0
  const previousSet = exercise.entries?.filter((item) => item.completed === true).at(-1)
  const confirmedAt = Date.parse(previousSet?.confirmedAt ?? '')
  const restElapsed = Number.isFinite(confirmedAt)
    ? Math.max(0, (now - confirmedAt) / 1000) : 0
  const savedSeconds = (Number(entry.durationValue) || 0) * (entry.durationUnit === 'min' ? 60 : 1)
  const elapsed = clock ? elapsedSeconds(clock, now) : savedSeconds
  const restRunning = Boolean(rest && confirmedCount && Number.isFinite(confirmedAt)
    && restElapsed < rest)

  useEffect(() => {
    if (!clock?.running && !restRunning) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [clock?.running, restRunning])

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

  function start() {
    const next = { startedAt: Date.now(), elapsedMs: 0, running: true }
    setNow(next.startedAt)
    setClock(next)
    storeClock(key, next)
  }

  function pause() {
    const at = Date.now()
    const next = { ...clock, running: false, elapsedMs: elapsedSeconds(clock, at) * 1000 }
    setClock(next)
    setNow(at)
    storeClock(key, next)
  }

  function resume() {
    const next = { ...clock, running: true, startedAt: Date.now() }
    setClock(next)
    setNow(next.startedAt)
    storeClock(key, next)
  }

  function stop() {
    const seconds = Math.round(elapsedSeconds(clock, Date.now()))
    if (seconds < 1) return
    storeClock(key, null)
    setClock(null)
    onDuration(seconds, entry.id)
  }

  return <div className="training-timer" aria-label="Trainingszeit messen">
    <strong>{target ? `Ziel für diesen Satz: ${formatTimer(target)}` : 'Stoppuhr für diesen Satz'}</strong>
    <output className="training-timer-clock" aria-live="off">{formatTimer(elapsed)}</output>
    {target > 0 && elapsed >= target && <p className="training-timer-goal">Ziel erreicht ✓</p>}
    {rest > 0 && confirmedCount > 0 && Number.isFinite(confirmedAt) && <p>
      Pause vor Satz {confirmedCount + 1}: {formatTimer(Math.min(restElapsed, rest))} / {formatTimer(rest)}
    </p>}
    <p>„Stoppen &amp; übernehmen“ füllt die Dauer aus. Danach bestätigst du den Satz selbst.</p>
    <div className="training-timer-actions">
      {!clock && <button type="button" className="primary-button" onClick={start}>▶ Zeit starten</button>}
      {clock?.running && <button type="button" className="secondary-button" onClick={pause}>Pause</button>}
      {clock && !clock.running && <button type="button" className="primary-button"
        onClick={resume}>▶ Fortsetzen</button>}
      {clock && <button type="button" className="secondary-button"
        onClick={stop}>■ Stoppen &amp; übernehmen</button>}
    </div>
  </div>
}
