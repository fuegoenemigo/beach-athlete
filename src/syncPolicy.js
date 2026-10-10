export function isAthleteData(data) {
  return data && Array.isArray(data.sessions)
    && Array.isArray(data.exerciseLibrary)
    && Array.isArray(data.volleyballDays)
    && data.sessions.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && Array.isArray(item.exercises))
    && data.exerciseLibrary.every((item) => item && typeof item === 'object'
      && typeof item.name === 'string' && typeof item.category === 'string')
    && data.volleyballDays.every((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.date === 'string'
      && Array.isArray(item.sets))
}

export function isRemoteData(data) {
  return isAthleteData(data) && typeof data.revision === 'string'
}

export function dataHash(data) {
  return JSON.stringify({
    sessions: data.sessions,
    exerciseLibrary: data.exerciseLibrary,
    volleyballDays: data.volleyballDays,
  })
}

export function hasPersonalData(data, defaultLibrary) {
  return data.sessions.length > 0 || data.volleyballDays.length > 0
    || JSON.stringify(data.exerciseLibrary) !== JSON.stringify(defaultLibrary)
}

export function chooseInitialSync(local, remote, meta, uid, defaultLibrary) {
  if (!isAthleteData(local) || (remote && !isRemoteData(remote))) return 'invalid'
  if (!remote) return 'upload'
  const localHash = dataHash(local)
  if (localHash === dataHash(remote)) return 'ready'
  if (!hasPersonalData(local, defaultLibrary)
    || (meta?.uid === uid && meta.hash === localHash)) return 'download'
  if (meta?.uid === uid && meta.revision === remote.revision) return 'upload'
  return 'conflict'
}
