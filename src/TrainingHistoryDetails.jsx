import { exerciseMeasurement, formatTrainingEntry, hasLegacyValues, isConfirmedSet,
  isSportTrainingAttendance } from './trainingModel.js'

const legacyLabels = {
  sets: 'Sätze', reps: 'Wiederholungen', weight: 'Gewicht',
  duration: 'Dauer', distance: 'Distanz', result: 'Ergebnis',
}

export default function TrainingHistoryDetails({ session }) {
  if (isSportTrainingAttendance(session)) {
    return <div className="training-history-details">
      <p className="training-history-meta">Training hat stattgefunden.</p>
    </div>
  }
  const groups = new Map()
  for (const exercise of session.exercises ?? []) {
    const category = exercise.category ?? session.category
    const group = category === 'Krafttraining'
      ? `Krafttraining · ${exercise.muscleGroup || 'Ohne Muskelgruppe'}` : category
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(exercise)
  }

  return <div className="training-history-details">
    {(session.durationMinutes || session.intensity) && <p className="training-history-meta">
      {session.durationMinutes && <span>Dauer: {session.durationMinutes} Min.</span>}
      {session.intensity && <span>Anstrengung: {session.intensity}/10</span>}
    </p>}
    {session.notes && <p className="training-history-note">{session.notes}</p>}
    {groups.size === 0 && <p className="helper-text">Noch keine Übungen erfasst.</p>}
    {[...groups].map(([group, exercises]) => <section className="training-history-group" key={group}>
      <h4>{group}</h4>
      {exercises.map((exercise, index) => {
        const type = exerciseMeasurement({ ...exercise, category: session.category })
        const entries = (exercise.entries ?? []).filter((entry) => isConfirmedSet(entry, type))
        const legacy = hasLegacyValues(exercise)
        return <div className="training-history-exercise" key={exercise.id ?? `${group}-${index}`}>
          <strong>{exercise.name || 'Übung'}</strong>
          {exercise.guidedEndurance && entries.map((entry) => <p className="training-guided-result"
            key={entry.id}>Hauptübung: {formatTrainingEntry(entry, type, exercise) || 'Ohne Messwert'}
            {entry.guidedCompletion && entry.prescribedIntervals
              ? ` · ${entry.completedIntervals}/${entry.prescribedIntervals} Belastungsphasen vollständig` : ''}
            {entry.guidedCompletion && entry.prescribedSprints
              ? ` · ${entry.completedSprints}/${entry.prescribedSprints} Sprints · Ø ${entry.averageSprintSeconds} s` : ''}</p>)}
          {!exercise.guidedEndurance && entries.length > 0 && <ol>{entries.map((entry, setIndex) =>
            <li key={entry.id ?? setIndex}>
              <span>Satz {setIndex + 1}: {formatTrainingEntry(entry, type, exercise) || 'Ohne Messwert'}</span>
              {entry.notes && <span className="training-history-set-note">{entry.notes}</span>}
            </li>)}</ol>}
          {legacy && <p className="training-history-legacy">{Object.entries(legacyLabels)
            .filter(([field]) => exercise[field] !== '' && exercise[field] != null)
            .map(([field, label]) => `${label}: ${exercise[field]}`).join(' · ')}</p>}
          {!entries.length && !legacy && <p className="history-meta">
            {exercise.guidedEndurance ? 'Hauptübung noch nicht bestätigt' : 'Keine Satzwerte erfasst'}</p>}
          {exercise.notes && <p className="training-history-note">{exercise.notes}</p>}
        </div>
      })}
    </section>)}
  </div>
}
