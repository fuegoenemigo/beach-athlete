export default function PerformanceGraph({ status }) {
  if (status !== 'improved' && status !== 'decline') return null
  const path = status === 'improved'
    ? 'M2 17 L11 14 L18 15 L27 9 L34 11 L46 3'
    : 'M2 3 L11 7 L18 5 L27 12 L34 10 L46 17'
  return <svg className={`home-performance-graph is-${status}`} viewBox="0 0 48 20"
    fill="none" aria-hidden="true" focusable="false">
    <path d={path} stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
