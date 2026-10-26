import { useId } from 'react'
import { CARD_STATS, playerCardIdentity } from './playerCardPresentation.js'

const OUTLINE = 'M50 49 L168 41 Q206 33 239 17 L269 32 L300 5 L331 32 L361 17 Q394 33 432 41 L550 49 Q565 56 566 71 L566 722 Q566 779 526 795 L320 885 Q300 894 280 885 L74 795 Q34 779 34 722 L34 71 Q35 56 50 49 Z'
const INNER = 'M62 65 L169 57 Q212 47 242 36 L268 50 L300 28 L332 50 L358 36 Q388 47 431 57 L538 65 Q546 70 546 79 L546 715 Q546 762 513 777 L317 859 Q300 867 283 859 L87 777 Q54 762 54 715 L54 79 Q54 70 62 65 Z'
const PALETTES = {
  beach: { light: '#fffdf5', middle: '#f1e3c4', shade: '#c9aa70', line: '#a68345', shine: '#fff9e8' },
  indoor: { light: '#ffffff', middle: '#e5e8e7', shade: '#a7afad', line: '#808d8d', shine: '#ffffff' },
  neutral: { light: '#ffffff', middle: '#efefec', shade: '#d1d4d1', line: '#9a9c92', shine: '#ffffff' },
}

export default function PlayerCardArt({ score, profile, attributes = [], preview = false }) {
  const identity = playerCardIdentity(profile)
  const values = new Map(attributes.map((attribute) => [attribute.id, attribute.score]))
  const palette = PALETTES[identity.discipline] || PALETTES.neutral
  const id = useId().replaceAll(':', '')
  const rating = Math.round(score)
  const name = identity.name.toLocaleUpperCase('de-DE')
  const textLength = name.length > 10 ? Math.max(340, 490 - (name.length - 10) * 15) : undefined

  return <div className={`home-card-art is-${identity.discipline || 'neutral'}${preview ? ' is-preview' : ''}`}
    role="img" aria-label={`Athlete Card für ${identity.name}, ${identity.position || 'Position noch offen'}, Gesamtwert ${rating} von 99`}>
    <svg viewBox="0 0 600 900" aria-hidden="true" focusable="false">
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
        <clipPath id={`${id}-clip`}><path d={OUTLINE} /></clipPath>
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
      <text x="103" y="204" className="card-rating">{rating}</text>
      <text x="107" y="234" className="card-label">GES</text>
      <path d="M105 250 H193" stroke={palette.line} strokeWidth="3" />
      <text x="107" y="293" className="card-code">{identity.code}</text>
      <circle cx="312" cy="351" r="160" fill={palette.light} opacity=".28" stroke={palette.line} strokeWidth="3" />
      <circle cx="312" cy="351" r="146" fill="none" stroke="#fff" strokeWidth="5" opacity=".7" />
      <path d="M176 351 H448 M312 205 V497" stroke={palette.line} strokeWidth="1.5" opacity=".24" />
      <text x="312" y="405" textAnchor="middle" className="card-crest">BA</text>
      <text x="312" y="440" textAnchor="middle" className="card-crest-sub">ATHLETE</text>
      <text x="300" y="596" textAnchor="middle" className="card-name" textLength={textLength}
        lengthAdjust="spacingAndGlyphs">{name}</text>
      <text x="300" y="631" textAnchor="middle" className="card-position">{identity.position || 'POSITION WÄHLEN'}</text>
      <path d="M91 647 H509" stroke={palette.line} strokeWidth="2.5" opacity=".8" />
      {CARD_STATS.map(({ id: statId, short }, index) => {
        const x = 112 + index * 94
        return <g key={statId} textAnchor="middle">
          <text x={x} y="696" className="card-stat-label">{short}</text>
          <text x={x} y="745" className="card-stat-value">{Math.round(values.get(statId) ?? 60)}</text>
        </g>
      })}
      <path d="M91 766 H509" stroke={palette.line} strokeWidth="2" opacity=".65" />
      <text x="300" y="801" textAnchor="middle" className="card-footer">DEINE DATEN · DEINE ENTWICKLUNG</text>
      <path d="M282 824 L300 812 L318 824 L300 836 Z" fill={palette.light} stroke={palette.line} strokeWidth="2" />
      <text x="300" y="828" textAnchor="middle" className="card-monogram">BA</text>
    </svg>
  </div>
}
