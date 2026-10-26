import { CARD_STATS, playerCardIdentity } from './playerCardPresentation.js'

export default function PlayerCardArt({ score, profile, attributes = [], preview = false }) {
  const identity = playerCardIdentity(profile)
  const values = new Map(attributes.map((attribute) => [attribute.id, attribute.score]))

  return <div className={`home-card-art is-${identity.discipline || 'neutral'}${preview ? ' is-preview' : ''}`}
    role="img" aria-label={`Athlete Card für ${identity.name}, ${identity.position || 'Position noch offen'}, Gesamtwert ${Math.round(score)} von 99`}>
    <div className="home-card-topline"><span>BEACH ATHLETE</span><span>✦</span><span>PLAYER CARD</span></div>
    <div className="home-card-upper">
      <div className="home-card-rating"><strong>{Math.round(score)}</strong><span>GES</span><b>{identity.code}</b></div>
      <div className="home-card-crest" aria-hidden="true">BA</div>
    </div>
    <div className="home-card-lower">
      <strong className="home-card-name">{identity.name}</strong>
      <span className="home-card-position">{identity.position || 'Position wählen'}</span>
      <div className="home-card-stats" aria-hidden="true">
        {CARD_STATS.map(({ id, short }) => <div key={id}><strong>{Math.round(values.get(id) ?? 60)}</strong><span>{short}</span></div>)}
      </div>
    </div>
  </div>
}
