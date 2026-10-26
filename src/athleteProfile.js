export const VOLLEYBALL_DISCIPLINES = [
  { id: 'beach', label: 'Beachvolleyball' },
  { id: 'indoor', label: 'Hallenvolleyball' },
]

export const BEACH_POSITIONS = [
  { id: 'blocker', label: 'Blocker' },
  { id: 'defender', label: 'Verteidiger' },
]

export const INDOOR_POSITIONS = [
  { id: 'outside', label: 'Außenangreifer' },
  { id: 'middle', label: 'Mittelblocker' },
  { id: 'setter', label: 'Zuspieler' },
  { id: 'opposite', label: 'Diagonalangreifer' },
  { id: 'libero', label: 'Libero' },
]

export const MEASUREMENT_CAPABILITIES = [
  { id: 'measured', label: 'Ich kann Leistungswerte präzise messen',
    detail: 'Zum Beispiel Sprunghöhe, Sprintzeit oder Distanz unter vergleichbaren Bedingungen.' },
  { id: 'standard', label: 'Ich dokumentiere vor allem mein Training',
    detail: 'Übungen, Gewichte, Wiederholungen und Dauer kann ich erfassen; spezielle Messwerte meist nicht.' },
]

export function nextOnboardingStep(profile) {
  if (!profile.firstName?.trim() || !profile.lastName?.trim()) return 0
  if (!profile.heightCm || !profile.bodyweightKg) return 1
  if (!profile.volleyballDisciplines?.length) return 2
  if ((profile.volleyballDisciplines.includes('beach') && !profile.beachPosition)
    || (profile.volleyballDisciplines.includes('indoor') && !profile.indoorPosition)) return 3
  return 4
}

export function isAthleteProfile(profile) {
  return Boolean(profile && typeof profile === 'object' && !Array.isArray(profile)
    && (profile.firstName === undefined || (typeof profile.firstName === 'string' && profile.firstName.length <= 60))
    && (profile.lastName === undefined || (typeof profile.lastName === 'string' && profile.lastName.length <= 60))
    && (profile.volleyballDisciplines === undefined || (Array.isArray(profile.volleyballDisciplines)
      && new Set(profile.volleyballDisciplines).size === profile.volleyballDisciplines.length
      && profile.volleyballDisciplines.every((id) => VOLLEYBALL_DISCIPLINES.some((item) => item.id === id))))
    && (profile.beachPosition === undefined || profile.beachPosition === ''
      || BEACH_POSITIONS.some((item) => item.id === profile.beachPosition))
    && (profile.indoorPosition === undefined || profile.indoorPosition === ''
      || INDOOR_POSITIONS.some((item) => item.id === profile.indoorPosition))
    && (profile.measurementCapability === undefined || profile.measurementCapability === ''
      || MEASUREMENT_CAPABILITIES.some((item) => item.id === profile.measurementCapability))
    && (profile.onboardingCompleted === undefined || typeof profile.onboardingCompleted === 'boolean')
    && (profile.bodyweightKg === '' || profile.bodyweightKg == null
      || (Number.isFinite(Number(profile.bodyweightKg)) && Number(profile.bodyweightKg) > 0))
    && (profile.heightCm === '' || profile.heightCm == null
      || (Number.isFinite(Number(profile.heightCm)) && Number(profile.heightCm) > 0 && Number(profile.heightCm) <= 300)))
}

export function initialProfileData(data, remoteExists) {
  if (remoteExists || data.athleteProfile?.onboardingCompleted !== undefined) return data
  return { ...data, athleteProfile: { ...data.athleteProfile, onboardingCompleted: false } }
}

export function parseProfileNumber(value) {
  const text = String(value ?? '').trim().replace(',', '.')
  if (!text) return ''
  return /^\d+(?:\.\d+)?$/.test(text) && Number(text) > 0 && Number(text) <= 300
    ? String(Number(text)) : null
}
