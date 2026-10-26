import { useEffect, useRef } from 'react'

export default function UpdateDialog({ onInstall, onKeepCurrent }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return <dialog ref={dialogRef} className="app-update-dialog"
    aria-labelledby="app-update-title" aria-describedby="app-update-description"
    onCancel={(event) => { event.preventDefault(); onKeepCurrent() }}>
    <p className="eyebrow">BEACH ATHLETE</p>
    <h2 id="app-update-title">Neue Version verfügbar</h2>
    <p id="app-update-description">Speichere offene Eingaben, bevor du die neue Version lädst.</p>
    <div className="app-update-actions">
      <button type="button" className="primary-button" onClick={onInstall}>Jetzt aktualisieren</button>
      <button type="button" className="secondary-button" onClick={onKeepCurrent}>Aktuelle Version nutzen</button>
    </div>
  </dialog>
}
