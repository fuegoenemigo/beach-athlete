import { useState } from 'react'

const sections = [
  { id: 'training', title: 'Training', axis: 'Trainingsleistung',
    note: 'Die Wertung einzelner Übungen und ihre Zusammenfassung stimmen wir noch ab.',
    detail: 'Hier können später Übungsentwicklung, Kategorien und vergleichbare Trainingstage erscheinen.' },
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

export default function StatisticsView() {
  const [expandedSection, setExpandedSection] = useState(null)

  return <div className="statistics-sections">
    {sections.map((section) => <section className="statistics-section" key={section.id}>
      <button type="button" className="statistics-section-toggle"
        aria-expanded={expandedSection === section.id} aria-controls={`statistics-detail-${section.id}`}
        onClick={() => setExpandedSection((current) => current === section.id ? null : section.id)}>
        <span className="statistics-section-heading"><strong>{section.title}</strong>
          <span aria-hidden="true">{expandedSection === section.id ? '−' : '＋'}</span></span>
        <PreviewChart title={section.title} axis={section.axis} />
        <span className="statistics-preview-note">Vorschau · noch keine berechneten Werte</span>
      </button>
      <div id={`statistics-detail-${section.id}`}
        className="statistics-section-detail" hidden={expandedSection !== section.id}>
        <h3>{section.title} im Detail</h3>
        <p>{section.note}</p>
        <div className="statistics-detail-placeholder">{section.detail}</div>
      </div>
    </section>)}
  </div>
}
