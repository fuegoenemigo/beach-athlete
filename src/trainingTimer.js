export function prescribedSeconds(exercise) {
  if (Number(exercise.targetDurationSeconds) > 0) return Number(exercise.targetDurationSeconds)
  if (Number(exercise.intervalWorkMinutes) > 0) return Number(exercise.intervalWorkMinutes) * 60
  const match = String(exercise.target ?? '').match(/(\d+)(?:[–-]\d+)?\s*(Min\.|Minuten|s\b)/i)
  if (!match) return 0
  return Number(match[1]) * (/^s$/i.test(match[2]) ? 1 : 60)
}

export function elapsedSeconds(clock, now) {
  if (!clock) return 0
  return Math.max(0, (clock.elapsedMs + (clock.running ? now - clock.startedAt : 0)) / 1000)
}

export function timerStorageKey(sessionId, exerciseId, setId) {
  return `beach-athlete-timer:${sessionId}:${exerciseId}:${setId}`
}

export function formatTimer(seconds) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}
