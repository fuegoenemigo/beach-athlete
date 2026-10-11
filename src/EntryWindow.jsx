import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './EntryWindow.css'

export default function EntryWindow({ title, subtitle, onClose, children }) {
  const titleRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const focusable = [...document.querySelectorAll('.entry-window button:not(:disabled), .entry-window input:not(:disabled), .entry-window select:not(:disabled), .entry-window textarea:not(:disabled), .entry-window summary')]
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
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus?.()
    }
  }, [])

  return createPortal(<div className="entry-window" role="dialog" aria-modal="true"
    aria-labelledby="entry-window-title">
    <div className="entry-window-panel">
      <header className="entry-window-header">
        <div><p className="eyebrow">{subtitle}</p>
          <h2 id="entry-window-title" tabIndex="-1" ref={titleRef}>{title}</h2></div>
        <button type="button" className="entry-window-close" aria-label="Eingabe schließen"
          onClick={onClose}>×</button>
      </header>
      <div className="entry-window-content">{children}</div>
    </div>
  </div>, document.body)
}
