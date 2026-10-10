import { registerSW } from 'virtual:pwa-register'

let updateAvailable = false

const updateSW = registerSW({
  onNeedRefresh() {
    updateAvailable = true
    window.dispatchEvent(new Event('beach-athlete-update-available'))
  },
})

export function isUpdateAvailable() {
  return updateAvailable
}

export function installUpdate() {
  return updateSW(true)
}
