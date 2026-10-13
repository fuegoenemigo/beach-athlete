import { strengthRoleFor } from './strengthClassification.js'

// Stable IDs keep suggested exercises and plans available without rewriting existing backups.
const exercise = (id, name, category, type, extra = {}) => ({
  id: `volleyball:${id}`, name, category, type, ...extra,
})

const gym = (id, name, category, type, muscleGroup, extra = {}) => ({
  id: `gym:${id}`, name, category, type, muscleGroup, ...extra,
})

const GYM_EXERCISES = [
  // Krafttraining: Freihanteln, Maschinen, Kabel und Eigengewicht.
  gym('dumbbell-bench', 'Kurzhantel-Bankdrücken', 'Krafttraining', 'strength', 'Brust'),
  gym('dumbbell-incline', 'Kurzhantel-Schrägbankdrücken', 'Krafttraining', 'strength', 'Brust'),
  gym('chest-press', 'Brustpresse (Maschine)', 'Krafttraining', 'strength', 'Brust'),
  gym('pec-deck', 'Butterfly (Maschine)', 'Krafttraining', 'strength', 'Brust'),
  gym('cable-fly', 'Kabel-Flys', 'Krafttraining', 'strength', 'Brust'),
  gym('dumbbell-fly', 'Kurzhantel-Flys', 'Krafttraining', 'strength', 'Brust'),
  gym('dips', 'Dips', 'Krafttraining', 'strength', 'Brust', { loadMode: 'bodyweight' }),
  gym('lat-pulldown', 'Latzug zur Brust', 'Krafttraining', 'strength', 'Rücken'),
  gym('close-pulldown', 'Latzug eng', 'Krafttraining', 'strength', 'Rücken'),
  gym('seated-row', 'Kabelrudern sitzend', 'Krafttraining', 'strength', 'Rücken'),
  gym('dumbbell-row', 'Kurzhantelrudern einarmig', 'Krafttraining', 'strength', 'Rücken'),
  gym('barbell-row', 'Langhantelrudern', 'Krafttraining', 'strength', 'Rücken'),
  gym('tbar-row', 'T-Bar-Rudern', 'Krafttraining', 'strength', 'Rücken'),
  gym('back-extension', 'Back Extensions', 'Krafttraining', 'strength', 'Rücken', { loadMode: 'bodyweight' }),
  gym('assisted-pullup', 'Klimmzüge mit Unterstützung', 'Krafttraining', 'reps', 'Rücken'),
  gym('dumbbell-press', 'Kurzhantel-Schulterdrücken', 'Krafttraining', 'strength', 'Schultern'),
  gym('arnold-press', 'Arnold Press', 'Krafttraining', 'strength', 'Schultern'),
  gym('lateral-raise', 'Seitheben mit Kurzhanteln', 'Krafttraining', 'strength', 'Schultern'),
  gym('cable-lateral', 'Seitheben am Kabel', 'Krafttraining', 'strength', 'Schultern'),
  gym('front-raise', 'Frontheben', 'Krafttraining', 'strength', 'Schultern'),
  gym('reverse-fly', 'Reverse Flys', 'Krafttraining', 'strength', 'Schultern'),
  gym('face-pull', 'Face Pulls', 'Krafttraining', 'strength', 'Schultern'),
  gym('shrug', 'Shrugs', 'Krafttraining', 'strength', 'Schultern'),
  gym('leg-press', 'Beinpresse', 'Krafttraining', 'strength', 'Beine'),
  gym('hack-squat', 'Hack Squat (Maschine)', 'Krafttraining', 'strength', 'Beine'),
  gym('front-squat', 'Frontkniebeugen', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('goblet-squat', 'Goblet Squat', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('leg-extension', 'Beinstrecker', 'Krafttraining', 'strength', 'Beine'),
  gym('leg-curl', 'Beinbeuger (Maschine)', 'Krafttraining', 'strength', 'Beine'),
  gym('hip-thrust', 'Hip Thrust', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('glute-bridge', 'Glute Bridge', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('step-up', 'Step-ups', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('reverse-lunge', 'Rückwärts-Ausfallschritte', 'Krafttraining', 'strength', 'Beine', { loadMode: 'bodyweight' }),
  gym('seated-calf', 'Wadenheben sitzend', 'Krafttraining', 'strength', 'Beine'),
  gym('abductor', 'Abduktoren-Maschine', 'Krafttraining', 'strength', 'Beine'),
  gym('adductor', 'Adduktoren-Maschine', 'Krafttraining', 'strength', 'Beine'),
  gym('dumbbell-curl', 'Bizepscurls mit Kurzhanteln', 'Krafttraining', 'strength', 'Bizeps'),
  gym('barbell-curl', 'Langhantelcurls', 'Krafttraining', 'strength', 'Bizeps'),
  gym('hammer-curl', 'Hammercurls', 'Krafttraining', 'strength', 'Bizeps'),
  gym('cable-curl', 'Bizepscurls am Kabel', 'Krafttraining', 'strength', 'Bizeps'),
  gym('preacher-curl', 'Preacher Curls', 'Krafttraining', 'strength', 'Bizeps'),
  gym('concentration-curl', 'Konzentrationscurls', 'Krafttraining', 'strength', 'Bizeps'),
  gym('triceps-pushdown', 'Trizepsdrücken am Kabel', 'Krafttraining', 'strength', 'Trizeps'),
  gym('overhead-triceps', 'Überkopf-Trizepsstrecken', 'Krafttraining', 'strength', 'Trizeps'),
  gym('skull-crusher', 'Skull Crushers', 'Krafttraining', 'strength', 'Trizeps'),
  gym('close-bench', 'Enges Bankdrücken', 'Krafttraining', 'strength', 'Trizeps'),
  gym('kettlebell-swing', 'Kettlebell Swings', 'Krafttraining', 'strength', 'Beine'),
  gym('farmers-carry', 'Farmer’s Carry', 'Krafttraining', 'carry', 'Rücken'),
  // Rumpf und Beweglichkeit.
  gym('crunch', 'Crunches', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('situp', 'Sit-ups', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('reverse-crunch', 'Reverse Crunches', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('hanging-leg-raise', 'Hängendes Beinheben', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('dead-bug', 'Dead Bug', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('bird-dog', 'Bird Dog', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('russian-twist', 'Russian Twists', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('ab-wheel', 'Ab Wheel Rollouts', 'Core und Mobility', 'reps', 'Core', { loadMode: 'bodyweight' }),
  gym('cable-crunch', 'Cable Crunches', 'Core und Mobility', 'strength', 'Core'),
  gym('hollow-hold', 'Hollow Hold', 'Core und Mobility', 'duration', 'Core'),
  gym('thoracic-rotation', 'Brustwirbelsäulen-Rotation', 'Core und Mobility', 'duration', 'Mobility'),
  gym('cat-cow', 'Cat-Cow', 'Core und Mobility', 'duration', 'Mobility'),
  gym('hip-flexor-stretch', 'Hüftbeuger-Dehnung', 'Core und Mobility', 'duration', 'Mobility'),
  gym('hamstring-stretch', 'Beinrückseiten-Dehnung', 'Core und Mobility', 'duration', 'Mobility'),
  gym('calf-stretch', 'Waden-Dehnung', 'Core und Mobility', 'duration', 'Mobility'),
  gym('shoulder-mobility', 'Schulter-Mobilisation', 'Core und Mobility', 'duration', 'Mobility'),
  gym('deep-squat-hold', 'Tiefe Kniebeugen-Halteposition', 'Core und Mobility', 'duration', 'Mobility'),
  // Grundlagenausdauer und Intervalle.
  gym('treadmill', 'Laufband', 'Ausdauer', 'distance', 'Grundlage', { defaultDurationUnit: 'min' }),
  gym('treadmill-warmup', 'Laufband · Aufwärmen', 'Ausdauer', 'duration', 'Vorbereitung', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('treadmill-cooldown', 'Laufband · Auslaufen', 'Ausdauer', 'duration', 'Abschluss', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('bike-warmup', 'Fahrrad · Einrollen', 'Ausdauer', 'duration', 'Vorbereitung', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('bike-cooldown', 'Fahrrad · Ausrollen', 'Ausdauer', 'duration', 'Abschluss', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('walking-warmup', 'Gehen · Aufwärmen', 'Ausdauer', 'duration', 'Vorbereitung', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('walking-cooldown', 'Gehen · Auslaufen', 'Ausdauer', 'duration', 'Abschluss', { performanceRole: 'support', defaultDurationUnit: 'min' }),
  gym('elliptical', 'Crosstrainer', 'Ausdauer', 'distance', 'Grundlage'),
  gym('rowing-erg', 'Ruderergometer', 'Ausdauer', 'distance', 'Gerät'),
  gym('ski-erg', 'SkiErg', 'Ausdauer', 'distance', 'Gerät'),
  gym('stair-stepper', 'Treppensteiger', 'Ausdauer', 'duration', 'Gerät'),
  gym('swimming', 'Schwimmen', 'Ausdauer', 'distance', 'Grundlage'),
  gym('walking', 'Zügiges Gehen', 'Ausdauer', 'distance', 'Grundlage', { defaultDurationUnit: 'min' }),
  gym('jump-rope', 'Seilspringen', 'Ausdauer', 'duration', 'Intervalle'),
  gym('run-intervals', 'Laufintervalle', 'Ausdauer', 'distance', 'Intervalle'),
  gym('bike-intervals', 'Fahrrad-Intervalle', 'Ausdauer', 'distance', 'Intervalle'),
  gym('treadmill-interval-1m', 'Laufband-Intervall · 1 Minute', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 1 }),
  gym('treadmill-interval-2m', 'Laufband-Intervall · 2 Minuten', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 2 }),
  gym('treadmill-interval-4m', 'Laufband-Intervall · 4 Minuten', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 4 }),
  gym('bike-interval-1m', 'Fahrrad-Intervall · 1 Minute', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 1 }),
  gym('bike-interval-2m', 'Fahrrad-Intervall · 2 Minuten', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 2 }),
  gym('bike-interval-4m', 'Fahrrad-Intervall · 4 Minuten', 'Ausdauer', 'distance', 'Intervalle', { intervalWorkMinutes: 4 }),
  // Explosivkraft, Sprünge und Richtungswechsel.
  gym('jump-squat', 'Explosive Kniebeugen (Squat Jumps)', 'Sprungkraft und Agilität', 'jump', 'Explosivkraft', { loadMode: 'bodyweight' }),
  gym('loaded-jump-squat', 'Explosive Kniebeugen mit Langhantel', 'Sprungkraft und Agilität', 'strength', 'Explosivkraft'),
  gym('pogo', 'Pogo Jumps', 'Sprungkraft und Agilität', 'reps', 'Sprungkraft', { loadMode: 'bodyweight' }),
  gym('tuck-jump', 'Tuck Jumps', 'Sprungkraft und Agilität', 'reps', 'Sprungkraft', { loadMode: 'bodyweight' }),
  gym('drop-jump', 'Drop Jumps', 'Sprungkraft und Agilität', 'reps', 'Sprungkraft', { loadMode: 'bodyweight' }),
  gym('split-jump', 'Sprung-Ausfallschritte', 'Sprungkraft und Agilität', 'reps', 'Explosivkraft', { loadMode: 'bodyweight' }),
  gym('single-leg-hop', 'Einbeinige Sprünge', 'Sprungkraft und Agilität', 'reps', 'Sprungkraft', { loadMode: 'bodyweight' }),
  gym('block-jump', 'Blocksprung', 'Sprungkraft und Agilität', 'jump', 'Sprungkraft', { loadMode: 'bodyweight' }),
  gym('medicine-ball-slam', 'Medizinball-Slams', 'Sprungkraft und Agilität', 'strength', 'Explosivkraft'),
  gym('agility-ladder', 'Koordinationsleiter', 'Sprungkraft und Agilität', 'duration', 'Agilität'),
  gym('cone-slalom', 'Hütchen-Slalom', 'Sprungkraft und Agilität', 'distance', 'Agilität'),
]

export const DEFAULT_EXERCISES = [
  exercise('bench', 'Bankdrücken', 'Krafttraining', 'strength', { muscleGroup: 'Brust' }),
  exercise('incline-bench', 'Schrägbankdrücken', 'Krafttraining', 'strength', { muscleGroup: 'Brust' }),
  exercise('squat', 'Kniebeugen', 'Krafttraining', 'strength', { muscleGroup: 'Beine', loadMode: 'bodyweight' }),
  exercise('deadlift', 'Kreuzheben', 'Krafttraining', 'strength', { muscleGroup: 'Rücken' }),
  exercise('pullup', 'Klimmzüge', 'Krafttraining', 'strength', { muscleGroup: 'Rücken', loadMode: 'bodyweight' }),
  exercise('row', 'Rudern', 'Krafttraining', 'strength', { muscleGroup: 'Rücken' }),
  exercise('press', 'Schulterdrücken', 'Krafttraining', 'strength', { muscleGroup: 'Schultern' }),
  exercise('lunge', 'Ausfallschritte', 'Krafttraining', 'strength', { muscleGroup: 'Beine', loadMode: 'bodyweight' }),
  exercise('calf', 'Wadenheben', 'Krafttraining', 'strength', { muscleGroup: 'Beine', loadMode: 'bodyweight' }),
  exercise('pushup', 'Liegestütze', 'Krafttraining', 'strength', { muscleGroup: 'Brust', loadMode: 'bodyweight' }),
  exercise('rdl', 'Rumänisches Kreuzheben', 'Krafttraining', 'strength', { muscleGroup: 'Beine' }),
  exercise('split-squat', 'Bulgarian Split Squat', 'Krafttraining', 'strength', { muscleGroup: 'Beine', loadMode: 'bodyweight' }),
  exercise('plank', 'Plank', 'Core und Mobility', 'duration', { muscleGroup: 'Core' }),
  exercise('side-plank', 'Side Plank', 'Core und Mobility', 'duration', { muscleGroup: 'Core' }),
  exercise('l-sit', 'L-Sit', 'Core und Mobility', 'duration', { muscleGroup: 'Core' }),
  exercise('pallof', 'Pallof Press', 'Core und Mobility', 'reps', { muscleGroup: 'Core' }),
  exercise('shoulder-rotation', 'Außenrotation der Schulter', 'Core und Mobility', 'reps', { muscleGroup: 'Schultern' }),
  exercise('ankle-mobility', 'Sprunggelenk-Mobilisation', 'Core und Mobility', 'duration', { muscleGroup: 'Beine' }),
  exercise('hip-mobility', 'Hüftmobilisation', 'Core und Mobility', 'duration', { muscleGroup: 'Beine' }),
  exercise('box-jump', 'Box Jumps', 'Sprungkraft und Agilität', 'reps', { muscleGroup: 'Sprungkraft', loadMode: 'bodyweight' }),
  exercise('cmj', 'Countermovement Jump', 'Sprungkraft und Agilität', 'jump', { muscleGroup: 'Sprungkraft', loadMode: 'bodyweight' }),
  exercise('lateral-jump', 'Seitliche Sprünge', 'Sprungkraft und Agilität', 'reps', { muscleGroup: 'Sprungkraft', loadMode: 'bodyweight' }),
  exercise('approach-jump', 'Anlaufsprung', 'Sprungkraft und Agilität', 'jump', { muscleGroup: 'Sprungkraft', loadMode: 'bodyweight' }),
  exercise('lateral-bound', 'Seitliche Bounds', 'Sprungkraft und Agilität', 'reps', { muscleGroup: 'Agilität', loadMode: 'bodyweight' }),
  exercise('sprint', 'Sprint', 'Sprungkraft und Agilität', 'distance', { muscleGroup: 'Schnelligkeit' }),
  exercise('shuttle', 'Shuttle-Lauf mit Richtungswechsel', 'Sprungkraft und Agilität', 'distance', { muscleGroup: 'Agilität' }),
  exercise('mobility', 'Mobilitätsroutine', 'Core und Mobility', 'duration', { muscleGroup: 'Mobility' }),
  exercise('beach', 'Beachvolleyball-Training', 'Beach-Training', 'duration'),
  exercise('indoor', 'Hallenvolleyball-Training', 'Hallentraining', 'duration'),
  exercise('bike', 'Radfahren', 'Ausdauer', 'distance', { muscleGroup: 'Ausdauer', defaultDurationUnit: 'min' }),
  exercise('repeat-sprint', 'Wiederholter 30-m-Sprint', 'Ausdauer', 'distance', { muscleGroup: 'Intervalle' }),
  exercise('aerobic-run', 'Lockerer Dauerlauf', 'Ausdauer', 'distance', { muscleGroup: 'Grundlage' }),
  ...GYM_EXERCISES,
].map((item) => item.category === 'Krafttraining'
  ? { ...item, strengthRole: strengthRoleFor(item) } : item)

const byId = new Map(DEFAULT_EXERCISES.map((item) => [item.id, item]))
const ref = (id, target, timing = {}) => {
  const item = byId.get(id.includes(':') ? id : `volleyball:${id}`)
  return { libraryId: item.id, name: item.name, category: item.category,
    type: item.type, muscleGroup: item.muscleGroup, loadMode: item.loadMode,
    strengthRole: item.strengthRole,
    intervalWorkMinutes: item.intervalWorkMinutes,
    performanceRole: item.performanceRole, defaultDurationUnit: item.defaultDurationUnit,
    target, ...timing }
}

export const STANDARD_PLANS = [
  {
    id: 'gym:plan-full-body-machines', name: 'Fitnessstudio · Ganzkörper A (Geräte)',
    category: 'Krafttraining',
    description: 'Einfacher Einstieg für alle großen Muskelgruppen. Als Anfänger eher 2–3 Ganzkörpertage pro Woche mit Pausentagen dazwischen wählen.',
    exercises: [ref('gym:leg-press', '2 × 8–12 kontrollierte Wiederholungen'),
      ref('gym:chest-press', '2 × 8–12 Wiederholungen'),
      ref('gym:lat-pulldown', '2 × 8–12 Wiederholungen'),
      ref('gym:seated-row', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-press', '2 × 8–12 Wiederholungen'),
      ref('gym:leg-curl', '2 × 10–12 Wiederholungen'),
      ref('gym:back-extension', '2 × 10–12 kontrollierte Wiederholungen')],
  },
  {
    id: 'gym:plan-full-body-free', name: 'Fitnessstudio · Ganzkörper B (Freihanteln)',
    category: 'Krafttraining',
    description: 'Alternative mit Kurzhanteln und freien Bewegungen. Leichte Last und saubere Technik zuerst.',
    exercises: [ref('gym:goblet-squat', '2 × 8–10 Wiederholungen'),
      ref('gym:dumbbell-bench', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-row', '2 × 8–12 je Seite'),
      ref('rdl', '2 × 8–10 Wiederholungen'),
      ref('press', '2 × 8–10 Wiederholungen'),
      ref('gym:back-extension', '2 × 10–12 Wiederholungen'),
      ref('gym:dead-bug', '2 × 8–10 je Seite')],
    categories: ['Krafttraining', 'Core und Mobility'],
  },
  {
    id: 'gym:plan-push', name: 'Fitnessstudio · Push: Brust, Schulter, Trizeps',
    category: 'Krafttraining',
    description: 'Ein Push-Trainingstag. Als Anfänger alternativ die Ganzkörper-Vorlagen bevorzugen.',
    exercises: [ref('gym:chest-press', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-incline', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-press', '2 × 8–12 Wiederholungen'),
      ref('gym:lateral-raise', '2 × 10–15 Wiederholungen'),
      ref('gym:triceps-pushdown', '2 × 10–15 Wiederholungen'),
      ref('gym:overhead-triceps', '2 × 10–12 Wiederholungen')],
  },
  {
    id: 'gym:plan-pull', name: 'Fitnessstudio · Pull: Rücken und Bizeps',
    category: 'Krafttraining',
    description: 'Ein Pull-Trainingstag für Rücken, hintere Schulter und Bizeps.',
    exercises: [ref('gym:lat-pulldown', '2 × 8–12 Wiederholungen'),
      ref('gym:seated-row', '2 × 8–12 Wiederholungen'),
      ref('gym:back-extension', '2 × 10–12 Wiederholungen'),
      ref('gym:face-pull', '2 × 10–15 Wiederholungen'),
      ref('gym:dumbbell-curl', '2 × 10–12 Wiederholungen'),
      ref('gym:hammer-curl', '2 × 10–12 Wiederholungen')],
  },
  {
    id: 'gym:plan-legs', name: 'Fitnessstudio · Legs: Beine und Po',
    category: 'Krafttraining',
    description: 'Ein Beintag mit Kniebeuge-, Hüft- und Wadenarbeit. Bei vielen Volleyball-Sprüngen Umfang anpassen.',
    exercises: [ref('gym:leg-press', '2 × 8–12 Wiederholungen'),
      ref('rdl', '2 × 8–10 Wiederholungen'),
      ref('gym:leg-curl', '2 × 10–12 Wiederholungen'),
      ref('gym:step-up', '2 × 8–10 je Bein'),
      ref('gym:seated-calf', '2 × 10–15 Wiederholungen'),
      ref('gym:hip-thrust', '2 × 8–12 Wiederholungen')],
  },
]

export const FOCUS_PLANS = [
  {
    id: 'gym:plan-back', name: 'Rücken stärken · Zugübungen',
    category: 'Krafttraining',
    description: 'Zur Stärkung des Rückens: Latzug und Rudern für den oberen Rücken, Back Extensions für die Rückenstrecker. Mit kontrollierter Last beginnen.',
    exercises: [ref('gym:lat-pulldown', '2 × 8–12 Wiederholungen'),
      ref('gym:seated-row', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-row', '2 × 8–12 je Seite'),
      ref('gym:face-pull', '2 × 10–15 Wiederholungen'),
      ref('gym:back-extension', '2 × 10–12 Wiederholungen')],
  },
  {
    id: 'gym:plan-chest', name: 'Brust stärken · Drücken',
    category: 'Krafttraining',
    description: 'Eine flache und eine schräge Druckbewegung, ergänzt durch eine leichte Isolationsübung.',
    exercises: [ref('gym:chest-press', '2 × 8–12 Wiederholungen'),
      ref('gym:dumbbell-incline', '2 × 8–12 Wiederholungen'),
      ref('gym:cable-fly', '2 × 10–15 Wiederholungen'),
      ref('gym:triceps-pushdown', '2 × 10–15 Wiederholungen')],
  },
  {
    id: 'gym:plan-core-stability', name: 'Core stabilisieren · Rumpf',
    category: 'Core und Mobility',
    description: 'Rumpfspannung mit einfachen Halte- und Gegenrotationsübungen trainieren.',
    exercises: [ref('gym:dead-bug', '2 × 8–10 je Seite'),
      ref('plank', '2 × 20–40 s'),
      ref('side-plank', '2 × 20–30 s je Seite'),
      ref('pallof', '2 × 8–12 je Seite'),
      ref('gym:bird-dog', '2 × 8–10 je Seite')],
  },
  {
    id: 'gym:plan-mobility', name: 'Beweglichkeit · Hüfte und Schulter',
    category: 'Core und Mobility',
    description: 'Ruhige Beweglichkeitsroutine für Hüfte, Sprunggelenk, Brustwirbelsäule und Schulter.',
    exercises: [ref('gym:cat-cow', '2 × 45 s'),
      ref('gym:thoracic-rotation', '2 × 45 s je Seite'),
      ref('gym:hip-flexor-stretch', '2 × 45 s je Seite'),
      ref('ankle-mobility', '2 × 45 s je Seite'),
      ref('gym:shoulder-mobility', '2 × 45 s')],
  },
  {
    id: 'gym:plan-endurance-base', name: 'Ausdauer aufbauen · Zügiges Gehen',
    category: 'Ausdauer',
    guidedEndurance: { kind: 'steady', warmupSeconds: 300, mainSeconds: 1500,
      cooldownSeconds: 300, mainLibraryId: 'gym:walking',
      intensity: { warmup: 'Locker gehen · Belastung 2–3/10',
        work: 'Zügig gehen · Belastung 5–6/10; Gespräch möglich',
        cooldown: 'Langsam gehen · Belastung 2–3/10' } },
    evidence: { label: 'WHO · Empfehlungen zur Ausdaueraktivität',
      url: 'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity' },
    description: 'Geführter Einstiegstag: etwa 5 Min. locker gehen, 25 Min. zügig und gesprächsfähig gehen, danach etwa 5 Min. auslaufen. Aufwärmen und Auslaufen kannst du selbst beenden; die Hauptübung endet nach 25 Min. Als Ausgangspunkt 2× pro Woche.',
    exercises: [ref('gym:walking', '25 Min. zügig gehen; Aufwärmen und Auslaufen frei beenden')],
  },
  {
    id: 'gym:plan-jump-basics', name: 'Sprungkraft aufbauen · Explosive Kniebeugen',
    category: 'Sprungkraft und Agilität',
    description: 'Wenige hochwertige Sprünge. Erst kontrolliert landen, dann Höhe und Tempo steigern; ausreichend Pausen lassen.',
    exercises: [ref('gym:pogo', '2 × 8–10 leichte Kontakte'),
      ref('gym:jump-squat', '3 × 3–5 explosive Sprünge'),
      ref('box-jump', '2 × 3–5 Sprünge mit sicherer Landung'),
      ref('gym:agility-ladder', '2–3 ruhige Durchgänge')],
  },
]

// The shorter interval prescriptions are conservative app progressions, not protocols
// claimed to have been tested as complete sessions in the linked studies.
const intervalSource = {
  label: 'ACSM · Grundlagen des Intervalltrainings',
  url: 'https://acsm.org/high-intensity-interval-training-fitness/',
}
const fourByFourSource = {
  label: 'Helgerud et al. · 4 × 4 Minuten',
  url: 'https://pubmed.ncbi.nlm.nih.gov/17414804/',
}
const cyclingFourByFourSource = {
  label: 'Studie · 4 × 4 Minuten auf dem Fahrradergometer',
  url: 'https://pubmed.ncbi.nlm.nih.gov/32679757/',
}
const coreSource = {
  label: 'Review · Core-Training und sportliche Leistung',
  url: 'https://pubmed.ncbi.nlm.nih.gov/37867742/',
}
const mobilitySource = {
  label: 'ACSM · Empfehlungen zur Beweglichkeit',
  url: 'https://acsm.org/exercise-for-the-prevention-and-treatment-of-hypertension/',
}
const aerobicSource = {
  label: 'WHO · Empfehlungen zur Ausdaueraktivität',
  url: 'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity',
}
const enduranceMixSource = {
  label: 'Meta-Analyse an Ausdauersportlern · Trainingsintensitäten',
  url: 'https://pubmed.ncbi.nlm.nih.gov/38717713/',
}
const jumpSource = {
  label: 'Meta-Analyse · Sprungtraining im Volleyball',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440/',
}
const agilitySource = {
  label: 'Review · Sprungtraining im Mannschaftssport',
  url: 'https://pubmed.ncbi.nlm.nih.gov/28149427/',
}

// Gerätewerte sind beispielhafte Startbereiche. Das persönliche Belastungsgefühl
// ist maßgeblich; insbesondere beim Ergometer sagt km/h wenig über den Widerstand.
const intervalIntensity = {
  'treadmill-interval-beginner': {
    warmup: 'Lockeres Gehen · etwa 4–5,5 km/h · Belastung 2–3/10',
    work: 'Kontrolliert zügig laufen · etwa 7–9 km/h · Belastung 6–7/10; kein Maximalsprint',
    recovery: 'Locker gehen · etwa 4–5,5 km/h · Belastung 2–3/10',
    cooldown: 'Langsam gehen · etwa 3,5–5 km/h · Belastung 2–3/10',
  },
  'treadmill-interval-intermediate': {
    warmup: 'Locker gehen oder traben · etwa 4,5–7 km/h · Belastung 2–3/10',
    work: 'Zügig laufen · etwa 8,5–11,5 km/h · Belastung 7–8/10',
    recovery: 'Gehen oder sehr locker traben · etwa 4,5–6,5 km/h · Belastung 2–3/10',
    cooldown: 'Langsam gehen · etwa 3,5–5 km/h · Belastung 2–3/10',
  },
  'treadmill-interval-advanced': {
    warmup: 'Locker gehen oder traben · etwa 5–8 km/h · Belastung 2–3/10',
    work: 'Kräftig, aber gleichmäßig laufen · etwa 10–13,5 km/h · Belastung 8–9/10; kein Sprint',
    recovery: 'Sehr locker traben oder gehen · etwa 5–7 km/h · Belastung 2–3/10',
    cooldown: 'Langsam gehen · etwa 3,5–5 km/h · Belastung 2–3/10',
  },
  'bike-interval-beginner': {
    warmup: 'Locker einrollen · etwa 60–75 U/min · Belastung 2–3/10',
    work: 'Etwa 75–90 U/min · Widerstand für Belastung 6–7/10 einstellen; kein Maximalsprint',
    recovery: 'Widerstand senken · etwa 60–75 U/min · Belastung 2–3/10',
    cooldown: 'Locker ausrollen · etwa 60–75 U/min · Belastung 2–3/10',
  },
  'bike-interval-intermediate': {
    warmup: 'Locker einrollen · etwa 65–80 U/min · Belastung 2–3/10',
    work: 'Etwa 80–95 U/min · Widerstand für Belastung 7–8/10 einstellen',
    recovery: 'Widerstand senken · etwa 60–75 U/min · Belastung 2–3/10',
    cooldown: 'Locker ausrollen · etwa 60–75 U/min · Belastung 2–3/10',
  },
  'bike-interval-advanced': {
    warmup: 'Locker einrollen · etwa 65–80 U/min · Belastung 2–3/10',
    work: 'Etwa 85–100 U/min · Widerstand für Belastung 8–9/10 einstellen; kein Maximalsprint',
    recovery: 'Widerstand senken · etwa 65–80 U/min · Belastung 2–3/10',
    cooldown: 'Locker ausrollen · etwa 60–75 U/min · Belastung 2–3/10',
  },
}

const intervalPlan = (id, name, exerciseId, count, workMinutes, restMinutes, level) => {
  const bike = exerciseId.startsWith('gym:bike-')
  const totalMinutes = 15 + count * workMinutes + (count - 1) * restMinutes
  const intensity = intervalIntensity[id]
  return {
    id: `gym:plan-${id}`, name, category: 'Ausdauer',
    guidedEndurance: { kind: 'interval', warmupSeconds: 600,
      workSeconds: workMinutes * 60, recoverySeconds: restMinutes * 60,
      repeat: count, cooldownSeconds: 300, mainLibraryId: exerciseId, intensity },
    description: `Geführter Trainingstag von etwa ${totalMinutes} Min.: etwa 10 Min. locker aufwärmen, ${count} × ${workMinutes} Min. Belastung mit ${restMinutes} Min. sehr lockerer aktiver Pause dazwischen, anschließend etwa 5 Min. auslaufen. Aufwärmen und Auslaufen kannst du selbst beenden; die Hauptübung wechselt die Phasen automatisch. ${level} Als Orientierung über 6–8 Wochen: 1 Intervalltag und 1–2 lockere Ausdauertage pro Woche, angepasst an Beach-/Hallentraining und Erholung.${workMinutes < 4 ? ' Diese Stufe ist eine vorsichtige Progression, kein exakt geprüftes Studienprotokoll.' : ''}`,
    evidence: workMinutes < 4 ? intervalSource
      : bike ? cyclingFourByFourSource : fourByFourSource,
    weeklyEvidence: enduranceMixSource,
    exercises: [ref(exerciseId, `${count} × ${workMinutes} Min. Belastung mit ${restMinutes} Min. lockerer Pause; Aufwärmen und Auslaufen frei beenden.`,
        { targetDurationSeconds: workMinutes * 60, intervalCount: count,
          intervalRestSeconds: restMinutes * 60 })],
  }
}

export const ADDITIONAL_PLANS = [
  intervalPlan('treadmill-interval-beginner', 'Laufband-Intervalle · Einstieg',
    'gym:treadmill-interval-1m', 6, 1, 2, 'Starte kontrolliert, nicht als maximalen Sprint.'),
  intervalPlan('treadmill-interval-intermediate', 'Laufband-Intervalle · Mittelstufe',
    'gym:treadmill-interval-2m', 5, 2, 2, 'Tempo so wählen, dass die Abschnitte ähnlich schnell bleiben.'),
  intervalPlan('treadmill-interval-advanced', 'Laufband-Intervalle · Fortgeschritten',
    'gym:treadmill-interval-4m', 4, 4, 3, 'Orientierung: etwa 85–95 % der maximalen Herzfrequenz; kein Sprint.'),
  intervalPlan('bike-interval-beginner', 'Fahrrad-Intervalle · Einstieg',
    'gym:bike-interval-1m', 6, 1, 2, 'Am Ergometer oder Fahrrad kontrolliert fahren, nicht maximal sprinten.'),
  intervalPlan('bike-interval-intermediate', 'Fahrrad-Intervalle · Mittelstufe',
    'gym:bike-interval-2m', 5, 2, 2, 'Widerstand so wählen, dass alle Abschnitte ähnlich anstrengend bleiben.'),
  intervalPlan('bike-interval-advanced', 'Fahrrad-Intervalle · Fortgeschritten',
    'gym:bike-interval-4m', 4, 4, 3, 'Orientierung: etwa 85–95 % der maximalen Herzfrequenz; nicht maximal sprinten.'),
  {
    id: 'gym:plan-treadmill-base', name: 'Ausdauer-Grundlage · Laufband',
    category: 'Ausdauer', evidence: aerobicSource, weeklyEvidence: enduranceMixSource,
    guidedEndurance: { kind: 'steady', warmupSeconds: 600, mainSeconds: 1500,
      cooldownSeconds: 300, mainLibraryId: 'gym:treadmill',
      intensity: { warmup: 'Lockeres Gehen · etwa 4–5,5 km/h · Belastung 2–3/10',
        work: 'Gehen oder lockeres Laufen · etwa 5–8 km/h · Belastung 5–6/10; Gespräch möglich',
        cooldown: 'Langsames Gehen · etwa 3,5–5 km/h · Belastung 2–3/10' } },
    description: 'Geführter lockerer Ausdauertag: etwa 10 Min. locker beginnen, 25 Min. gesprächsfähig laufen oder gehen, anschließend etwa 5 Min. auslaufen. Aufwärmen und Auslaufen kannst du selbst beenden; die Hauptübung endet nach 25 Min. 1–2× pro Woche als Ergänzung zu einem Intervalltag.',
    exercises: [ref('gym:treadmill', '25 Min. gleichmäßig; Aufwärmen und Auslaufen frei beenden')],
  },
  {
    id: 'gym:plan-bike-base', name: 'Ausdauer-Grundlage · Fahrrad',
    category: 'Ausdauer', evidence: aerobicSource, weeklyEvidence: enduranceMixSource,
    guidedEndurance: { kind: 'steady', warmupSeconds: 600, mainSeconds: 1800,
      cooldownSeconds: 300, mainLibraryId: 'volleyball:bike',
      intensity: { warmup: 'Locker einrollen · etwa 60–75 U/min · Belastung 2–3/10',
        work: 'Gleichmäßig fahren · etwa 75–90 U/min · Belastung 5–6/10; Widerstand passend einstellen',
        cooldown: 'Locker ausrollen · etwa 60–75 U/min · Belastung 2–3/10' } },
    description: 'Geführter lockerer Ausdauertag: etwa 10 Min. locker einrollen, 30 Min. gleichmäßig und gesprächsfähig fahren, anschließend etwa 5 Min. ausrollen. Aufwärmen und Auslaufen kannst du selbst beenden; die Hauptübung endet nach 30 Min. Für Distanzvergleiche dasselbe Ergometer nutzen.',
    exercises: [ref('bike', '30 Min. gleichmäßig; Aufwärmen und Ausrollen frei beenden')],
  },
  {
    id: 'gym:plan-core-beginner', name: 'Core · Stabiler Einstieg',
    category: 'Core und Mobility', evidence: coreSource,
    description: 'Ruhige Rumpfkontrolle auf der Matte. Zwei Durchgänge pro Übung; zuerst saubere Haltung, dann längere Haltezeit oder mehr Wiederholungen.',
    exercises: [ref('gym:dead-bug', '2 × 6–8 je Seite'),
      ref('gym:bird-dog', '2 × 6–8 je Seite'),
      ref('plank', '2 × 20–30 s'),
      ref('side-plank', '2 × 15–25 s je Seite')],
  },
  {
    id: 'gym:plan-core-advanced', name: 'Core · Kraft und Anti-Rotation',
    category: 'Core und Mobility', evidence: coreSource,
    description: 'Anspruchsvollerer Rumpftag mit kontrollierter Anti-Rotation und Haltearbeit. Pausen nach Bedarf, Technik vor Umfang.',
    exercises: [ref('pallof', '3 × 8–12 je Seite'),
      ref('gym:ab-wheel', '2 × 5–8 kontrollierte Wiederholungen'),
      ref('gym:hollow-hold', '2 × 20–30 s'),
      ref('side-plank', '2 × 25–40 s je Seite')],
  },
  {
    id: 'gym:plan-mobility-short', name: 'Mobility · Kurze Gelenkroutine',
    category: 'Core und Mobility', evidence: mobilitySource,
    description: 'Sanfte Bewegungen und Dehnungen für Hüfte, Sprunggelenk, Brustwirbelsäule und Schulter, etwa 2–3× pro Woche. Dehnpositionen 2 × 20–30 s je Seite angenehm halten.',
    exercises: [ref('gym:cat-cow', '2 × 30 s ruhige Bewegung'),
      ref('gym:thoracic-rotation', '2 × 30 s je Seite'),
      ref('ankle-mobility', '2 × 30 s je Seite'),
      ref('gym:hip-flexor-stretch', '2 × 20–30 s je Seite'),
      ref('gym:shoulder-mobility', '2 × 30 s')],
  },
  {
    id: 'gym:plan-jump-landing', name: 'Sprungkraft · Landung und Anlauf',
    category: 'Sprungkraft und Agilität', evidence: jumpSource,
    description: 'Nach 5–10 Min. Aufwärmen wenige hochwertige Sprünge mit 60–90 s Pause zwischen Sätzen. Etwa 25–35 Bodenkontakte, 1–2× pro Woche; bei vielen Volleyball-Sprüngen den Umfang reduzieren.',
    exercises: [ref('gym:pogo', '2 × 8 leichte Kontakte'),
      ref('cmj', '3 × 3 Sprünge; Höhe optional messen'),
      ref('approach-jump', '2 × 3 Anlaufsprünge; weich landen')],
  },
  {
    id: 'gym:plan-agility-direction', name: 'Agilität · Richtungswechsel',
    category: 'Sprungkraft und Agilität', evidence: agilitySource,
    description: 'Nach 5–10 Min. Aufwärmen kurze, technisch saubere Richtungswechsel mit vollständiger Erholung; kein Ausdauer-Zirkel. Bei nachlassender Qualität beenden.',
    exercises: [ref('gym:cone-slalom', '4 Läufe über dieselbe markierte Strecke; Zeit und Distanz erfassen'),
      ref('shuttle', '4 Läufe über dieselbe markierte Strecke; Zeit und Distanz erfassen'),
      ref('lateral-bound', '2 × 5 je Seite, Landung stabilisieren')],
  },
]

export const VOLLEYBALL_PLANS = [
  {
    id: 'volleyball:plan-strength-lower', name: 'Volleyball-Kraft A · Beine & Sprungbasis',
    category: 'Krafttraining', description: 'Kräftigt Beine und Hüfte als Basis für Absprung und Landung. 1× pro Woche als Einstieg.',
    exercises: [ref('squat', '3 × 5–8 saubere Wiederholungen'), ref('rdl', '3 × 6–8 Wiederholungen'),
      ref('split-squat', '2 × 6–8 je Bein'), ref('gym:hip-thrust', '2 × 8–10 Wiederholungen'),
      ref('calf', '2 × 10–15 Wiederholungen')],
  },
  {
    id: 'volleyball:plan-strength-upper', name: 'Volleyball-Kraft B · Oberkörper',
    category: 'Krafttraining', description: 'Drücken und Ziehen ausgewogen kombinieren; Belastung für die Schlag-Schulter im Blick behalten.',
    exercises: [ref('bench', '3 × 6–8 Wiederholungen'), ref('row', '3 × 8–10 Wiederholungen'),
      ref('pullup', '2 × 5–8 Wiederholungen'), ref('press', '2 × 6–8 Wiederholungen'),
      ref('gym:face-pull', '2 × 10–15 kontrollierte Wiederholungen')],
  },
  {
    id: 'volleyball:plan-jump', name: 'Volleyball-Sprung · Anlauf & Richtungswechsel',
    category: 'Sprungkraft und Agilität', description: 'Wenige hochwertige Sprünge mit vollen Pausen. Bei vielen Spiel- oder Trainingssprüngen Umfang reduzieren.',
    exercises: [ref('gym:pogo', '2 × 8–10 leichte Kontakte'),
      ref('cmj', '3 × 3–5 Sprünge; Höhe optional messen'),
      ref('approach-jump', '3 × 3–5 Anlaufsprünge'), ref('lateral-bound', '2 × 5 je Seite'),
      ref('shuttle', '3–4 Läufe; Distanz und Zeit erfassen')],
  },
  {
    id: 'volleyball:plan-contrast', name: 'Volleyball · Beinkraft und explosive Sprünge',
    category: 'Krafttraining', categories: ['Krafttraining', 'Sprungkraft und Agilität'],
    description: 'Kniebeugen und wenige explosive Sprünge kombinieren. Anspruchsvoller Tag: nur ausgeruht, mit langen Pausen und Abstand zu vielen Spielsprüngen.',
    exercises: [ref('squat', '2–3 × 4–6 Wiederholungen'),
      ref('gym:jump-squat', 'Nach den Kniebeugen 2–3 × 3–5 explosive Sprünge'),
      ref('rdl', '2 × 6–8 Wiederholungen'), ref('approach-jump', '2 × 3–5 Anlaufsprünge')],
  },
  {
    id: 'volleyball:plan-endurance', name: 'Volleyball-Ausdauer · Wiederholte Sprints',
    category: 'Ausdauer',
    guidedEndurance: { kind: 'sprint', warmupSeconds: 600, cooldownSeconds: 300,
      mainLibraryId: 'volleyball:repeat-sprint', series: 2, sprintsPerSeries: 6,
      sprintMeters: 30, recoverySeconds: 20, seriesRecoverySeconds: 300,
      intensity: { warmup: 'Locker gehen und dynamisch mobilisieren · Belastung 2–3/10',
        work: '30 m schnell und technisch sauber sprinten; vor jedem Start bereit sein',
        recovery: '20 s locker gehen; zwischen den Serien 5 Min. erholen',
        cooldown: 'Locker gehen · Belastung 2–3/10' } },
    description: 'Geführter Sprinttag: etwa 10 Min. locker aufwärmen, 2 Serien à 6 × 30 m mit 20 s Pause zwischen Läufen und 5 Min. zwischen Serien, danach locker auslaufen. Jeder 30-m-Sprint wird einzeln gestartet und beendet; die App zählt die Sprints und Pausen, speichert aber nur eine bestätigte Hauptübung. Bei nachlassender Technik abbrechen und den Tag nicht als vollständig markieren.',
    exercises: [ref('repeat-sprint', '2 Serien à 6 × 30 m; 20 s Laufpause und 5 Min. Serienpause')],
  },
  {
    id: 'volleyball:plan-core', name: 'Volleyball-Core · Rumpf & Schulter',
    category: 'Core und Mobility', description: 'Rumpfkontrolle, Schulterarbeit und Beweglichkeit als kurze Ergänzung.',
    exercises: [ref('gym:dead-bug', '2 × 8–10 je Seite'), ref('plank', '2 × 30–45 s'),
      ref('side-plank', '2 × 20–30 s je Seite'),
      ref('pallof', '2 × 8–12 je Seite'), ref('shoulder-rotation', '2 × 10–15 kontrolliert'),
      ref('gym:thoracic-rotation', '2 × 45 s je Seite'), ref('ankle-mobility', '2 × 45 s je Seite')],
  },
  {
    id: 'volleyball:plan-mixed', name: 'Volleyball · Kurzes Kraft- und Rumpftraining',
    category: 'Krafttraining', categories: ['Krafttraining', 'Core und Mobility'],
    description: 'Kürzerer Ganzkörpertag, wenn eine volle Krafteinheit nicht passt. Kraft und Rumpf bleiben getrennt auswertbar.',
    exercises: [ref('squat', '2 × 5–8 Wiederholungen'), ref('rdl', '2 × 6–8 Wiederholungen'),
      ref('gym:seated-row', '2 × 8–12 Wiederholungen'),
      ref('pallof', '2 × 8–12 je Seite'), ref('side-plank', '2 × 20–30 s je Seite'),
      ref('hip-mobility', '2 × 45 s je Seite')],
  },
]

export function guidedCardioPlanForExercise(item) {
  if (item?.category !== 'Ausdauer' || item.performanceRole === 'support') return null
  const existing = [...FOCUS_PLANS, ...ADDITIONAL_PLANS, ...VOLLEYBALL_PLANS]
    .find((plan) => plan.guidedEndurance?.mainLibraryId === item.id)
  if (existing) return existing
  const interval = ['gym:run-intervals', 'gym:bike-intervals', 'gym:jump-rope'].includes(item.id)
  const rope = item.id === 'gym:jump-rope'
  const spec = interval
    ? { kind: 'interval', warmupSeconds: 300, cooldownSeconds: 300,
      mainLibraryId: item.id, repeat: 6, workSeconds: 60,
      recoverySeconds: rope ? 60 : 120,
      intensity: { warmup: 'Locker beginnen · Belastung 2–3/10',
        work: 'Zügig, aber kontrolliert · Belastung 6–7/10',
        recovery: 'Sehr locker bewegen · Belastung 2–3/10',
        cooldown: 'Locker auslaufen · Belastung 2–3/10' } }
    : { kind: 'steady', warmupSeconds: 300, mainSeconds: 1200,
      cooldownSeconds: 300, mainLibraryId: item.id,
      intensity: { warmup: 'Locker beginnen · Belastung 2–3/10',
        work: 'Gleichmäßig und gesprächsfähig · Belastung 5–6/10',
        cooldown: 'Locker beenden · Belastung 2–3/10' } }
  return { id: `guided:cardio:${item.id}`, name: `Cardio · ${item.name}`,
    category: 'Ausdauer', guidedEndurance: spec,
    description: interval
      ? 'Geführter Startvorschlag mit Aufwärmen, sechs Belastungsphasen und Auslaufen. Die App führt durch die Zeitfenster; nur die bestätigte Hauptübung wird gespeichert.'
      : 'Geführter Startvorschlag mit Aufwärmen, 20 Minuten gleichmäßiger Hauptübung und Auslaufen. Nur die bestätigte Hauptübung wird gespeichert.',
    exercises: [{ libraryId: item.id, name: item.name, category: 'Ausdauer',
      type: item.type, muscleGroup: item.muscleGroup,
      target: interval ? '6 × 1 Min. Belastung mit lockerer Pause' : '20 Min. gleichmäßig' }],
  }
}

const normalizeSearch = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de-DE')

export function searchTrainingPlans(plans, query) {
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return plans
  return plans.filter((plan) => {
    const haystack = normalizeSearch([
      plan.name, plan.description, plan.category, ...(plan.categories ?? []),
      ...(plan.exercises ?? []).flatMap((item) => [item.name, item.muscleGroup, item.category]),
    ].join(' '))
    return words.every((word) => haystack.includes(word))
  })
}

export function enrichExercise(item) {
  const builtin = DEFAULT_EXERCISES.find((candidate) => candidate.name === item.name
    && candidate.category === item.category)
  return builtin ? { ...builtin, ...item,
    muscleGroup: item.muscleGroup === 'Ganzkörper' ? builtin.muscleGroup
      : item.muscleGroup ?? builtin.muscleGroup,
    strengthRole: item.strengthRole ?? builtin.strengthRole,
    loadMode: item.loadMode ?? builtin.loadMode } : item
}
