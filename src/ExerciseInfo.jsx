import { useId, useState } from 'react'
import { instructionForExercise } from './exerciseInstructions.js'

export default function ExerciseInfo({ exercise, defaultOpen = false }) {
  const description = instructionForExercise(exercise)
  const [open, setOpen] = useState(defaultOpen)
  const descriptionId = useId()
  if (!description) return null

  return <div className={`training-exercise-info${open ? ' open' : ''}`}>
    <button type="button" className="training-info-button"
      aria-label={`Informationen zu ${exercise.name}`}
      aria-expanded={open} aria-controls={descriptionId}
      onClick={() => setOpen((current) => !current)}>i</button>
    <p id={descriptionId} className="training-exercise-description" hidden={!open}>{description}</p>
  </div>
}
