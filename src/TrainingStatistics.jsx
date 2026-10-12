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
  return <ul className="statistics-exercise-list">
    {exercises.map((exercise) => <li key={exercise.libraryId}>
      <span><strong>{exercise.name}</strong><small>Zuletzt verglichen am {shortDate(exercise.date)}</small></span>
      <TrainingTrend result={exercise} />
    </li>)}
  </ul>
}

export default function TrainingStatistics({ progress }) {
  return <div className="training-statistics">
    <p>Jede Übung wird nur mit ihrer letzten Ausführung derselben ID verglichen. Pro Tag mittelt die App zuerst die Übungen jeder Muskelgruppe, dann die Muskelgruppen im Krafttraining. Die anderen Kategorien mitteln ihre vergleichbaren Übungen direkt. Der Gesamtwert mittelt die an diesem Tag bewertbaren Kategorien gleichgewichtet.</p>
    <p>Die Diagramme beginnen bei 100 und schreiben diese prozentualen Tagesänderungen fort. Sie zeigen deinen persönlichen Trend, keine Bewertung gegenüber anderen Personen.</p>
    <p>Mehr als +1 % gilt als Verbesserung, weniger als −1 % als Rückgang. Dazwischen zeigt die App Stagnation. Nur vergleichbare, abgeschlossene Übungen zählen.</p>
    <details className="training-stat-method">
      <summary>Wie bewertet die App einzelne Übungen?</summary>
      <p>Bei Kraftübungen zählt der beste geschätzte Kraftwert aus Gewicht und Wiederholungen: Last × (1 + Wiederholungen ÷ 30). Bei Übungen ohne Gewicht zählen Wiederholungen. Sprünge nutzen die gemessene Höhe, Core-Halteübungen die Dauer.</p>
      <p>Ausdauer vergleicht Tempo bei gleicher Distanz oder Strecke bei gleichem geführten Protokoll. Bei wiederholten Sprints zählt die durchschnittliche Sprintzeit. Unterschiedliche Messarten oder Protokolle werden nicht miteinander verrechnet.</p>
    </details>
    <div className="training-statistics-categories">
      {progress.categories.map((category) => <details className="training-stat-category" key={category.name}>
        <summary><span>{category.name}</span><TrainingTrend result={category} /></summary>
        <div className="training-stat-category-content">
          <TrainingLineChart label={category.name} series={category.series} />
          {category.series.length > 0 && <p>Aktueller Trendindex: <strong>{formatIndex(category.series.at(-1).value)}</strong></p>}
          {category.groups.length > 0 && <div className="training-stat-groups">
            <h4>Muskelgruppen</h4>
            {category.groups.map((group) => <details className="training-stat-group" key={group.name}>
              <summary><span>{group.name}</span><TrainingTrend result={group} /></summary>
              <div className="training-stat-group-content">
                <TrainingLineChart label={group.name} series={group.series} />
                <h5>Übungen</h5><ExerciseList exercises={group.exercises} />
              </div>
            </details>)}
          </div>}
          {category.groups.length === 0 && category.exercises.length > 0 && <>
            <h4>Übungen</h4><ExerciseList exercises={category.exercises} />
          </>}
          {category.exercises.length === 0 && <p>Noch keine vergleichbaren Übungen in dieser Kategorie.</p>}
        </div>
      </details>)}
    </div>
    <p>Reine Anwesenheit beim Beach- oder Hallentraining, Aufwärmen und Auslaufen erhalten keinen Leistungswert. Bei Mobility-Dauer fehlt bislang eine eindeutige Leistungsgröße; längeres Dehnen gilt deshalb nicht automatisch als Fortschritt.</p>
  </div>
}
