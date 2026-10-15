// One place for tactile feedback from user-driven scrolling throughout the app.
// Browsers with the Vibration API can pulse while content moves. Safari only
// exposes switch haptics during a direct user gesture, so it can pulse on release.
export function installScrollHaptics() {
  const feedbackSwitch = document.createElement('input')
  feedbackSwitch.type = 'checkbox'
  feedbackSwitch.setAttribute('switch', '')
  feedbackSwitch.className = 'app-haptic-switch'
  feedbackSwitch.tabIndex = -1
  feedbackSwitch.setAttribute('aria-hidden', 'true')
  document.body.append(feedbackSwitch)

  const offsets = new WeakMap()
  let touch = null
  let gestureUntil = 0
  let lastPulse = -Infinity

  function pulse(directGesture) {
    const now = performance.now()
    if (now - lastPulse < 90) return
    try {
      if (typeof navigator.vibrate === 'function' && navigator.vibrate(7)) {
        lastPulse = now
      } else if (directGesture) {
        // Safari 18+ can provide switch feedback from a synchronous touchend.
        // A scroll event or timer does not carry the necessary user activation.
        feedbackSwitch.click()
        lastPulse = now
      }
    } catch { /* Scrolling always works when the device offers no haptics. */ }
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1) { touch = null; return }
    const point = event.touches[0]
    touch = { x: point.clientX, y: point.clientY, moved: false }
  }

  function onTouchMove(event) {
    if (!touch || event.touches.length !== 1) return
    const point = event.touches[0]
    if (Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 12) {
      touch.moved = true
      gestureUntil = performance.now() + 600
    }
  }

  function onTouchEnd(event) {
    if (touch?.moved && event.changedTouches.length === 1) pulse(true)
    touch = null
  }

  function onTouchCancel() { touch = null }

  function onScroll(event) {
    const now = performance.now()
    if (now > gestureUntil && !touch?.moved) return
    const element = event.target === document ? document.scrollingElement : event.target
    if (!element || typeof element.scrollTop !== 'number') return
    const current = { x: element.scrollLeft, y: element.scrollTop }
    const previous = offsets.get(element)
    if (!previous || Math.hypot(current.x - previous.x, current.y - previous.y) >= 32) {
      offsets.set(element, current)
      pulse(false)
    }
  }

  function onWheel() { gestureUntil = performance.now() + 400 }
  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
      gestureUntil = performance.now() + 400
    }
  }

  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true })
  document.addEventListener('scroll', onScroll, true)
  document.addEventListener('wheel', onWheel, { capture: true, passive: true })
  document.addEventListener('keydown', onKeyDown, true)

  return () => {
    document.removeEventListener('touchstart', onTouchStart, true)
    document.removeEventListener('touchmove', onTouchMove, true)
    document.removeEventListener('touchend', onTouchEnd, true)
    document.removeEventListener('touchcancel', onTouchCancel, true)
    document.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('wheel', onWheel, true)
    document.removeEventListener('keydown', onKeyDown, true)
    feedbackSwitch.remove()
  }
}
