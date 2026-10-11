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

export function intervalPosition(elapsed, count, work, rest) {
  let remaining = Math.max(0, elapsed)
  for (let index = 0; index < count; index += 1) {
    if (remaining < work) return { phase: 'work', index, remaining: work - remaining,
      completed: index, partial: remaining }
    remaining -= work
    if (index === count - 1) break
    if (remaining < rest) return { phase: 'rest', index, remaining: rest - remaining,
      completed: index + 1, partial: 0 }
    remaining -= rest
  }
  return { phase: 'done', index: count - 1, remaining: 0, completed: count, partial: 0 }
}

export function formatTimer(seconds) {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}
