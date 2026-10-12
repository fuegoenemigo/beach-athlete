import { isOpenTraining } from './trainingModel.js'

function measuredMeters(session) {
  const entry = session.exercises?.flatMap((exercise) => exercise.entries ?? [])
    .find((item) => item.guidedCompletion && Number(item.distanceValue) > 0)
  if (!entry) return null
  const meters = Number(entry.distanceValue) * (entry.distanceUnit === 'km' ? 1000 : 1)
  return Number.isFinite(meters) ? meters : null
}

function targetLevel(planId) {
  if (planId.endsWith('-beginner')) return 'Mittelstufe'
  if (planId.endsWith('-intermediate')) return 'Fortgeschritten'
  return null
}

export function enduranceProgress(session, sessions) {
  if (session.enduranceFlow?.spec?.kind !== 'interval'
    || !session.enduranceFlow.distanceTracking) return null
  const currentMeters = measuredMeters(session)
  if (currentMeters == null) return null
  const earlier = sessions.filter((item) => item.id !== session.id && !isOpenTraining(item)
    && item.enduranceFlow?.distanceTracking
    && item.planId === session.planId && measuredMeters(item) != null
    && (item.date < session.date || (item.date === session.date
      && (item.createdAt ?? '') < (session.createdAt ?? ''))))
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  if (!earlier.length) return { previousCount: 0,
    text: 'Das ist dein erster Distanzwert für diesen Intervallplan. Nach weiteren vollständigen Einheiten kann die App deinen Verlauf vergleichen.' }
  if (!session.enduranceFlow.sameSetup) return { previousCount: earlier.length,
    text: 'Ohne vergleichbares Gerät und gleiche Einstellungen ist ein Distanzvergleich nicht aussagekräftig.' }
  const last = earlier[0]
  const changePercent = Math.round(((currentMeters / measuredMeters(last)) - 1) * 1000) / 10
  const ratingLimit = session.planId.endsWith('-beginner') ? 7 : session.planId.endsWith('-intermediate') ? 8 : 9
  const recent = [session, ...earlier.slice(0, 2)]
  const comparableStreak = recent.length === 3 && recent.slice(0, 2)
    .every((item) => item.enduranceFlow?.sameSetup)
  const controlled = comparableStreak && recent.every((item) => Number(item.intensity) > 0
    && Number(item.intensity) <= ratingLimit)
  const stable = controlled && Math.min(...recent.map(measuredMeters))
    >= Math.max(...recent.map(measuredMeters)) * 0.95
  const next = targetLevel(session.planId)
  let text = 'Bleib zunächst bei dieser Stufe. Nach drei vollständigen, vergleichbaren Einheiten mit kontrollierter Anstrengung kann die App eine höhere Stufe vorschlagen.'
  if (stable && next) text = `Drei vollständige Einheiten mit ähnlicher Distanz und kontrollierter Anstrengung: Du kannst die Stufe „${next}“ beim nächsten Mal ausprobieren.`
  else if (stable) text = 'Deine letzten drei Einheiten waren stabil. Behalte diese Stufe bei oder steigere Tempo beziehungsweise Widerstand behutsam.'
  else if (changePercent < -5) text = 'Die Distanz war geringer als beim letzten Mal. Wiederhole diese Stufe und prüfe Tempo, Erholung und Tagesform; ein einzelner Rückgang ist kein Urteil über deine Fitness.'
  return { previousCount: earlier.length, changePercent, text }
}
