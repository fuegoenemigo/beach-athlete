import CloudAccount from './CloudAccount.jsx'

export default function DataSecurity({ cloudState, onResolve, onRetry, onExport,
  onExportRaw, onImport, storageDamaged }) {
  return (
    <section id="data-security" className="diary-panel home-data-security">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DATEN & SICHERHEIT</p>
          <h2>Konto und Datensicherung</h2>
        </div>
      </div>

      <CloudAccount state={cloudState} onResolve={onResolve} onRetry={onRetry}
        onExport={onExport} />

      <p>Kontakt zur privaten Testversion und zu deinen Daten: Marc Korus · <a href="mailto:marc.j.korus@gmx.de">marc.j.korus@gmx.de</a>.</p>
      <p className="helper-text">Für den Testkreis speichern wir zu deinem Konto auch deine E-Mail-Adresse, den Zeitpunkt deiner letzten Anmeldung und den letzten Aufruf der App in Firebase. So können wir erkennen, welche Testkonten noch genutzt werden. Beim Öffnen der App und bei einer Rückkehr nach längerer Pause wird der letzte Aufruf aktualisiert.</p>

      {storageDamaged && (
        <div className="cloud-conflict" role="alert">
          <p>Lokale Daten konnten nicht gelesen werden. Sie wurden nicht überschrieben. Exportiere die Rohdaten und bewahre die Datei auf.</p>
          <button className="secondary-button" type="button" onClick={onExportRaw}>Rohdaten exportieren</button>
        </div>
      )}

      <p>Exportiere eine Sicherung deiner Trainingseinheiten, Trainingsvorlagen, Übungsbibliothek und Volleyball-Spieltage oder stelle sie aus einer Datei wieder her.</p>
      <div className="exercise-actions">
        <button className="secondary-button" type="button" onClick={onExport}>Daten exportieren</button>
        <label className="secondary-button">
          Daten importieren
          <input type="file" accept=".json,application/json" onChange={onImport}
            style={{ display: 'none' }} />
        </label>
      </div>
    </section>
  )
}
