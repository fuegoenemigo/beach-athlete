export default function PlayerCardArt({ score, preview = false }) {
  return <div className={`home-card-art${preview ? ' is-preview' : ''}`}
    aria-label={`Athlete Card · Gesamtwert ${Math.round(score)} von 99`}>
    <span className="home-card-topline">BEACH ATHLETE <span>✦</span> PLAYER CARD</span>
    <span className="home-card-center"><span className="home-card-crest">BA</span>
      <span className="home-card-rating">{Math.round(score)} <small>GES</small></span></span>
    <span className="home-card-name">DEINE KARTE</span>
    <span className="home-card-divider" />
    <span className="home-card-bottom">DEINE DATEN. DEINE ENTWICKLUNG.</span>
  </div>
}
