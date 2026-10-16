import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { datesInMonth } from './homeSummary.js'
import UIIcon from './UIIcon.jsx'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const format = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', options)

function shiftMonth(month, offset) {
  const [year, number] = month.split('-').map(Number)
  const next = new Date(year, number - 1 + offset, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function MonthGrid({ month, today, selectedDate, onSelect }) {
  const dates = useMemo(() => datesInMonth(month), [month])
  const [year, number] = month.split('-').map(Number)
  const leading = (new Date(year, number - 1, 1).getDay() + 6) % 7
  const trailing = (7 - (leading + dates.length) % 7) % 7

  return <div className="home-inline-month" role="group" aria-label={format(`${month}-01`, { month: 'long', year: 'numeric' })}>
    {weekdays.map((day) => <span className="home-inline-weekday" key={day}>{day}</span>)}
    {Array.from({ length: leading }, (_, index) => <span key={`before-${index}`} aria-hidden="true" />)}
    {dates.map((date) => <button type="button" key={date}
      className={`home-inline-day${date === selectedDate ? ' is-selected' : ''}${date === today ? ' is-today' : ''}`}
      aria-label={format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      aria-pressed={date === selectedDate} aria-current={date === today ? 'date' : undefined}
      onClick={() => onSelect(date)}>{Number(date.slice(-2))}</button>)}
    {Array.from({ length: trailing }, (_, index) => <span key={`after-${index}`} aria-hidden="true" />)}
  </div>
}

function DayStrip({ month, today, selectedDate, entryDates, onSelect }) {
  const dates = useMemo(() => datesInMonth(month), [month])
  const initialIndex = Math.max(0, dates.indexOf(selectedDate))
  const [position, setPosition] = useState(initialIndex)
  const viewport = useRef(null)
  const activeIndex = useRef(initialIndex)
  const aligned = useRef(false)

  useLayoutEffect(() => {
    const element = viewport.current
    const target = Math.max(0, dates.indexOf(selectedDate))
    const align = () => element.scrollTo({ left: activeIndex.current * element.clientWidth / 5, behavior: 'instant' })
    if (!aligned.current || activeIndex.current !== target) {
      aligned.current = true
      activeIndex.current = target
      setPosition(target)
      align()
    }
    const observer = new ResizeObserver(align)
    observer.observe(element)
    return () => observer.disconnect()
  }, [dates, selectedDate])

  function readScroll() {
    const element = viewport.current
    const nextPosition = Math.max(0, Math.min(dates.length - 1, element.scrollLeft / (element.clientWidth / 5)))
    const index = Math.round(nextPosition)
    setPosition(Math.abs(nextPosition - index) < .025 ? index : nextPosition)
    if (activeIndex.current !== index) {
      activeIndex.current = index
      onSelect(dates[index])
    }
  }

  function select(index, focus = false) {
    const next = Math.max(0, Math.min(dates.length - 1, index))
    const element = viewport.current
    activeIndex.current = next
    element.scrollTo({ left: next * element.clientWidth / 5,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
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

  return <div className="home-day-strip" ref={viewport} onScroll={readScroll} onKeyDown={keyDown}
    aria-label="Kalender mit fünf sichtbaren Tagen">
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
        </button>
        <i className={`home-date-indicator${entryDates.has(date) ? ' has-entries' : ''}`}
          style={{ opacity }} aria-hidden="true" />
      </div>
    })}
    <span className="home-date-spacer" aria-hidden="true" />
  </div>
}

export default function HomeDayStrip({ today, selectedDate, entryDates, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(today.slice(0, 7))
  const [phase, setPhase] = useState('')
  const foldTimer = useRef(null)
  const unfoldTimer = useRef(null)
  const swipeStart = useRef(null)
  useEffect(() => () => {
    window.clearTimeout(foldTimer.current)
    window.clearTimeout(unfoldTimer.current)
  }, [])

  function toggleMonth() {
    if (phase) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!expanded) setVisibleMonth(selectedDate.slice(0, 7))
      setExpanded(!expanded)
      return
    }
    setPhase('folding')
    foldTimer.current = window.setTimeout(() => {
      if (!expanded) setVisibleMonth(selectedDate.slice(0, 7))
      setExpanded(!expanded)
      setPhase('unfolding')
      unfoldTimer.current = window.setTimeout(() => setPhase(''), 380)
    }, 170)
  }

  function returnToday() {
    setVisibleMonth(today.slice(0, 7))
    onSelect(today)
  }

  function finishSwipe(event) {
    if (!expanded || !swipeStart.current || event.changedTouches.length !== 1) return
    const dx = event.changedTouches[0].clientX - swipeStart.current.x
    const dy = event.changedTouches[0].clientY - swipeStart.current.y
    swipeStart.current = null
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      setVisibleMonth((month) => shiftMonth(month, dx < 0 ? 1 : -1))
    }
  }

  const displayMonth = expanded ? visibleMonth : selectedDate.slice(0, 7)
  return <section className={`home-five-days${expanded ? ' is-month-view' : ''}`} aria-label="Kalender">
    <div className="home-five-days-heading">
      <button type="button" className="home-month-pill" onClick={toggleMonth}
        aria-expanded={expanded} aria-controls="home-calendar-stage"
        aria-label={expanded ? 'Monatsansicht schließen' : 'Monatsansicht öffnen'}>
        {format(`${displayMonth}-01`, { month: 'long' })}<UIIcon name="down" />
      </button>
      <div className="home-date-controls">
        {expanded && <div className="home-month-switch" aria-label="Monat wechseln">
          <button type="button" aria-label="Vorheriger Monat" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}>‹</button>
          <span>{displayMonth.slice(0, 4)}</span>
          <button type="button" aria-label="Nächster Monat" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}>›</button>
        </div>}
        {(selectedDate !== today || expanded && displayMonth !== today.slice(0, 7)) &&
          <button type="button" className="home-today-link" onClick={returnToday}
            aria-label="Zu heute springen">Heute</button>}
      </div>
    </div>
    <div id="home-calendar-stage" className={`home-calendar-stage${phase ? ` is-${phase}` : ''}${expanded ? ' is-expanded' : ''}`}
      onTouchStart={(event) => { swipeStart.current = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null }}
      onTouchEnd={finishSwipe} onTouchCancel={() => { swipeStart.current = null }}>
      {expanded ? <MonthGrid month={displayMonth} today={today} selectedDate={selectedDate} onSelect={onSelect} />
        : <DayStrip key={displayMonth} month={displayMonth} today={today} selectedDate={selectedDate}
          entryDates={entryDates} onSelect={onSelect} />}
    </div>
  </section>
}
