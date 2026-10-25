import { onAuthStateChanged } from 'firebase/auth'
import {
  arrayUnion,
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './firebase.js'
import { chooseInitialSync, dataHash, isAthleteData, isRemoteData, localDataForAccount } from './syncPolicy.js'

const META_PREFIX = 'beach-athlete-cloud-meta-'
const LOCAL_OWNER_KEY = 'beach-athlete-local-owner'
const ACCOUNT_DATA_PREFIX = 'beach-athlete-local-data-'
const ACCESS_PREFIX = 'beach-athlete-access-'
const MAX_DOCUMENT_BYTES = 900_000

function readMeta(uid) {
  try {
    return JSON.parse(localStorage.getItem(`${META_PREFIX}${uid}`))
  } catch {
    return null
  }
}

function writeMeta(uid, meta) {
  localStorage.setItem(`${META_PREFIX}${uid}`, JSON.stringify(meta))
}

class RevisionConflict extends Error {}

export class CloudSync {
  constructor({ onState, onApply, defaultLibrary }) {
    this.onState = onState
    this.onApply = onApply
    this.defaultLibrary = defaultLibrary
    this.data = null
    this.user = null
    this.meta = null
    this.conflict = null
    this.status = 'loading'
    this.generation = 0
    this.timer = null
    this.writing = false
    this.unsubAuth = null
    this.unsubDocument = null
    this.deferredSnapshot = null
    this.active = false
    this.authorized = false
    this.onOnline = () => this.retry()
    this.onVisible = () => {
      if (document.visibilityState === 'visible') this.retry()
    }
  }

  publish(status, message = '') {
    this.status = status
    this.onState({ status, message, email: this.user?.email || '', conflict: Boolean(this.conflict), authorized: this.authorized })
  }

  updateData(data) {
    this.data = data
    if ((this.status === 'ready' || this.status === 'pending')
      && this.meta?.hash !== dataHash(data)) this.schedule()
  }

  start() {
    this.active = true
    if (!firebaseAuth || !firestore) {
      this.publish('unavailable', 'Firebase ist in diesem Build nicht konfiguriert.')
      return
    }
    window.addEventListener('online', this.onOnline)
    document.addEventListener('visibilitychange', this.onVisible)
    this.unsubAuth = onAuthStateChanged(firebaseAuth, (user) => this.enterUser(user), () => {
      this.publish('error', 'Anmeldestatus konnte nicht geladen werden.')
    })
  }

  stop() {
    this.active = false
    this.generation += 1
    this.clearTimer()
    this.unsubAuth?.()
    this.unsubDocument?.()
    window.removeEventListener('online', this.onOnline)
    document.removeEventListener('visibilitychange', this.onVisible)
  }

  clearTimer() {
    if (this.timer) window.clearTimeout(this.timer)
    this.timer = null
  }

  async enterUser(user) {
    if (!this.active) return
    this.generation += 1
    const generation = this.generation
    this.clearTimer()
    this.unsubDocument?.()
    this.unsubDocument = null
    this.deferredSnapshot = null
    this.writing = false
    this.user = user
    this.authorized = false
    this.meta = user ? readMeta(user.uid) : null
    this.conflict = null
    if (!user) {
      this.publish('signedOut')
      return
    }
    this.publish('checkingAccess')
    const hasAccess = await this.checkAccess(generation)
    if (!hasAccess || generation !== this.generation) return
    try {
      const storedUid = localStorage.getItem(LOCAL_OWNER_KEY)
      let savedData = null
      if (storedUid && storedUid !== user.uid) {
        if (!isAthleteData(this.data)) throw new Error('Invalid local account data')
        localStorage.setItem(`${ACCOUNT_DATA_PREFIX}${storedUid}`, JSON.stringify(this.data))
        const saved = localStorage.getItem(`${ACCOUNT_DATA_PREFIX}${user.uid}`)
        savedData = saved ? JSON.parse(saved) : null
      }
      const localData = localDataForAccount(
        this.data, storedUid, user.uid, this.defaultLibrary, savedData,
      )
      if (localData !== this.data) {
        this.data = localData
        this.onApply(localData)
      }
      localStorage.setItem(LOCAL_OWNER_KEY, user.uid)
    } catch {
      this.publish('error', 'Lokale Kontodaten konnten nicht sicher zugeordnet werden. Bitte exportiere deine Daten.')
      return
    }
    this.reference = doc(firestore, 'users', user.uid, 'data', 'current')
    this.publish('loading')
    await this.reconcile(generation)
  }

  async checkAccess(generation) {
    const uid = this.user.uid
    const registry = doc(firestore, 'config', 'betaAccess')
    try {
      const snapshot = await getDocFromServer(registry)
      if (generation !== this.generation) return false
      if (!snapshot.exists()) throw new Error('Access registry missing')
      const { members, limit } = snapshot.data()
      if (!Array.isArray(members) || !Number.isInteger(limit)) throw new Error('Invalid access registry')
      if (!members.includes(uid)) {
        if (members.length >= limit) {
          this.publish('limitReached', 'Die 15 Testplätze sind bereits vergeben. Bitte wende dich an Marc.')
          return false
        }
        try {
          await updateDoc(registry, { members: arrayUnion(uid) })
        } catch (error) {
          if (generation !== this.generation) return false
          const latest = await getDocFromServer(registry)
          if (latest.exists() && latest.data().members?.length >= latest.data().limit) {
            this.publish('limitReached', 'Die 15 Testplätze sind bereits vergeben. Bitte wende dich an Marc.')
            return false
          }
          throw error
        }
      }
      if (generation !== this.generation) return false
      this.authorized = true
      localStorage.setItem(`${ACCESS_PREFIX}${uid}`, '1')
      return true
    } catch (error) {
      if (generation !== this.generation) return false
      if ((error.code === 'unavailable' || !navigator.onLine)
        && localStorage.getItem(`${ACCESS_PREFIX}${uid}`) === '1') {
        this.authorized = true
        this.publish('offline', 'Offline verfügbar. Änderungen werden später synchronisiert.')
        return true
      }
      this.publish('accessError', 'Zugang konnte nicht geprüft werden. Bitte versuche es online erneut.')
      return false
    }
  }

  async reconcile(generation = this.generation) {
    if (!this.user || !this.data) return
    try {
      const snapshot = await getDocFromServer(this.reference)
      if (generation !== this.generation) return
      const remote = snapshot.exists() ? snapshot.data() : null
      const decision = chooseInitialSync(this.data, remote, this.meta, this.user.uid, this.defaultLibrary)
      if (decision === 'invalid') {
        this.publish('error', 'Cloud-Daten haben ein unbekanntes Format. Lokale Daten bleiben erhalten.')
        return
      }
      const localHash = dataHash(this.data)
      if (decision === 'upload') {
        await this.write(localHash, remote?.revision ?? null)
      } else if (decision === 'ready') {
        this.remember(remote.revision, localHash)
        this.ready()
      } else if (decision === 'download') {
        this.applyRemote(remote)
      } else {
        this.showConflict(remote)
      }
    } catch (error) {
      if (generation !== this.generation || error instanceof RevisionConflict) return
      this.publish('offline', 'Cloud momentan nicht erreichbar. Änderungen bleiben auf diesem Gerät.')
    }
  }

  remember(revision, hash) {
    this.meta = { uid: this.user.uid, revision, hash }
    try {
      writeMeta(this.user.uid, this.meta)
    } catch {
      this.publish('error', 'Lokale Synchronisierungsdaten konnten nicht gespeichert werden.')
    }
  }

  applyRemote(remote) {
    this.clearTimer()
    const data = {
      sessions: remote.sessions,
      exerciseLibrary: remote.exerciseLibrary,
      volleyballDays: remote.volleyballDays,
      trainingPlans: remote.trainingPlans ?? [],
      athleteProfile: remote.athleteProfile ?? { bodyweightKg: '' },
    }
    this.data = data
    this.remember(remote.revision, dataHash(data))
    this.onApply(data)
    this.conflict = null
    this.ready()
  }

  ready() {
    this.publish('ready')
    this.listen()
    if (this.meta?.hash !== dataHash(this.data)) this.schedule()
  }

  listen() {
    if (this.unsubDocument) return
    const generation = this.generation
    this.unsubDocument = onSnapshot(this.reference, (snapshot) => {
      if (generation !== this.generation || snapshot.metadata.fromCache
        || snapshot.metadata.hasPendingWrites || !snapshot.exists()) return
      const remote = snapshot.data()
      if (remote.revision === this.meta?.revision) return
      if (this.writing) {
        this.deferredSnapshot = remote
        return
      }
      this.receiveRemote(remote)
    }, () => {
      if (generation === this.generation) {
        this.unsubDocument?.()
        this.unsubDocument = null
        this.publish('offline', 'Cloud-Updates sind vorübergehend nicht erreichbar.')
      }
    })
  }

  receiveRemote(remote) {
    if (!isRemoteData(remote)) {
      this.publish('error', 'Cloud-Daten haben ein unbekanntes Format. Lokale Daten bleiben erhalten.')
    } else if (dataHash(this.data) === dataHash(remote)) {
      this.remember(remote.revision, dataHash(remote))
      this.publish('ready')
    } else if (this.meta?.hash === dataHash(this.data)) {
      this.applyRemote(remote)
    } else {
      this.showConflict(remote)
    }
  }

  showConflict(remote) {
    this.clearTimer()
    this.conflict = remote
    this.publish('conflict', 'Gerät und Cloud enthalten unterschiedliche Änderungen.')
  }

  schedule() {
    if (!this.user || (this.status !== 'ready' && this.status !== 'pending')) return
    this.clearTimer()
    this.publish('pending')
    this.timer = window.setTimeout(() => this.write(dataHash(this.data), this.meta?.revision ?? null), 900)
  }

  async write(hash, expectedRevision) {
    if (this.writing || !this.user || !this.data) return
    const payload = {
      sessions: this.data.sessions,
      exerciseLibrary: this.data.exerciseLibrary,
      volleyballDays: this.data.volleyballDays,
      trainingPlans: this.data.trainingPlans ?? [],
      athleteProfile: this.data.athleteProfile ?? { bodyweightKg: '' },
    }
    if (!isAthleteData(payload)) {
      this.publish('error', 'Lokale Daten haben ein ungültiges Format. Bitte sichere sie als Datei.')
      return
    }
    if (new Blob([dataHash(payload)]).size > MAX_DOCUMENT_BYTES) {
      this.publish('error', 'Cloud-Speichergrenze erreicht. Bitte exportiere deine Daten.')
      return
    }
    const generation = this.generation
    const reference = this.reference
    this.writing = true
    this.publish('saving')
    const revision = crypto.randomUUID()
    let needsReconcile = false
    try {
      await runTransaction(firestore, async (transaction) => {
        const current = await transaction.get(reference)
        if ((current.exists() ? current.data().revision : null) !== expectedRevision) {
          throw new RevisionConflict('Cloud revision changed')
        }
        transaction.set(reference, {
          ...payload,
          schemaVersion: 2,
          revision,
          updatedAt: serverTimestamp(),
        })
      })
      if (generation !== this.generation) return
      this.remember(revision, hash)
      this.publish('ready')
      this.listen()
      if (dataHash(this.data) !== hash) this.schedule()
    } catch (error) {
      if (generation !== this.generation) return
      if (error instanceof RevisionConflict) {
        this.publish('loading')
        needsReconcile = true
      } else {
        this.publish('offline', 'Cloud-Speicherung fehlgeschlagen. Änderungen bleiben lokal.')
      }
    } finally {
      if (generation === this.generation) this.writing = false
      if (this.deferredSnapshot && generation === this.generation) {
        const remote = this.deferredSnapshot
        this.deferredSnapshot = null
        if (remote.revision !== this.meta?.revision) this.receiveRemote(remote)
      }
      if (needsReconcile && generation === this.generation) await this.reconcile(generation)
    }
  }

  async resolveConflict(choice) {
    if (!this.conflict) return
    const remote = this.conflict
    if (choice === 'cloud') {
      this.applyRemote(remote)
    } else if (choice === 'local') {
      this.conflict = null
      await this.write(dataHash(this.data), remote.revision)
    }
  }

  retry() {
    if (!this.user || this.status === 'conflict' || this.writing) return
    this.clearTimer()
    if (!this.authorized) {
      this.enterUser(this.user)
      return
    }
    this.publish('loading')
    this.reconcile()
  }
}
