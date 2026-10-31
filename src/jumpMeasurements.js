export const JUMP_TESTS = [
  { id: 'standingLong', label: 'Standweitsprung mit Armschwung', unit: 'Sprungweite',
    metric: 'distance', maxCm: 500, placeholder: 'z. B. 210',
    hint: 'Abstand von der Absprunglinie bis zur hintersten Landestelle.' },
  { id: 'approach', label: 'Anlaufsprung mit Armschwung', unit: 'Berührhöhe',
    metric: 'touchReach', maxCm: 450, placeholder: 'z. B. 295',
    hint: 'Höchster Punkt, den du nach 2–3 Schritten Anlauf mit einer ausgestreckten Hand berührst. Vom Hallenboden aus messen; die Reichhöhe des Arms ist enthalten.' },
  { id: 'standingArms', label: 'Standsprung mit Armschwung', unit: 'Berührhöhe',
    metric: 'touchReach', maxCm: 450, placeholder: 'z. B. 275',
    hint: 'Höchster Punkt, den du ohne Anlauf mit einer ausgestreckten Hand berührst. Vom Hallenboden aus messen; die Reichhöhe des Arms ist enthalten.' },
]

const legacyMaxCm = 200
const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function isJumpDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function parseCentimeters(value, maxCm) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const number = Number(normalized)
  return number > 0 && number <= maxCm ? number : null
}

export function parseJumpCentimeters(value, testId) {
  const test = JUMP_TESTS.find((item) => item.id === testId)
  return test ? parseCentimeters(value, test.maxCm) : null
}

export function isCurrentJumpMeasurement(item) {
  const test = JUMP_TESTS.find((entry) => entry.id === item?.testId)
  return Boolean(test && (item.metric === test.metric
    || (test.id === 'standingLong' && item.metric === undefined)))
}

export function isJumpMeasurement(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)
    || typeof item.id !== 'string' || !item.id || !isJumpDate(item.date)
    || (item.createdAt !== undefined && typeof item.createdAt !== 'string')) return false
  if (isCurrentJumpMeasurement(item))
    return parseJumpCentimeters(item.valueCm, item.testId) !== null
  // Old vertical values were jump heights without standing reach. Keep them in
  // backups and sync, but never treat them as absolute touch reach or rate them.
  return item.metric === undefined && ['approach', 'standingArms', 'cmjNoArms'].includes(item.testId)
    && parseCentimeters(item.valueCm, legacyMaxCm) !== null
}

export function jumpValuesForDate(measurements, date) {
  return Object.fromEntries(JUMP_TESTS.map((test) => [test.id,
    String(measurements.find((item) => item.date === date && item.testId === test.id
      && isCurrentJumpMeasurement(item))?.valueCm ?? '')]))
}

export function saveJumpValues(measurements, date, values, createId, timestamp) {
  if (!isJumpDate(date)) return null
  const entries = JUMP_TESTS.map((test) => ({
    testId: test.id, metric: test.metric, raw: String(values[test.id] ?? '').trim(),
    valueCm: parseJumpCentimeters(values[test.id], test.id),
  }))
  if (!entries.some((entry) => entry.raw) || entries.some((entry) => entry.raw && entry.valueCm === null))
    return null
  const updated = [...measurements]
  for (const entry of entries.filter((item) => item.raw)) {
    const index = updated.findIndex((item) => item.date === date && item.testId === entry.testId
      && isCurrentJumpMeasurement(item))
    if (index >= 0) updated[index] = { ...updated[index], metric: entry.metric,
      valueCm: entry.valueCm }
    else updated.push({ id: createId(), date, testId: entry.testId, metric: entry.metric,
      valueCm: entry.valueCm, createdAt: timestamp })
  }
  return updated
}
