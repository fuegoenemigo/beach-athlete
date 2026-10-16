import { useState } from 'react'
import TrainingLineChart from './TrainingLineChart.jsx'
import TrainingStatistics, { CategoryStatistics, RatingBadge, StrengthStatistics } from './TrainingStatistics.jsx'
import EntryWindow from './EntryWindow.jsx'

const sections = [
  { id: 'training', title: 'Training', axis: 'Trainingsleistung',
    note: 'Übungen, Muskelgruppen und Hauptkategorien bilden den gemeinsamen Trainingstrend.' },
  { id: 'beach', title: 'Beachvolleyball', axis: 'Persönliche Bewertung',
    note: 'Gegnerstärke, Intensität und Spielergebnisse brauchen eine gemeinsame Bewertungsregel.',
    detail: 'Hier können später Spieltage, Turniere und Einflussfaktoren einzeln ausgewertet werden.' },
  { id: 'indoor', title: 'Hallenvolleyball', axis: 'Persönliche Bewertung',
    note: 'Gegnerstärke, Intensität und Spielergebnisse brauchen eine gemeinsame Bewertungsregel.',
    detail: 'Hier können später Spieltage, Turniere und Einflussfaktoren einzeln ausgewertet werden.' },
]

function PreviewChart({ title, axis }) {
  return <svg className="statistics-preview-chart" viewBox="0 0 320 170" role="img"
    aria-label={`${title}: Vorschau eines Liniendiagramms ohne berechnete Werte`}>
    <line x1="47" y1="16" x2="47" y2="137" className="statistics-axis" />
    <line x1="47" y1="137" x2="306" y2="137" className="statistics-axis" />
    <line x1="47" y1="96" x2="306" y2="96" className="statistics-grid-line" />
    <line x1="47" y1="55" x2="306" y2="55" className="statistics-grid-line" />
    <path d="M54 112 C83 106 91 90 118 97 S159 112 185 83 S227 92 249 72 S282 67 301 42"
      className="statistics-example-line" />
    <text x="177" y="162" className="statistics-axis-label">Zeit</text>
    <text x="14" y="80" transform="rotate(-90 14 80)" className="statistics-axis-label">{axis}</text>
    <text x="176" y="35" className="statistics-preview-label">Beispielverlauf</text>
  </svg>
}

function attributeExercises(progress, id) {
  const category = progress.categories.find((item) => item.name === (
    id === 'strength' ? 'Krafttraining' : id === 'endurance' ? 'Ausdauer'
      : id === 'control' ? 'Core und Mobility' : 'Sprungkraft und Agilität'))
  const exercises = category?.exercises ?? []
  const isAgility = (item) => ['Agilität', 'Schnelligkeit'].includes(item.muscleGroup)
    || /sprint|shuttle|slalom/i.test(item.libraryId)
  if (id === 'jump') return exercises.filter((item) => !isAgility(item))
  if (id === 'agility') return exercises.filter(isAgility)
  return exercises
}

export default function StatisticsView({ training, progress }) {
  const [trainingWindow, setTrainingWindow] = useState(null)
  const selectedAttribute = training.attributes.find((attribute) => attribute.id === trainingWindow?.name)
  const selectedSport = sections.find((section) => section.id === trainingWindow?.name)
  const windowTitle = trainingWindow?.level === 'categories' ? 'Training'
    : trainingWindow?.level === 'strength' ? 'Kraft · Muskelgruppen'
      : trainingWindow?.level === 'sport' ? selectedSport?.title : selectedAttribute?.name

  return <><div className="statistics-sections">
    {sections.map((section) => <section className="statistics-section" key={section.id}>
      <button type="button" className="statistics-section-toggle"
        aria-haspopup="dialog"
        onClick={() => section.id === 'training' ? setTrainingWindow({ level: 'categories' })
          : setTrainingWindow({ level: 'sport', name: section.id })}>
        <span className="statistics-section-heading"><strong>{section.title}</strong>
          <span aria-hidden="true">↗</span></span>
        {section.id === 'training' ? <>
          <TrainingLineChart label="Training gesamt" series={training.overall.series} score={training.overall.score} />
          <RatingBadge rating={training.overall} />
        </> : <>
          <PreviewChart title={section.title} axis={section.axis} />
          <span className="statistics-preview-note">Vorschau · noch keine berechneten Werte</span>
        </>}
      </button>
    </section>)}
  </div>
    {trainingWindow && <EntryWindow key={`${trainingWindow.level}-${trainingWindow.name ?? ''}`}
      title={windowTitle} subtitle={trainingWindow.level === 'sport' ? 'DEINE VOLLEYBALLSTATISTIK' : 'DEINE TRAININGSSTATISTIK'}
      onClose={() => setTrainingWindow(trainingWindow.level === 'strength' || trainingWindow.level === 'category'
        ? { level: 'categories' } : null)}>
      {trainingWindow.level === 'categories' && <TrainingStatistics rating={training}
        onOpenCategory={(id) => setTrainingWindow({
          level: id === 'strength' ? 'strength' : 'category', name: id,
        })} />}
      {trainingWindow.level === 'strength' && selectedAttribute
        && <StrengthStatistics rating={selectedAttribute} progress={progress.categories[0]} />}
      {trainingWindow.level === 'category' && selectedAttribute
        && <CategoryStatistics rating={selectedAttribute}
          exercises={attributeExercises(progress, selectedAttribute.id)} />}
      {trainingWindow.level === 'sport' && selectedSport && <div className="statistics-section-detail">
        <p>{selectedSport.note}</p>
        <div className="statistics-detail-placeholder">{selectedSport.detail}</div>
      </div>}
    </EntryWindow>}
  </>
}
