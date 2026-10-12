import PerformanceGraph from './PerformanceGraph.jsx'
import TrainingLineChart from './TrainingLineChart.jsx'

const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toLocaleString('de-DE', {
  maximumFractionDigits: 1,
})} %`
const formatIndex = (value) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: 'numeric', month: 'numeric', year: 'numeric',
})

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

export default function TrainingStatistics({ progress, onOpenCategory }) {
  return <div className="training-statistics">
    <p>Jede Übung wird mit ihrer letzten Ausführung derselben ID verglichen. Im Krafttraining entstehen daraus Muskelgruppenwerte; anschließend werden die Muskelgruppen zum Krafttrainingstrend zusammengefasst.</p>
    <p>Die Diagramme starten bei 100 und zeigen deinen persönlichen Verlauf. Tippe auf eine Kategorie, um ihre Details zu öffnen.</p>
    <div className="training-statistics-categories">
      {progress.categories.map((category) => <button type="button" className="training-stat-card"
        key={category.name} onClick={() => onOpenCategory(category.name)}
        aria-label={`${category.name} öffnen`}>
        <span className="training-stat-card-heading"><strong>{category.name}</strong>
          <span aria-hidden="true">↗</span></span>
        <TrainingLineChart label={category.name} series={category.series} />
        <TrainingTrend result={category} />
      </button>)}
    </div>
    <details className="training-stat-method">
      <summary>Wie wird der Fortschritt berechnet?</summary>
      <p>Pro Tag werden zuerst die Übungen jeder Muskelgruppe gemittelt, danach die Muskelgruppen im Krafttraining. Die anderen Kategorien mitteln vergleichbare Übungen direkt. Der Gesamtwert mittelt die an diesem Tag bewertbaren Kategorien gleichgewichtet.</p>
      <p>Bei Kraftübungen zählt der beste geschätzte Kraftwert: Last × (1 + Wiederholungen ÷ 30). Bei Übungen ohne Gewicht zählen Wiederholungen. Sprünge nutzen die gemessene Höhe, Core-Halteübungen die Dauer.</p>
      <p>Ausdauer vergleicht Tempo bei gleicher Distanz oder Strecke bei gleichem geführten Protokoll. Bei wiederholten Sprints zählt die durchschnittliche Sprintzeit. Unterschiedliche Messarten werden nicht miteinander verrechnet.</p>
      <p>Mehr als +1 % gilt als Verbesserung, weniger als −1 % als Rückgang. Dazwischen zeigt die App Stagnation. Reine Anwesenheit und Mobility-Dauer erhalten keinen Leistungswert.</p>
    </details>
  </div>
}

export function StrengthStatistics({ category }) {
  return <div className="training-statistics">
    <p>Krafttraining fasst die vergleichbaren Übungen zunächst je Muskelgruppe zusammen. Jede Muskelgruppe zählt anschließend gleich viel für den Krafttrainingstrend.</p>
    <div className="training-stat-summary"><TrainingTrend result={category} />
      {category.series.length > 0 && <span>Trendindex {formatIndex(category.series.at(-1).value)}</span>}</div>
    {category.groups.length ? <div className="training-stat-groups">
      {category.groups.map((group) => <details className="training-stat-group" key={group.name}>
        <summary>
          <span className="training-stat-card-heading"><strong>{group.name}</strong><span aria-hidden="true">＋</span></span>
          <TrainingLineChart label={group.name} series={group.series} />
          <TrainingTrend result={group} />
        </summary>
        <div className="training-stat-group-content"><h3>Übungen</h3>
          <ExerciseList exercises={group.exercises} /></div>
      </details>)}
    </div> : <p>Noch keine vergleichbaren Kraftübungen für Muskelgruppen vorhanden.</p>}
  </div>
}

export function CategoryStatistics({ category }) {
  return <div className="training-statistics">
    <p>Vergleichbare Übungen dieser Kategorie werden pro Tag gleichgewichtet zusammengefasst.</p>
    <TrainingLineChart label={category.name} series={category.series} />
    <div className="training-stat-summary"><TrainingTrend result={category} />
      {category.series.length > 0 && <span>Trendindex {formatIndex(category.series.at(-1).value)}</span>}</div>
    <h3>Übungen</h3>
    <ExerciseList exercises={category.exercises} />
    {category.name === 'Core und Mobility' && <p>Eine längere Mobility-Dauer gilt nicht automatisch als Fortschritt. Dafür ist noch keine eindeutige Leistungsgröße erfasst.</p>}
  </div>
}
