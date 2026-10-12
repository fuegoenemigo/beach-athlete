export default function PerformanceGraph({ status }) {
  const paths = {
    improved: 'M2 15 L12 14 L20 12 L28 13 L36 9 L46 6',
    'strong-improved': 'M5 18 L12 16 L17 17 L24 12 L29 14 L35 7 L39 8 L43 2',
    decline: 'M2 5 L12 6 L20 8 L28 7 L36 11 L46 14',
    'strong-decline': 'M5 2 L12 4 L17 3 L24 8 L29 6 L35 13 L39 12 L43 18',
  }
  const path = paths[status]
  if (!path) return null
  return <svg className={`home-performance-graph is-${status}`} viewBox="0 0 48 20"
    fill="none" aria-hidden="true" focusable="false">
    <path d={path} stroke="currentColor"
      strokeWidth={status.startsWith('strong-') ? '3.4' : '2.8'}
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
