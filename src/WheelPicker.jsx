import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './WheelPicker.css'

const ROW_HEIGHT = 44
const WINDOW_RADIUS = 36

export function WheelPicker({ label, selectedIndex, count, optionAt, onChangeIndex, className = '' }) {
  const viewport = useRef(null)
  const commitTimer = useRef(null)
  const indexRef = useRef(selectedIndex)
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const [windowCenter, setWindowCenter] = useState(selectedIndex)
  const start = Math.max(0, windowCenter - WINDOW_RADIUS)
  const end = Math.min(count, windowCenter + WINDOW_RADIUS + 1)

  useLayoutEffect(() => {
    if (!viewport.current || indexRef.current === selectedIndex && Math.abs(viewport.current.scrollTop - selectedIndex * ROW_HEIGHT) < 2) return
    indexRef.current = selectedIndex
    setActiveIndex(selectedIndex)
    setWindowCenter(selectedIndex)
    viewport.current.scrollTop = selectedIndex * ROW_HEIGHT
  }, [selectedIndex])

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  function commit(index) {
    window.clearTimeout(commitTimer.current)
    onChangeIndex(index)
  }

  function scroll() {
    const index = Math.max(0, Math.min(count - 1, Math.round(viewport.current.scrollTop / ROW_HEIGHT)))
    indexRef.current = index
    setActiveIndex(index)
    if (Math.abs(index - windowCenter) > WINDOW_RADIUS / 2) setWindowCenter(index)
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => {
      viewport.current.scrollTop = indexRef.current * ROW_HEIGHT
      commit(indexRef.current)
    }, 150)
  }

  function keyDown(event) {
    const delta = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[event.key]
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
      : delta === undefined ? null : Math.max(0, Math.min(count - 1, activeIndex + delta))
    if (next === null) return
    event.preventDefault()
    indexRef.current = next
    setActiveIndex(next)
    setWindowCenter(next)
    viewport.current.scrollTo({ top: next * ROW_HEIGHT, behavior: 'smooth' })
    commit(next)
  }

  return <div className={`value-wheel${className ? ` ${className}` : ''}`}>
    <div className="value-wheel-viewport" ref={viewport} role="spinbutton" tabIndex={0}
      aria-label={label} aria-valuetext={optionAt(activeIndex)?.label ?? ''}
      onScroll={scroll} onKeyDown={keyDown}>
      <div className="value-wheel-spacer" style={{ height: (start + 1) * ROW_HEIGHT }} aria-hidden="true" />
      {Array.from({ length: end - start }, (_, offset) => {
        const index = start + offset
        const distance = Math.abs(index - activeIndex)
        return <div key={index} className={`value-wheel-option${distance === 0 ? ' is-current' : ''}`}
          style={{ opacity: distance === 0 ? 1 : distance === 1 ? .48 : .22 }} aria-hidden="true">
          {optionAt(index)?.label}
        </div>
      })}
      <div className="value-wheel-spacer" style={{ height: (count - end + 1) * ROW_HEIGHT }} aria-hidden="true" />
    </div>
  </div>
}

function decimals(step) {
  const part = String(step).split('.')[1]
  return part ? part.length : 0
}

export function NumberWheel({ label, value, onChange, min = 0, max = 300, step = 1,
  allowEmpty = true, suggestion = '', className = '' }) {
  const precision = decimals(step)
  const numberValue = value === '' || value == null ? null : Number(value)
  const upper = Math.max(max, numberValue ?? min)
  const gridCount = Math.floor((upper - min) / step + 0.0000001) + 1
  const offset = allowEmpty ? 1 : 0
  const position = numberValue == null ? 0 : (numberValue - min) / step
  const onGrid = numberValue != null && Math.abs(position - Math.round(position)) < 0.0000001
  const special = numberValue != null && Number.isFinite(numberValue) && !onGrid
  const insertion = Math.max(0, Math.min(gridCount, Math.ceil(position)))
  const count = offset + gridCount + (special ? 1 : 0)
  const index = numberValue == null ? 0 : offset + (special ? insertion : Math.round(position))
  const optionAt = (positionIndex) => {
    if (allowEmpty && positionIndex === 0) return { value: '', label: '—' }
    const numericIndex = positionIndex - offset
    if (special && numericIndex === insertion) return {
      value: String(value), label: numberValue.toLocaleString('de-DE') }
    const gridIndex = numericIndex - (special && numericIndex > insertion ? 1 : 0)
    const number = Number((min + gridIndex * step).toFixed(precision))
    return { value: String(number), label: number.toLocaleString('de-DE', { maximumFractionDigits: precision }) }
  }
  return <div className={`number-wheel-field${className ? ` ${className}` : ''}`}>
    <span className="field-label">{label}</span>
    <WheelPicker label={label} selectedIndex={index} count={count}
      optionAt={optionAt} onChangeIndex={(positionIndex) => onChange(optionAt(positionIndex).value)} />
    {suggestion !== '' && suggestion != null && String(value ?? '') === '' &&
      <button type="button" className="text-button value-wheel-suggestion"
        onClick={() => onChange(String(suggestion))}>Letzten Wert übernehmen: {suggestion}</button>}
  </div>
}

export function ChoiceWheel({ label, value, options, onChange, className = '' }) {
  const normalized = options.map((item) => typeof item === 'string'
    ? { value: item, label: item } : item)
  const index = Math.max(0, normalized.findIndex((option) => option.value === value))
  return <div className={`choice-wheel-field${className ? ` ${className}` : ''}`}>
    <span className="field-label">{label}</span>
    <WheelPicker label={label} selectedIndex={index} count={normalized.length}
      optionAt={(position) => normalized[position]}
      onChangeIndex={(position) => onChange(normalized[position].value)} />
  </div>
}
