const decimal = (value) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: 'numeric', month: 'numeric', year: '2-digit',
})

export default function TrainingLineChart({ label, series = [], score = 60 }) {
  const points = series.length ? series : [{ date: null, value: score }]
  const times = points.map((point) => point.date ? Date.parse(`${point.date}T00:00:00Z`) : 0)
  const firstTime = times[0]
  const span = times.at(-1) - firstTime || 1
  const x = (index) => points.length === 1 ? 177 : 50 + (times[index] - firstTime) / span * 252
  const y = (value) => 136 - (value - 1) / 98 * 116
  const path = points.length === 1 ? `M50 ${y(points[0].value)} L302 ${y(points[0].value)}`
    : points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ')
  const last = points.at(-1)

  return <svg className="statistics-line-chart" viewBox="0 0 320 180" role="img"
    aria-label={`${label}: Bewertung ${decimal(last.value)} von 99${series.length ? `, zuletzt ${shortDate(last.date)}` : ', Startwert'}`}>
    {[1, 60, 80, 99].map((tick) => <g key={tick}>
      <line x1="50" y1={y(tick)} x2="306" y2={y(tick)} className="statistics-grid-line" />
      <text x="43" y={y(tick) + 3} className="statistics-tick-label">{decimal(tick)}</text>
    </g>)}
    <line x1="50" y1="15" x2="50" y2="136" className="statistics-axis" />
    <line x1="50" y1="136" x2="306" y2="136" className="statistics-axis" />
    <path d={path} className="statistics-actual-line" />
    <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" className="statistics-latest-point" />
    {series.length ? <>
      <text x="50" y="157" className="statistics-date-label">{shortDate(series[0].date)}</text>
      <text x="304" y="157" className="statistics-date-label is-end">{shortDate(last.date)}</text>
    </> : <text x="177" y="157" className="statistics-date-label is-center">Startwert</text>}
    <text x="177" y="175" className="statistics-axis-label">Zeit</text>
    <text x="12" y="79" transform="rotate(-90 12 79)" className="statistics-axis-label">Bewertung</text>
  </svg>
}
