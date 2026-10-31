import { useId } from 'react'
import { CARD_STATS, playerCardIdentity, playerCardTrend } from './playerCardPresentation.js'

const OUTLINE = 'M50 49 L168 41 Q206 33 239 17 L269 32 L300 5 L331 32 L361 17 Q394 33 432 41 L550 49 Q565 56 566 71 L566 722 Q566 779 526 795 L320 885 Q300 894 280 885 L74 795 Q34 779 34 722 L34 71 Q35 56 50 49 Z'
const INNER = 'M62 65 L169 57 Q212 47 242 36 L268 50 L300 28 L332 50 L358 36 Q388 47 431 57 L538 65 Q546 70 546 79 L546 715 Q546 762 513 777 L317 859 Q300 867 283 859 L87 777 Q54 762 54 715 L54 79 Q54 70 62 65 Z'
const PALETTES = {
  beach: { light: '#fffdf5', middle: '#f1e3c4', shade: '#c9aa70', line: '#a68345', shine: '#fff9e8' },
  indoor: { light: '#ffffff', middle: '#e5e8e7', shade: '#a7afad', line: '#808d8d', shine: '#ffffff' },
  neutral: { light: '#ffffff', middle: '#efefec', shade: '#d1d4d1', line: '#9a9c92', shine: '#ffffff' },
}

const TREND_LABELS = { up: 'gestiegen', same: 'gleich geblieben', down: 'gesunken' }

function TrendMark({ trend, x, y, large = false }) {
  const span = large ? 11 : 8
  const rise = large ? 10 : 7
  const path = trend === 'up'
    ? `M ${x - span} ${y + rise / 2} Q ${x - 2} ${y - rise / 2} ${x} ${y - rise / 2} Q ${x + 2} ${y - rise / 2} ${x + span} ${y + rise / 2}`
    : trend === 'down'
      ? `M ${x - span} ${y - rise / 2} Q ${x - 2} ${y + rise / 2} ${x} ${y + rise / 2} Q ${x + 2} ${y + rise / 2} ${x + span} ${y - rise / 2}`
      : `M ${x - span + 2} ${y} H ${x + span - 2}`
  return <path className={`card-trend card-trend-${trend}`} d={path} fill="none"
    strokeWidth={large ? 6 : 5.5} strokeLinecap="round" strokeLinejoin="round" />
}

export default function PlayerCardArt({ overall, profile, attributes = [], preview = false }) {
  const identity = playerCardIdentity(profile)
  const values = new Map(attributes.map((attribute) => [attribute.id, attribute]))
  const palette = PALETTES[identity.discipline] || PALETTES.neutral
  const id = useId().replaceAll(':', '')
  const rating = Math.round(overall?.score ?? 60)
  const overallTrend = playerCardTrend(overall)
  const name = identity.name.toLocaleUpperCase('de-DE')
  const polaroidNameLength = name.length > 9 ? 115 : undefined
  const trendDescription = CARD_STATS.map(({ id: statId, short }) => {
    const attribute = values.get(statId)
    return `${short} ${Math.round(attribute?.score ?? 60)} ${TREND_LABELS[playerCardTrend(attribute)]}`
  }).join(', ')

  return <div className={`home-card-art is-${identity.discipline || 'neutral'}${preview ? ' is-preview' : ''}`}
    role="img" aria-label={`Athlete Card für ${identity.name}, ${identity.position || 'Position noch offen'}, Gesamtwert ${rating} von 99 ${TREND_LABELS[overallTrend]}, ${trendDescription}`}>
    <svg viewBox="20 0 560 900" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={palette.light} /><stop offset=".25" stopColor={palette.middle} />
          <stop offset=".49" stopColor={palette.shine} /><stop offset=".78" stopColor={palette.middle} />
          <stop offset="1" stopColor={palette.shade} />
        </linearGradient>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2=".9">
          <stop stopColor={palette.line} /><stop offset=".22" stopColor={palette.shine} />
          <stop offset=".5" stopColor={palette.line} /><stop offset=".75" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.line} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".76" /><stop offset=".45" stopColor="#fff" stopOpacity=".12" />
          <stop offset="1" stopColor="#fff" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`${id}-photo`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d5d2c8" /><stop offset=".6" stopColor="#a8ada9" />
          <stop offset="1" stopColor="#7d8989" />
        </linearGradient>
        <linearGradient id={`${id}-paper-bend`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#8f8878" stopOpacity=".22" />
          <stop offset=".18" stopColor="#bcb6a8" stopOpacity=".1" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset=".82" stopColor="#bcb6a8" stopOpacity=".07" />
          <stop offset="1" stopColor="#847c6c" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id={`${id}-paper-lift`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset=".62" stopColor="#fff" stopOpacity="0" />
          <stop offset=".84" stopColor="#d1cbbb" stopOpacity=".13" />
          <stop offset="1" stopColor="#8c8273" stopOpacity=".25" />
        </linearGradient>
        <filter id={`${id}-polaroid-shadow`} x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="-8" dy="12" stdDeviation="8" floodColor="#3b2b13" floodOpacity=".36" />
        </filter>
        <filter id={`${id}-lifted-edge-shadow`} x="-30%" y="-70%" width="170%" height="240%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <clipPath id={`${id}-clip`}><path d={OUTLINE} /></clipPath>
        <clipPath id={`${id}-polaroid-clip`}>
          <path d="M69 178 Q155 181 241 178 C243 261 245 357 252 429 Q155 443 59 429 C63 344 68 252 69 178 Z" />
        </clipPath>
        <clipPath id={`${id}-photo-clip`}>
          <path d="M81 191 Q154 193 228 191 C229 252 231 317 234 365 Q155 374 76 365 C79 310 81 247 81 191 Z" />
        </clipPath>
      </defs>
      <path d={OUTLINE} fill={`url(#${id}-surface)`} stroke={`url(#${id}-foil)`} strokeWidth="8" />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M-30 138 L313 8 L620 280 L620 367 L273 84 Z" fill={`url(#${id}-shine)`} />
        <path d="M-30 478 L331 81 L620 431 L620 542 L347 192 L-30 574 Z" fill={palette.shade} opacity=".13" />
        <path d="M578 128 L282 296 L620 485 Z M-40 369 L301 520 L-32 715 Z" fill="#fff" opacity=".25" />
        <path d="M-20 721 L255 562 L635 691 L635 846 L314 675 L-20 845 Z" fill={`url(#${id}-shine)`} opacity=".75" />
        <path d="M48 278 L238 80 L574 381 M65 456 L318 119 L573 296 M70 753 L354 532 L566 699"
          fill="none" stroke={palette.line} strokeWidth="2" opacity=".35" />
        <path d="M345 52 L560 234 L339 171 L548 414 L313 285 L562 536"
          fill="none" stroke="#fff" strokeWidth="8" opacity=".42" />
      </g>
      <path d={INNER} fill="none" stroke={`url(#${id}-foil)`} strokeWidth="3" opacity=".82" />
      <path d="M70 72 L170 64 Q212 54 242 43 L268 57 L300 36 L332 57 L358 43 Q388 54 430 64 L530 72"
        fill="none" stroke="#fff" strokeWidth="3" opacity=".85" />
      <path d="M300 48 L310 60 L300 72 L290 60 Z" fill="#525752" />
      <text x="300" y="109" textAnchor="middle" className="card-kicker">BEACH ATHLETE</text>
      <text x="405" y="204" className="card-rating">{rating}</text>
      <TrendMark trend={overallTrend} x={527} y={174} large />
      <text x="447" y="234" className="card-label">GES</text>
      <path d="M429 250 H516" stroke={palette.line} strokeWidth="3" />
      <g transform="translate(-30 -51) scale(1.32) rotate(-6 155 300)"
        filter={`url(#${id}-polaroid-shadow)`}>
        <ellipse cx="143" cy="431" rx="107" ry="21" fill="#35260f" opacity=".24"
          filter={`url(#${id}-lifted-edge-shadow)`} />
        <path d="M69 178 Q155 181 241 178 C243 261 245 357 252 429 Q155 443 59 429 C63 344 68 252 69 178 Z"
          fill="#fffdf8" />
        <g clipPath={`url(#${id}-polaroid-clip)`}>
          <rect x="58" y="176" width="196" height="270" fill={`url(#${id}-paper-bend)`} />
          <rect x="58" y="176" width="196" height="270" fill={`url(#${id}-paper-lift)`} />
        </g>
        <g clipPath={`url(#${id}-photo-clip)`}>
          <rect x="74" y="190" width="163" height="185" fill={`url(#${id}-photo)`} />
          <g fill="#59655f" opacity=".64">
            <circle cx="154" cy="249" r="30" />
            <path d="M96 385 Q104 302 154 302 Q205 302 216 385 Z" />
          </g>
        </g>
        <path d="M81 191 Q154 193 228 191 C229 252 231 317 234 365 Q155 374 76 365 C79 310 81 247 81 191 Z"
          fill="none" stroke="#c3c0b7" strokeWidth="1" />
        <path d="M70 377 Q155 383 242 377 M70 381 Q155 387 243 381"
          fill="none" stroke="#c8c4b8" strokeOpacity=".31" strokeWidth="1" />
        <path d="M60 429 Q155 441 251 429" fill="none" stroke="#958a75"
          strokeOpacity=".4" strokeWidth="1.3" />
        <text x="155" y="409" textAnchor="middle" className="card-polaroid-name"
          textLength={polaroidNameLength} lengthAdjust="spacingAndGlyphs">{name}</text>
      </g>
      <g transform="translate(-30 -51) scale(1.32) rotate(-6 155 300)">
        <g transform="rotate(-7 154 181)">
          <rect x="105" y="163" width="99" height="32" rx="2" fill="#d8cda9" opacity=".72" />
          <path d="M108 170 H199 M108 185 H199" stroke="#f8f2df" strokeWidth="1" opacity=".6" />
        </g>
      </g>
      <path d="M91 647 H509" stroke={palette.line} strokeWidth="2.5" opacity=".8" />
      {CARD_STATS.map(({ id: statId, short }, index) => {
        const x = 112 + index * 94
        const attribute = values.get(statId)
        return <g key={statId} textAnchor="middle">
          <text x={x} y="696" className="card-stat-label">{short}</text>
          <text x={x - 14} y="745" className="card-stat-value">{Math.round(attribute?.score ?? 60)}</text>
          <TrendMark trend={playerCardTrend(attribute)} x={x + 31} y={729} />
        </g>
      })}
      <path d="M91 766 H509" stroke={palette.line} strokeWidth="2" opacity=".65" />
      <path d="M282 824 L300 812 L318 824 L300 836 Z" fill={palette.light} stroke={palette.line} strokeWidth="2" />
      <text x="300" y="828" textAnchor="middle" className="card-monogram">BA</text>
    </svg>
  </div>
}
