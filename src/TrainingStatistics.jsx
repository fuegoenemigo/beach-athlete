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
  return <span className="statistics-rating-badge">{displayScore(rating.score)} <small>/ 96</small></span>
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
    <p>Fünf athletische Werte entstehen aus deinen vier Trainingsbereichen. Alle starten bei 55. Tippe auf einen Wert für Details.</p>
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
      <p>Alle Werte liegen zwischen 55 und 96. Kraft entwickelt sich mit bestätigter Leistung höchstens einmal pro Kalenderwoche: zuerst um bis zu fünf, danach unter 80 um bis zu vier und ab 80 um bis zu zwei Punkte. Gemessene Sprungwerte wirken direkt. Die übrigen Bereiche werden künftig genauer kalibriert.</p>
      <p>Ohne passendes abgeschlossenes Training sinkt ein bereits gestiegener Wert nach je elf vollen Tagen um einen Punkt. Bei Kraft läuft diese Frist getrennt für Brust, Rücken, Beine und Arme; ihr neuer Durchschnitt bestimmt den Kraftwert. Ein Training setzt nur die passende Frist zurück.</p>
      <p>Für Kraft zählen die besten zwei verschiedenen Übungen je Muskelbereich. Arbeitsgewicht und Wiederholungen werden anhand vorläufiger Prüfanker bewertet; auch persönliche Steigerung zählt begrenzt. Die drei präzisen Sprungmessungen haben eigene Prüfanker für Frauen und Männer.</p>
      <p>Ein Mobility-Tag zählt, wenn mindestens zwei Mobility-Übungen oder insgesamt zwei Minuten Mobility dokumentiert wurden. Regelmäßigkeit innerhalb von 28 Tagen hebt den Körperkontrollwert begrenzt an. Volleyball-Ergebnisse und bloße Anwesenheit zählen nicht.</p>
    </div></EntryWindow>}
  </div>
}

export function StrengthStatistics({ rating, progress }) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const group = rating.groups.find((item) => item.name === selectedGroup)
  return <div className="training-statistics">
    <p>Brust, Rücken, Beine und Arme zählen gleich stark. Je Muskelbereich zählen die zwei besten verschiedenen Übungen; eine erste Übung kann den Wert bereits steigern. Arme sind der Mittelwert aus Schultern, Bizeps und Trizeps. Noch nicht trainierte Bereiche bleiben bei 55.</p>
    <div className="training-stat-summary"><RatingBadge rating={rating} /></div>
    {rating.groups.length ? <div className="training-stat-groups">
      {rating.groups.map((item) => <div className="training-stat-group" key={item.name}>
        <button type="button" className="training-stat-group-link" onClick={() => setSelectedGroup(item.name)}>
          <span className="training-stat-card-heading"><strong>{item.name}</strong><span aria-hidden="true">›</span></span>
          <TrainingLineChart label={item.name} series={item.series} score={item.score} />
          <RatingBadge rating={item} />
        </button>
      </div>)}
    </div> : <p>Alle Muskelgruppen beginnen bei 55. Nach einer bewertbaren Kraftübung erscheint hier ihr Verlauf.</p>}
    {group && <EntryWindow title={group.name} subtitle="KRAFT · MUSKELGRUPPE"
      onClose={() => setSelectedGroup(null)}><div className="training-stat-group-content">
          {group.name === 'Arme' && <div className="training-stat-groups">
            {group.subgroups.map((item) => <div className="training-stat-group" key={item.name}>
              <span className="training-stat-card-heading"><strong>{item.name}</strong>
                <RatingBadge rating={item} /></span>
            </div>)}
          </div>}
          <h3>Übungen</h3>
          <ExerciseList exercises={progress.groups.filter((item) => group.name === 'Arme'
            ? ['Schultern', 'Bizeps', 'Trizeps'].includes(item.name)
            : item.name === group.name).flatMap((item) => item.exercises)} /></div>
    </EntryWindow>}
  </div>
}

export function CategoryStatistics({ rating, exercises }) {
  return <div className="training-statistics">
    <p>Der Wert startet bei 55 und entwickelt sich mit vergleichbaren Trainingstagen.</p>
    <TrainingLineChart label={rating.name} series={rating.series} score={rating.score} />
    <div className="training-stat-summary"><RatingBadge rating={rating} /></div>
    <h3>Übungen</h3>
    <ExerciseList exercises={exercises} />
    {rating.id === 'control' && <p>Regelmäßige Mobility-Tage erhöhen diesen Wert zusätzlich. Die Dauer eines einzelnen Dehnens gilt nicht als Beweglichkeitsmessung.</p>}
  </div>
}
