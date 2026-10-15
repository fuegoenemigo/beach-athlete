import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { datesInMonth } from './homeSummary.js'
import UIIcon from './UIIcon.jsx'

const format = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', options)

export default function HomeDayStrip({ today, selectedDate, entryDates, onSelect, onOpenCalendar }) {
  const month = today.slice(0, 7)
  const dates = useMemo(() => datesInMonth(month), [month])
  const initialIndex = Number(today.slice(-2)) - 1
  const [position, setPosition] = useState(initialIndex)
  const viewport = useRef(null)
  const hapticSwitch = useRef(null)
  const activeIndex = useRef(initialIndex)
  const scrollGesture = useRef(false)
  const touchStart = useRef(null)
  const settleTimer = useRef(null)
  const lastTick = useRef(-Infinity)

  // The padding slots let even the first and last day settle in the middle.
  useLayoutEffect(() => {
    const element = viewport.current
    activeIndex.current = Number(today.slice(-2)) - 1
    const align = () => {
      scrollGesture.current = false
      element.scrollTo({ left: activeIndex.current * element.clientWidth / 5, behavior: 'instant' })
    }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(element)
    return () => { observer.disconnect(); window.clearTimeout(settleTimer.current) }
  }, [today])

  function tick(directGesture = false) {
    if (performance.now() - lastTick.current < 65) return
    // Safari has no Vibration API. Its switch feedback needs a direct user gesture;
    // it cannot be promised during momentum scrolling. No focus or stored data changes.
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(6)
        lastTick.current = performance.now()
      } else if (directGesture && hapticSwitch.current && 'switch' in hapticSwitch.current) {
        hapticSwitch.current.click()
        lastTick.current = performance.now()
      }
    } catch { /* Haptics are optional; selecting a day always remains available. */ }
  }

  function readScroll() {
    const element = viewport.current
    const nextPosition = Math.max(0, Math.min(dates.length - 1, element.scrollLeft / (element.clientWidth / 5)))
    const index = Math.round(nextPosition)
    setPosition(Math.abs(nextPosition - index) < .025 ? index : nextPosition)
    if (activeIndex.current !== index) {
      activeIndex.current = index
      onSelect(dates[index])
      if (scrollGesture.current) tick()
    }
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => { scrollGesture.current = false }, 180)
  }

  function select(index, focus = false) {
    const next = Math.max(0, Math.min(dates.length - 1, index))
    if (next !== activeIndex.current) tick(true)
    scrollGesture.current = false
    const element = viewport.current
    element.scrollTo({ left: next * element.clientWidth / 5,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    // Selection also works when the viewport is already at this date.
    onSelect(dates[next])
    if (focus) element.querySelectorAll('button')[next]?.focus({ preventScroll: true })
  }

  function keyDown(event) {
    const index = activeIndex.current
    const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: dates.length - 1 }[event.key]
    if (target === undefined) return
    event.preventDefault()
    select(target, true)
  }

  return <section className="home-five-days" aria-label="Kalender mit fünf sichtbaren Tagen">
    <div className="home-five-days-heading">
      <button type="button" className="home-month-pill" onClick={onOpenCalendar}
        aria-label="Monatskalender öffnen">{format(today, { month: 'long' })}<UIIcon name="down" /></button>
      <div className="home-date-controls">
        {selectedDate !== today && <button type="button" className="home-today-link"
          onClick={() => select(initialIndex)}>Heute</button>}
        <button type="button" className="home-date-arrow is-previous" aria-label="Vorheriger Tag"
          disabled={selectedDate === dates[0]} onClick={() => select(activeIndex.current - 1)}><UIIcon name="chevron" /></button>
        <button type="button" className="home-date-arrow" aria-label="Nächster Tag"
          disabled={selectedDate === dates.at(-1)} onClick={() => select(activeIndex.current + 1)}><UIIcon name="chevron" /></button>
      </div>
    </div>
    <div className="home-day-strip" ref={viewport} onScroll={readScroll} onKeyDown={keyDown}
      onWheel={() => { scrollGesture.current = true }}
      onTouchStart={(event) => {
        if (event.touches.length !== 1) { touchStart.current = null; return }
        scrollGesture.current = true
        touchStart.current = { x: event.touches[0].clientX, index: activeIndex.current }
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        touchStart.current = null
        if (start && event.changedTouches.length === 1
          && Math.abs(event.changedTouches[0].clientX - start.x) > 12
          && start.index !== activeIndex.current) tick(true)
      }}
      onTouchCancel={() => { touchStart.current = null; scrollGesture.current = false }}>
      <span className="home-date-spacer" aria-hidden="true" />
      {dates.map((date, index) => {
        const distance = Math.min(2, Math.abs(index - position))
        const opacity = distance <= 1 ? 1 - distance * .35 : .65 - (distance - 1) * .3
        return <div className="home-date-slot" key={date}>
          <button type="button" className={`home-date${date === selectedDate ? ' is-selected' : ''}`}
            style={{ opacity }} tabIndex={date === selectedDate ? 0 : -1}
            aria-pressed={date === selectedDate} aria-current={date === today ? 'date' : undefined}
            aria-label={`${format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${entryDates.has(date) ? ', mit Einträgen' : ''}`}
            onClick={() => select(index)}>
            <span>{format(date, { weekday: 'short' }).replace('.', '')}</span>
            <strong>{Number(date.slice(-2))}</strong>
            <i className={entryDates.has(date) ? 'has-entries' : ''} aria-hidden="true" />
          </button>
        </div>
      })}
      <span className="home-date-spacer" aria-hidden="true" />
    </div>
    <input ref={hapticSwitch} type="checkbox" switch="" className="home-haptic-switch"
      tabIndex={-1} aria-hidden="true" />
  </section>
}
