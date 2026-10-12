const decimal = (value) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
  day: 'numeric', month: 'numeric', year: '2-digit',
})

export default function TrainingLineChart({ label, series }) {
  if (series.length < 2) return <span className="statistics-empty-chart">
    Noch keine zwei vergleichbaren Ausführungen für einen Verlauf.
  </span>

  const times = series.map((point) => Date.parse(`${point.date}T00:00:00Z`))
  const firstTime = Math.min(...times)
  const lastTime = Math.max(...times)
  const values = series.map((point) => point.value)
  const low = Math.min(100, ...values)
  const high = Math.max(100, ...values)
  const padding = Math.max(3, (high - low) * 0.2)
  const min = low - padding
  const max = high + padding
  const x = (time) => 50 + ((time - firstTime) / (lastTime - firstTime || 1)) * 252
  const y = (value) => 136 - ((value - min) / (max - min)) * 116
  const path = series.map((point, index) => `${index ? 'L' : 'M'}${x(times[index]).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ')
  const last = series.at(-1)

  return <svg className="statistics-line-chart" viewBox="0 0 320 180" role="img"
    aria-label={`${label}: Trendindex von 100 auf ${decimal(last.value)} zwischen ${shortDate(series[0].date)} und ${shortDate(last.date)}`}>
    {[min, (min + max) / 2, max].map((tick) => <g key={tick}>
      <line x1="50" y1={y(tick)} x2="306" y2={y(tick)} className="statistics-grid-line" />
      <text x="43" y={y(tick) + 3} className="statistics-tick-label">{decimal(tick)}</text>
    </g>)}
    <line x1="50" y1="15" x2="50" y2="136" className="statistics-axis" />
    <line x1="50" y1="136" x2="306" y2="136" className="statistics-axis" />
    <path d={path} className="statistics-actual-line" />
    <circle cx={x(times.at(-1))} cy={y(last.value)} r="3.5" className="statistics-latest-point" />
    <text x="50" y="157" className="statistics-date-label">{shortDate(series[0].date)}</text>
    <text x="304" y="157" className="statistics-date-label is-end">{shortDate(last.date)}</text>
    <text x="177" y="175" className="statistics-axis-label">Zeit</text>
    <text x="12" y="79" transform="rotate(-90 12 79)" className="statistics-axis-label">Trendindex</text>
  </svg>
}
