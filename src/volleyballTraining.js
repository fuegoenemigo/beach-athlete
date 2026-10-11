// Stable IDs keep suggested exercises and plans available without rewriting existing backups.
const exercise = (id, name, category, type, extra = {}) => ({
  id: `volleyball:${id}`, name, category, type, ...extra,
})

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
  exercise('mobility', 'Mobilitätsroutine', 'Core und Mobility', 'duration', { muscleGroup: 'Ganzkörper' }),
  exercise('beach', 'Beachvolleyball-Training', 'Beach-Training', 'duration'),
  exercise('indoor', 'Hallenvolleyball-Training', 'Hallentraining', 'duration'),
  exercise('bike', 'Radfahren', 'Ausdauer', 'distance', { muscleGroup: 'Ausdauer' }),
  exercise('repeat-sprint', 'Wiederholter 30-m-Sprint', 'Ausdauer', 'distance', { muscleGroup: 'Intervalle' }),
  exercise('aerobic-run', 'Lockerer Dauerlauf', 'Ausdauer', 'distance', { muscleGroup: 'Grundlage' }),
]

const byId = new Map(DEFAULT_EXERCISES.map((item) => [item.id, item]))
const ref = (id, target) => {
  const item = byId.get(`volleyball:${id}`)
  return { libraryId: item.id, name: item.name, category: item.category,
    type: item.type, muscleGroup: item.muscleGroup, loadMode: item.loadMode, target }
}

export const VOLLEYBALL_PLANS = [
  {
    id: 'volleyball:plan-strength-lower', name: 'Volleyball-Kraft A · Beine & Sprungbasis',
    category: 'Krafttraining', description: 'Kräftigt Beine und Hüfte als Basis für Absprung und Landung. 1× pro Woche als Einstieg.',
    exercises: [ref('squat', '3 × 5–8 saubere Wiederholungen'), ref('rdl', '3 × 6–8 Wiederholungen'),
      ref('split-squat', '2 × 6–8 je Bein'), ref('calf', '2 × 10–15 Wiederholungen')],
  },
  {
    id: 'volleyball:plan-strength-upper', name: 'Volleyball-Kraft B · Oberkörper',
    category: 'Krafttraining', description: 'Drücken und Ziehen ausgewogen kombinieren; Belastung für die Schlag-Schulter im Blick behalten.',
    exercises: [ref('bench', '3 × 6–8 Wiederholungen'), ref('row', '3 × 8–10 Wiederholungen'),
      ref('pullup', '2 × 5–8 Wiederholungen'), ref('press', '2 × 6–8 Wiederholungen')],
  },
  {
    id: 'volleyball:plan-jump', name: 'Volleyball-Sprung · Anlauf & Richtungswechsel',
    category: 'Sprungkraft und Agilität', description: 'Wenige hochwertige Sprünge mit vollen Pausen. Bei vielen Spiel- oder Trainingssprüngen Umfang reduzieren.',
    exercises: [ref('cmj', '3 × 3–5 Sprünge; Höhe optional messen'),
      ref('approach-jump', '3 × 3–5 Anlaufsprünge'), ref('lateral-bound', '2 × 5 je Seite'),
      ref('shuttle', '3–4 Läufe; Distanz und Zeit erfassen')],
  },
  {
    id: 'volleyball:plan-contrast', name: 'Volleyball-Kontrast · Kraft & Sprung',
    category: 'Krafttraining', categories: ['Krafttraining', 'Sprungkraft und Agilität'],
    description: 'Kniebeugen und wenige explosive Sprünge kombinieren. Anspruchsvoller Tag: nur ausgeruht, mit langen Pausen und Abstand zu vielen Spielsprüngen.',
    exercises: [ref('squat', '2–3 × 4–6 Wiederholungen'),
      ref('cmj', 'Nach den Kniebeugen 2–3 × 3–5 hochwertige Sprünge'),
      ref('rdl', '2 × 6–8 Wiederholungen'), ref('approach-jump', '2 × 3–5 Anlaufsprünge')],
  },
  {
    id: 'volleyball:plan-endurance', name: 'Volleyball-Ausdauer · Wiederholte Sprints',
    category: 'Ausdauer', description: 'Einstieg: 2 Serien à 6 × 30 m, etwa 20 s Pause zwischen Läufen und 5 Min. zwischen Serien. Bei Bedarf reduzieren.',
    exercises: [ref('repeat-sprint', 'Pro Satz ein 30-m-Sprint: Distanz und Laufzeit erfassen')],
  },
  {
    id: 'volleyball:plan-core', name: 'Volleyball-Core · Rumpf & Schulter',
    category: 'Core und Mobility', description: 'Rumpfkontrolle, Schulterarbeit und Beweglichkeit als kurze Ergänzung.',
    exercises: [ref('plank', '2 × 30–45 s'), ref('side-plank', '2 × 20–30 s je Seite'),
      ref('pallof', '2 × 8–12 je Seite'), ref('shoulder-rotation', '2 × 10–15 kontrolliert'),
      ref('ankle-mobility', '2 × 45 s je Seite')],
  },
  {
    id: 'volleyball:plan-mixed', name: 'Volleyball-Mix · Kraft & Core/Mobility',
    category: 'Krafttraining', categories: ['Krafttraining', 'Core und Mobility'],
    description: 'Kürzerer Ganzkörpertag, wenn eine volle Krafteinheit nicht passt. Kraft und Rumpf bleiben getrennt auswertbar.',
    exercises: [ref('squat', '2 × 5–8 Wiederholungen'), ref('rdl', '2 × 6–8 Wiederholungen'),
      ref('pallof', '2 × 8–12 je Seite'), ref('side-plank', '2 × 20–30 s je Seite'),
      ref('hip-mobility', '2 × 45 s je Seite')],
  },
]

export function enrichExercise(item) {
  const builtin = DEFAULT_EXERCISES.find((candidate) => candidate.name === item.name
    && candidate.category === item.category)
  return builtin ? { ...builtin, ...item, loadMode: item.loadMode ?? builtin.loadMode } : item
}
