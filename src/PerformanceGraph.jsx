export default function PerformanceGraph({ status }) {
  const paths = {
    improved: 'M2 15 L12 14 L20 12 L28 13 L36 9 L46 6',
    'strong-improved': 'M2 18 L13 18 L22 16 L30 14 L37 9 L46 1',
    decline: 'M2 5 L12 6 L20 8 L28 7 L36 11 L46 14',
    'strong-decline': 'M2 2 L13 2 L22 4 L30 6 L37 11 L46 19',
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
