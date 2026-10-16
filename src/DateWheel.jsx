import { useMemo } from 'react'
import { WheelPicker } from './WheelPicker.jsx'

const localDate = () => new Date().toLocaleDateString('sv-SE')
const monthLabel = (year, month) => new Date(year, month - 1, 1)
  .toLocaleDateString('de-DE', { month: 'short' })
const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

export default function DateWheel({ label = 'Datum', value, onChange, minYear = 1950, maxYear }) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : localDate()
  const [year, month, day] = date.split('-').map(Number)
  const firstYear = Math.min(minYear, year)
  const lastYear = Math.max(maxYear ?? new Date().getFullYear() + 5, year)
  const years = useMemo(() => Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index),
    [firstYear, lastYear])
  const count = daysInMonth(year, month)

  function choose(nextYear, nextMonth, nextDay) {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth))
    onChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`)
  }

  return <div className="date-wheel-field" role="group" aria-label={label}>
    <span className="field-label">{label}</span>
    <div className="date-wheel-columns">
      <WheelPicker label={`${label}: Tag`} selectedIndex={Math.min(day, count) - 1} count={count}
        optionAt={(index) => ({ label: String(index + 1) })}
        onChangeIndex={(index) => choose(year, month, index + 1)} />
      <WheelPicker label={`${label}: Monat`} selectedIndex={month - 1} count={12}
        optionAt={(index) => ({ label: monthLabel(year, index + 1) })}
        onChangeIndex={(index) => choose(year, index + 1, day)} />
      <WheelPicker label={`${label}: Jahr`} selectedIndex={year - firstYear} count={years.length}
        optionAt={(index) => ({ label: String(years[index]) })}
        onChangeIndex={(index) => choose(years[index], month, day)} />
    </div>
  </div>
}
