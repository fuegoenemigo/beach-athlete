export function isAthleteProfile(profile) {
  return Boolean(profile && typeof profile === 'object' && !Array.isArray(profile)
    && (profile.firstName === undefined || (typeof profile.firstName === 'string' && profile.firstName.length <= 60))
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
