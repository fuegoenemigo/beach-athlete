import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import UIIcon from './UIIcon.jsx'
import './EntryWindow.css'

let openWindowCount = 0
let savedBodyOverflow = ''
const topWindow = () => [...document.querySelectorAll('.entry-window')]
  .reduce((top, window) => !top || Number(window.style.zIndex) >= Number(top.style.zIndex) ? window : top, null)

export default function EntryWindow({ title, subtitle, onClose, children, layer = 0 }) {
  const titleId = useId()
  const titleRef = useRef(null)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const touchStart = useRef(null)
  const leaveTimer = useRef(null)
  const [exitDirection, setExitDirection] = useState(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  function isTopWindow() {
    return topWindow() === panelRef.current?.parentElement
  }

  function goBack(direction = 'right') {
    if (exitDirection || !isTopWindow()) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCloseRef.current()
      return
    }
    setExitDirection(direction)
    leaveTimer.current = window.setTimeout(() => onCloseRef.current(), 220)
  }

  useEffect(() => {
    const previousFocus = document.activeElement
    if (!openWindowCount) savedBodyOverflow = document.body.style.overflow
    openWindowCount += 1
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()
    const onKeyDown = (event) => {
      if (topWindow() !== panelRef.current?.parentElement) return
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current() }
      if (event.key === 'Tab') {
        const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]
          .filter((element) => element.getClientRects().length)
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(leaveTimer.current)
      openWindowCount -= 1
      if (!openWindowCount) document.body.style.overflow = savedBodyOverflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus?.()
    }
  }, [])

  function startSwipe(event) {
    touchStart.current = null
    if (event.touches.length !== 1 || event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], .home-calendar-month-viewport, .home-day-strip, .beach-calendar')) return
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function finishSwipe(event) {
    const start = touchStart.current
    touchStart.current = null
    if (!start || event.changedTouches.length !== 1 || !isTopWindow()) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) >= 85 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      event.preventDefault()
      goBack(dx < 0 ? 'left' : 'right')
    }
  }

  return createPortal(<div className={`entry-window${exitDirection ? ` is-leaving-${exitDirection}` : ''}`} role="dialog" aria-modal="true"
    style={{ zIndex: 1000 + layer }}
    aria-labelledby={titleId} onTouchStart={startSwipe} onTouchEnd={finishSwipe}>
    <div className="entry-window-panel" ref={panelRef}>
      <header className="entry-window-header">
        <button type="button" className="entry-window-back" aria-label="Zurück" onClick={() => goBack()}>
          <UIIcon name="back" />
        </button>
        <div><p className="eyebrow">{subtitle}</p>
          <h2 id={titleId} tabIndex="-1" ref={titleRef}>{title}</h2></div>
      </header>
      <div className="entry-window-content">{children}</div>
    </div>
  </div>, document.body)
}
