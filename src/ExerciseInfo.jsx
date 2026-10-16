import { useState } from 'react'
import EntryWindow from './EntryWindow.jsx'
import { instructionForExercise } from './exerciseInstructions.js'

export default function ExerciseInfo({ exercise }) {
  const description = instructionForExercise(exercise)
  const [open, setOpen] = useState(false)
  if (!description) return null

  return <div className="training-exercise-info">
    <button type="button" className="training-info-button"
      aria-label={`Informationen zu ${exercise.name}`}
      onClick={() => setOpen(true)}>i</button>
    {open && <EntryWindow title={exercise.name} subtitle="ÜBUNG ERKLÄRT"
      onClose={() => setOpen(false)}>
      <p className="training-exercise-description">{description}</p>
    </EntryWindow>}
  </div>
}
