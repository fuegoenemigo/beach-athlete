import { useState } from 'react'
import EntryWindow from './EntryWindow.jsx'
import PerformanceGraph from './PerformanceGraph.jsx'
import TrainingLineChart from './TrainingLineChart.jsx'

const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toLocaleString('de-DE', {
  maximumFractionDigits: 1,
})} %`
const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: 'numeric', month: 'numeric', year: 'numeric',
})
const displayScore = (value) => Math.round(value)

export function RatingBadge({ rating }) {
  return <span className="statistics-rating-badge">{displayScore(rating.score)} <small>/ 99</small></span>
}

export function TrainingTrend({ result }) {
  if (!result || result.status === 'unrated') return <span className="statistics-trend is-unrated">Noch keine Wertung</span>
  const label = { improved: 'Verbesserung', decline: 'Rückgang', unchanged: 'Stagnation' }[result.status]
  return <span className={`statistics-trend is-${result.status}`}>
    {result.status === 'unchanged' ? <span className="statistics-trend-minus">−</span>
      : <PerformanceGraph status={result.status} />}
    <span>{label} · {formatPercent(result.changePercent)}</span>
  </span>
}

function ExerciseList({ exercises }) {
  if (!exercises.length) return <p>Noch keine vergleichbaren Übungen vorhanden.</p>
  return <ul className="statistics-exercise-list">
    {exercises.map((exercise) => <li key={exercise.libraryId}>
      <span><strong>{exercise.name}</strong><small>Zuletzt verglichen am {shortDate(exercise.date)}</small></span>
      <TrainingTrend result={exercise} />
    </li>)}
  </ul>
}

export default function TrainingStatistics({ rating, onOpenCategory }) {
  const [showMethod, setShowMethod] = useState(false)
  return <div className="training-statistics">
    <p>Fünf athletische Werte entstehen aus deinen vier Trainingsbereichen. Alle starten bei 60 und verändern sich mit wiederholten, vergleichbaren Einträgen. Tippe auf einen Wert für Details.</p>
    <div className="training-statistics-categories">
      {rating.attributes.map((attribute) => <button type="button" className="training-stat-card"
        key={attribute.id} onClick={() => onOpenCategory(attribute.id)}
        aria-label={`${attribute.name} öffnen`}>
        <span className="training-stat-card-heading"><strong>{attribute.name}</strong>
          <span aria-hidden="true">↗</span></span>
        <TrainingLineChart label={attribute.name} series={attribute.series} score={attribute.score} />
        <RatingBadge rating={attribute} />
      </button>)}
    </div>
    <button type="button" className="secondary-button" onClick={() => setShowMethod(true)}>
      Wie entsteht die Bewertung?
    </button>
    {showMethod && <EntryWindow title="Wie entsteht die Bewertung?" subtitle="DEINE ENTWICKLUNG"
      onClose={() => setShowMethod(false)}><div className="training-stat-method">
      <p>Die Karte ist ein motivierender App-Wert, keine medizinische oder sportwissenschaftliche Diagnose. Geeignete Übungen erhalten grobe Referenzwerte; andere zählen über ihren Vergleich mit der eigenen früheren Ausführung.</p>
      <p>Pro Trainingstag nähert sich ein Attribut um 18 % dem berechneten Zielwert. Es fällt nie unter 60. Oberhalb von 80 sind höchstens zwei zusätzliche Punkte pro Kalenderwoche möglich.</p>
      <p>Ohne passendes abgeschlossenes Training sinkt ein bereits gestiegener Wert nach je elf vollen Tagen um einen Punkt. Bei Kraft läuft diese Frist getrennt für Brust, Rücken, Beine und Arme; ihr neuer Durchschnitt bestimmt den Kraftwert. Ein Training setzt nur die passende Frist zurück.</p>
      <p>Für Kraft werden gemessene Last und Wiederholungen bei ausgewählten Grundübungen zum Körpergewicht ins Verhältnis gesetzt. Sprünge, feste Sprintstrecken, Core-Halteübungen und abgeschlossene Ausdauerprotokolle zählen entsprechend ihrer Messart.</p>
      <p>Ein Mobility-Tag zählt, wenn mindestens zwei Mobility-Übungen oder insgesamt zwei Minuten Mobility dokumentiert wurden. Regelmäßigkeit innerhalb von 28 Tagen hebt den Körperkontrollwert begrenzt an. Volleyball-Ergebnisse und bloße Anwesenheit zählen nicht.</p>
    </div></EntryWindow>}
  </div>
}

export function StrengthStatistics({ rating, progress }) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const group = rating.groups.find((item) => item.name === selectedGroup)
  return <div className="training-statistics">
    <p>Brust, Rücken, Beine und Arme zählen gleich stark. Brust, Rücken und Beine werden mit zwei Grundübungen oder einer Grundübung und zwei Isolationsübungen bewertet. Das ergibt 50/50 oder 50/25/25; bei weiteren Übungen bleibt das Verhältnis Grundübung zu Isolation 2:1. Arme benötigen je eine Übung für Schultern, Bizeps und Trizeps.</p>
    <div className="training-stat-summary"><RatingBadge rating={rating} /></div>
    {rating.groups.length ? <div className="training-stat-groups">
      {rating.groups.map((item) => <div className="training-stat-group" key={item.name}>
        <button type="button" className="training-stat-group-link" onClick={() => setSelectedGroup(item.name)}>
          <span className="training-stat-card-heading"><strong>{item.name}</strong><span aria-hidden="true">›</span></span>
          <TrainingLineChart label={item.name} series={item.series} score={item.score} />
          <RatingBadge rating={item} />
        </button>
      </div>)}
    </div> : <p>Alle Muskelgruppen beginnen bei 60. Nach einer bewertbaren Kraftübung erscheint hier ihr Verlauf.</p>}
    {group && <EntryWindow title={group.name} subtitle="KRAFT · MUSKELGRUPPE"
      onClose={() => setSelectedGroup(null)}><div className="training-stat-group-content">
          {!group.qualified && <p className="helper-text">{group.name === 'Arme'
            ? `Für die Wertung fehlt noch: ${group.missingArmMuscles.join(', ') || 'keine Untergruppe'}.`
            : `Erfasst: ${group.compoundCount} Grundübungen und ${group.isolationCount} Isolationsübungen. Für die Wertung brauchst du zwei Grundübungen oder eine Grundübung und zwei Isolationsübungen.`}</p>}
          <h3>Übungen</h3>
          <ExerciseList exercises={progress.groups.filter((item) => group.name === 'Arme'
            ? ['Schultern', 'Bizeps', 'Trizeps'].includes(item.name)
            : item.name === group.name).flatMap((item) => item.exercises)} /></div>
    </EntryWindow>}
  </div>
}

export function CategoryStatistics({ rating, exercises }) {
  return <div className="training-statistics">
    <p>Der Wert startet bei 60 und nähert sich mit vergleichbaren Trainingstagen deiner dokumentierten Leistung an.</p>
    <TrainingLineChart label={rating.name} series={rating.series} score={rating.score} />
    <div className="training-stat-summary"><RatingBadge rating={rating} /></div>
    <h3>Übungen</h3>
    <ExerciseList exercises={exercises} />
    {rating.id === 'control' && <p>Regelmäßige Mobility-Tage erhöhen diesen Wert zusätzlich. Die Dauer eines einzelnen Dehnens gilt nicht als Beweglichkeitsmessung.</p>}
  </div>
}
