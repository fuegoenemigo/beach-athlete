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
    <details className="training-stat-method">
      <summary>Wie entsteht die Bewertung?</summary>
      <p>Die Karte ist ein motivierender App-Wert, keine medizinische oder sportwissenschaftliche Diagnose. Geeignete Übungen erhalten grobe Referenzwerte; andere zählen über ihren Vergleich mit der eigenen früheren Ausführung.</p>
      <p>Pro Trainingstag nähert sich ein Attribut um 18 % dem berechneten Zielwert. Es fällt nie unter 60. Oberhalb von 80 sind höchstens zwei zusätzliche Punkte pro Kalenderwoche möglich.</p>
      <p>Ohne passendes abgeschlossenes Training sinkt ein bereits gestiegener Wert nach je elf vollen Tagen um einen Punkt. Ein passendes Training setzt die Frist für diesen Wert zurück; am Trainingstag wird kein neuer Inaktivitätspunkt abgezogen. Andere Trainingsarten setzen sie nicht zurück.</p>
      <p>Für Kraft werden gemessene Last und Wiederholungen bei ausgewählten Grundübungen zum Körpergewicht ins Verhältnis gesetzt. Sprünge, feste Sprintstrecken, Core-Halteübungen und abgeschlossene Ausdauerprotokolle zählen entsprechend ihrer Messart.</p>
      <p>Ein Mobility-Tag zählt, wenn mindestens zwei Mobility-Übungen oder insgesamt zwei Minuten Mobility dokumentiert wurden. Regelmäßigkeit innerhalb von 28 Tagen hebt den Körperkontrollwert begrenzt an. Volleyball-Ergebnisse und bloße Anwesenheit zählen nicht.</p>
    </details>
  </div>
}

export function StrengthStatistics({ rating, progress }) {
  return <div className="training-statistics">
    <p>Die Muskelgruppen tragen gleichgewichtet zu deiner Kraftbewertung bei.</p>
    <div className="training-stat-summary"><RatingBadge rating={rating} /></div>
    {rating.groups.length ? <div className="training-stat-groups">
      {rating.groups.map((group) => <details className="training-stat-group" key={group.name}>
        <summary>
          <span className="training-stat-card-heading"><strong>{group.name}</strong><span aria-hidden="true">＋</span></span>
          <TrainingLineChart label={group.name} series={group.series} score={group.score} />
          <RatingBadge rating={group} />
        </summary>
        <div className="training-stat-group-content"><h3>Übungen</h3>
          <ExerciseList exercises={progress.groups.find((item) => item.name === group.name)?.exercises ?? []} /></div>
      </details>)}
    </div> : <p>Alle Muskelgruppen beginnen bei 60. Nach einer bewertbaren Kraftübung erscheint hier ihr Verlauf.</p>}
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
