import { elapsedSeconds } from './trainingTimer.js'

const positiveInteger = (value) => Number.isInteger(value) && value > 0

export function tracksDeviceDistance(spec) {
  return ['treadmill', 'bike', 'elliptical', 'rowing-erg', 'ski-erg']
    .some((device) => spec?.mainLibraryId?.includes(device))
}

function deviceReadingMeters(value, unit) {
  const input = String(value ?? '').trim()
  if (!(unit === 'm' ? /^\d+$/.test(input) : /^\d+(?:[.,]\d{1,3})?$/.test(input))) return null
  const rawMeters = Number(input.replace(',', '.')) * (unit === 'm' ? 1 : 1000)
  const meters = Math.round(rawMeters)
  return Number.isSafeInteger(meters) && meters >= 0
    && Math.abs(rawMeters - meters) < 0.000001 ? meters : null
}

export function deviceDistanceMeters(flow) {
  if (!flow?.distanceTracking) return null
  const unit = flow.deviceUnit === 'm' ? 'm' : 'km'
  const start = deviceReadingMeters(flow.warmupDeviceReading, unit)
  const end = deviceReadingMeters(flow.mainDeviceReading, unit)
  return start != null && end != null && end > start ? end - start : null
}

export function hasWarmupReading(flow) {
  return deviceReadingMeters(flow?.warmupDeviceReading,
    flow?.deviceUnit === 'm' ? 'm' : 'km') != null
}

export function guidedEnduranceSpec(plan) {
  const spec = plan?.guidedEndurance
  if (!spec || plan.category !== 'Ausdauer'
    || ![1, 3].includes(plan.exercises?.length)
    || guidedMainReference(plan)?.libraryId !== spec.mainLibraryId
    || !positiveInteger(spec.warmupSeconds) || !positiveInteger(spec.cooldownSeconds)) return null
  if (spec.kind === 'steady' && positiveInteger(spec.mainSeconds)) return spec
  if (spec.kind === 'interval' && positiveInteger(spec.repeat)
    && positiveInteger(spec.workSeconds) && positiveInteger(spec.recoverySeconds)) return spec
  if (spec.kind === 'sprint' && positiveInteger(spec.series)
    && positiveInteger(spec.sprintsPerSeries) && positiveInteger(spec.sprintMeters)
    && positiveInteger(spec.recoverySeconds)
    && positiveInteger(spec.seriesRecoverySeconds)) return spec
  return null
}

export function prescribedSprints(spec) {
  return spec.series * spec.sprintsPerSeries
}

export function sprintRecoverySeconds(spec, completedSprints) {
  return completedSprints % spec.sprintsPerSeries === 0
    ? spec.seriesRecoverySeconds : spec.recoverySeconds
}

export function finishGuidedSprint(flow, now) {
  if (flow?.spec?.kind !== 'sprint' || flow.phase !== 'main'
    || flow.sprintStage !== 'running' || !Number.isFinite(flow.sprintStartedAt)) return flow
  const time = Math.max(0.1, Math.round((now - flow.sprintStartedAt) / 10) / 100)
  const completedSprints = (flow.completedSprints ?? 0) + 1
  const done = completedSprints >= prescribedSprints(flow.spec)
  return { ...flow, completedSprints,
    sprintTimesSeconds: [...(flow.sprintTimesSeconds ?? []), time],
    sprintStartedAt: null,
    sprintStage: done ? 'done' : 'recovery',
    recoveryStartedAt: done ? null : now,
    clock: done ? { ...flow.clock, running: false,
      elapsedMs: elapsedSeconds(flow.clock, now) * 1000 } : flow.clock }
}

export function guidedMainReference(plan) {
  if (!plan?.guidedEndurance) return null
  return plan.exercises?.find((exercise) =>
    exercise.libraryId === plan.guidedEndurance.mainLibraryId) ?? null
}

export function mainDurationSeconds(spec) {
  if (spec.kind === 'sprint') return null
  return spec.kind === 'interval'
    ? spec.repeat * spec.workSeconds + (spec.repeat - 1) * spec.recoverySeconds
    : spec.mainSeconds
}

export function mainPhaseAt(spec, elapsed) {
  if (spec.kind === 'sprint') return { kind: 'sprint', elapsed }
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
    && (flow.spec.kind === 'sprint'
      ? flow.sprintStage === 'done'
        && flow.sprintTimesSeconds?.length === prescribedSprints(flow.spec)
      : elapsedSeconds(flow.clock, now) >= mainDurationSeconds(flow.spec))
    && !flow.mainConfirmed
}

export function completedMainEntry(flow, now, id) {
  if (!canConfirmMain(flow, now)) return null
  const distanceMeters = deviceDistanceMeters(flow)
  if (flow.distanceTracking && distanceMeters == null) return null
  const sprint = flow.spec.kind === 'sprint'
  const durationSeconds = sprint ? elapsedSeconds(flow.clock, now) : mainDurationSeconds(flow.spec)
  return { id, completed: true, confirmedAt: new Date(now).toISOString(),
    durationValue: String(durationSeconds), durationUnit: 's',
    distanceValue: sprint ? String(prescribedSprints(flow.spec) * flow.spec.sprintMeters)
      : distanceMeters == null ? '' : String(distanceMeters / 1000),
    distanceUnit: sprint ? 'm' : 'km',
    guidedCompletion: true,
    ...(sprint ? { prescribedSprints: prescribedSprints(flow.spec),
      completedSprints: prescribedSprints(flow.spec),
      sprintMeters: flow.spec.sprintMeters,
      sprintTimesSeconds: flow.sprintTimesSeconds,
      averageSprintSeconds: Math.round(flow.sprintTimesSeconds.reduce((sum, time) => sum + time, 0)
        / flow.sprintTimesSeconds.length * 100) / 100 } : {}),
    ...(distanceMeters == null ? {} : {
      deviceStartReading: flow.warmupDeviceReading,
      deviceEndReading: flow.mainDeviceReading,
      deviceReadingUnit: flow.deviceUnit === 'm' ? 'm' : 'km',
    }),
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
