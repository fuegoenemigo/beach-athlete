import { elapsedSeconds } from './trainingTimer.js'

const positiveInteger = (value) => Number.isInteger(value) && value > 0

export function guidedEnduranceSpec(plan) {
  const spec = plan?.guidedEndurance
  if (!spec || plan.category !== 'Ausdauer' || plan.exercises?.length !== 3
    || plan.exercises[1].libraryId !== spec.mainLibraryId
    || !positiveInteger(spec.warmupSeconds) || !positiveInteger(spec.cooldownSeconds)) return null
  if (spec.kind === 'steady' && positiveInteger(spec.mainSeconds)) return spec
  if (spec.kind === 'interval' && positiveInteger(spec.repeat)
    && positiveInteger(spec.workSeconds) && positiveInteger(spec.recoverySeconds)) return spec
  return null
}

export function mainDurationSeconds(spec) {
  return spec.kind === 'interval'
    ? spec.repeat * spec.workSeconds + (spec.repeat - 1) * spec.recoverySeconds
    : spec.mainSeconds
}

export function mainPhaseAt(spec, elapsed) {
  const total = mainDurationSeconds(spec)
  const seconds = Math.max(0, elapsed)
  if (seconds >= total) return { kind: 'done', remaining: 0, elapsed: total, total,
    interval: spec.kind === 'interval' ? spec.repeat : null }
  if (spec.kind === 'steady') return { kind: 'steady', remaining: total - seconds,
    elapsed: seconds, total, interval: null }
  let cursor = 0
  for (let index = 0; index < spec.repeat; index += 1) {
    if (seconds < cursor + spec.workSeconds) return { kind: 'work',
      remaining: cursor + spec.workSeconds - seconds, elapsed: seconds, total,
      interval: index + 1 }
    cursor += spec.workSeconds
    if (index < spec.repeat - 1) {
      if (seconds < cursor + spec.recoverySeconds) return { kind: 'recovery',
        remaining: cursor + spec.recoverySeconds - seconds, elapsed: seconds, total,
        interval: index + 1 }
      cursor += spec.recoverySeconds
    }
  }
  return { kind: 'done', remaining: 0, elapsed: total, total, interval: spec.repeat }
}

export function canConfirmMain(flow, now) {
  return flow?.phase === 'main' && flow.clock
    && elapsedSeconds(flow.clock, now) >= mainDurationSeconds(flow.spec)
    && !flow.mainConfirmed
}

export function completedMainEntry(flow, now, id) {
  if (!canConfirmMain(flow, now)) return null
  return { id, completed: true, confirmedAt: new Date(now).toISOString(),
    durationValue: String(mainDurationSeconds(flow.spec)), durationUnit: 's',
    distanceValue: '', distanceUnit: 'km',
    guidedCompletion: true,
    ...(flow.spec.kind === 'interval' ? {
      prescribedIntervals: flow.spec.repeat, completedIntervals: flow.spec.repeat,
      workSeconds: flow.spec.workSeconds, recoverySeconds: flow.spec.recoverySeconds,
    } : {}) }
}

export function confirmGuidedMain(session, now, entryId) {
  const flow = session.enduranceFlow
  const entry = completedMainEntry(flow, now, entryId)
  if (!entry || !(session.exercises ?? []).some((exercise) =>
    exercise.libraryId === flow.spec.mainLibraryId)) return session
  return { ...session,
    enduranceFlow: { ...flow, phase: 'cooldown', mainConfirmed: true,
      mainCompletedAt: new Date(now).toISOString(),
      clock: { startedAt: now, elapsedMs: 0, running: true } },
    exercises: session.exercises.map((exercise) =>
      exercise.libraryId === flow.spec.mainLibraryId
        ? { ...exercise, guidedEndurance: true, done: true, entries: [entry] }
        : exercise),
  }
}
