import { useCallback, useEffect, useState } from 'react'
import { doc, getDocFromServer } from 'firebase/firestore'
import { firestore } from './firebase.js'

const formatTimestamp = (value) => {
  const date = value?.toDate?.()
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    : 'Noch nicht erfasst'
}

async function loadUsers() {
  const registry = await getDocFromServer(doc(firestore, 'config', 'betaAccess'))
  if (!registry.exists() || !Array.isArray(registry.data().members)) {
    throw new Error('Testkontenliste fehlt')
  }
  const next = await Promise.all(registry.data().members.map(async (uid) => {
    const activity = await getDocFromServer(doc(firestore, 'users', uid, 'activity', 'lastSeen'))
    return { uid, ...(activity.exists() ? activity.data() : {}) }
  }))
  next.sort((a, b) => (b.lastOpenedAt?.toMillis?.() ?? 0)
    - (a.lastOpenedAt?.toMillis?.() ?? 0))
  return next
}

export default function AdminUsersTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    loadUsers().then((next) => {
      setRows(next)
      setError('')
    }).catch(() => {
      setError('Die Testnutzer konnten nicht geladen werden. Prüfe deine Verbindung und melde dich mit deinem Administratorkonto an.')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return <section className="admin-users" aria-label="Testnutzer-Übersicht">
    <div className="section-heading">
      <div><p className="eyebrow">PRIVATER TESTKREIS</p><h3>Testnutzer</h3></div>
      <button type="button" className="secondary-button" onClick={() => {
        setLoading(true)
        setError('')
        refresh()
      }} disabled={loading}>Aktualisieren</button>
    </div>
    <p className="helper-text">Letzter App-Aufruf wird beim Öffnen der aktuellen App-Version erfasst. Die letzte Anmeldung stammt aus Firebase Authentication.</p>
    {loading && <p role="status">Testnutzer werden geladen …</p>}
    {error && <p className="training-flow-error" role="alert">{error}</p>}
    {!loading && !error && <>
      <p className="helper-text">{rows.length} zugelassene {rows.length === 1 ? 'Person' : 'Personen'}</p>
      <div className="admin-users-scroll">
        <table>
          <thead><tr><th scope="col">E-Mail / Nutzer</th><th scope="col">Letzte Anmeldung</th>
            <th scope="col">Letzter App-Aufruf</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.uid}>
            <td>{row.email || <span title={row.uid}>Noch kein Aktivitätseintrag · {row.uid.slice(0, 8)}…</span>}</td>
            <td>{formatTimestamp(row.lastSignInAt)}</td>
            <td>{formatTimestamp(row.lastOpenedAt)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>
}
