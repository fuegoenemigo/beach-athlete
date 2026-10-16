const paths = {
  home: 'm3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7',
  beach: 'M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0M12 10V3M5 9a7 7 0 0 1 14 0H5Z',
  ball: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM7 4l5 8 9 1M3 11l9 1-5 8M13 3l4 6M20 17l-7-1M5 17l3-6',
  training: 'M7 5v14M3 8v8M17 5v14M21 8v8M7 12h10',
  run: 'm13 8-3 5 4 3-2 5M10 13l-4 6H3M8 9l3-3 4 4h5M15 3h.01',
  mobility: 'M12 3h.01M9 8l3-2 3 4 4 1M12 7l-1 7 6 6M11 14l-5 6H2M11 10l-6 3',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4M12 2v2',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  calendar: 'M5 5h14v16H5V5ZM8 3v4M16 3v4M5 10h14M9 14h.01M15 14h.01M9 17h.01',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20V7',
  card: 'M5 3h14v18H5V3ZM9 8h6M9 12h6M9 16h3',
  archive: 'M4 8h16v12H4V8ZM3 4h18v4H3V4ZM9 12h6',
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  plus: 'M12 5v14M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chevron: 'm9 5 7 7-7 7',
  back: 'm15 5-7 7 7 7',
  down: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
}

export default function UIIcon({ name, className = '' }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={name === 'more' ? 3.5 : 1.65}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={paths[name] ?? paths.card} />
  </svg>
}
