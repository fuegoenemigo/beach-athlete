export const JUMP_TESTS = [
  { id: 'standingLong', label: 'Standweitsprung mit Armschwung', unit: 'Sprungweite', maxCm: 500,
    hint: 'Abstand von der Absprunglinie bis zur hintersten Landestelle.' },
  { id: 'approach', label: 'Anlaufsprung mit Armschwung', unit: 'Sprunghöhe', maxCm: 200,
    hint: 'Höchste Berührhöhe minus Reichhöhe im Stand; 2–3 Schritte Anlauf.' },
  { id: 'standingArms', label: 'Standsprung mit Armschwung', unit: 'Sprunghöhe', maxCm: 200,
    hint: 'Höchste Berührhöhe minus Reichhöhe im Stand; ohne Anlauf.' },
  { id: 'cmjNoArms', label: 'Countermovement Jump ohne Armschwung', unit: 'Sprunghöhe', maxCm: 200,
    hint: 'Hände an der Hüfte; Sprunghöhe mit einem passenden Messgerät ermitteln.' },
]

const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function isJumpDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function parseJumpCentimeters(value, testId) {
  const test = JUMP_TESTS.find((item) => item.id === testId)
  if (!test) return null
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const number = Number(normalized)
  return number > 0 && number <= test.maxCm ? number : null
}

export function isJumpMeasurement(item) {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item)
    && typeof item.id === 'string' && item.id.length > 0
    && isJumpDate(item.date) && parseJumpCentimeters(item.valueCm, item.testId) !== null
    && (item.createdAt === undefined || typeof item.createdAt === 'string'))
}

export function jumpValuesForDate(measurements, date) {
  return Object.fromEntries(JUMP_TESTS.map((test) =>
    [test.id, String(measurements.find((item) => item.date === date && item.testId === test.id)?.valueCm ?? '')]))
}

export function saveJumpValues(measurements, date, values, createId, timestamp) {
  if (!isJumpDate(date)) return null
  const entries = JUMP_TESTS.map((test) => ({
    testId: test.id, raw: String(values[test.id] ?? '').trim(),
    valueCm: parseJumpCentimeters(values[test.id], test.id),
  }))
  if (!entries.some((entry) => entry.raw) || entries.some((entry) => entry.raw && entry.valueCm === null))
    return null
  const updated = [...measurements]
  for (const entry of entries.filter((item) => item.raw)) {
    const index = updated.findIndex((item) => item.date === date && item.testId === entry.testId)
    if (index >= 0) updated[index] = { ...updated[index], valueCm: entry.valueCm }
    else updated.push({ id: createId(), date, testId: entry.testId, valueCm: entry.valueCm,
      createdAt: timestamp })
  }
  return updated
}
