import { trainingDayPerformances } from './calendarPerformance.js'
import { SCORED_TRAINING_CATEGORIES, changeStatus } from './trainingAggregation.js'

function indexedSeries(events) {
  if (!events.length) return []
  const baselineDate = events.flatMap((event) => event.exercises)
    .map((exercise) => exercise.previousDate).sort()[0]
  let index = 100
  const series = [{ date: baselineDate, value: index }]
  for (const event of events) {
    index *= 1 + event.changePercent / 100
    series.push({ date: event.date, value: index, changePercent: event.changePercent })
  }
  return series
}

function latestExercises(events) {
  const byId = new Map()
  for (const event of events) {
    for (const exercise of event.exercises) byId.set(exercise.libraryId, {
      ...exercise, date: event.date, status: changeStatus(exercise.changePercent),
    })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

function summary(events) {
  const last = events.at(-1)
  return { series: indexedSeries(events), changePercent: last?.changePercent ?? null,
    status: changeStatus(last?.changePercent), date: last?.date ?? null,
    exercises: latestExercises(events) }
}

export function trainingProgress(sessions) {
  const days = trainingDayPerformances(sessions)
  const overallEvents = []
  const categoryEvents = new Map(SCORED_TRAINING_CATEGORIES.map((name) => [name, []]))
  const groupEvents = new Map()
  for (const [date, day] of days) {
    if (day.status === 'unrated') continue
    overallEvents.push({ date, changePercent: day.groupedChangePercent,
      exercises: day.comparisons })
    for (const category of day.categories) {
      categoryEvents.get(category.name).push({ ...category, date })
      for (const group of category.groups) {
        if (!groupEvents.has(group.name)) groupEvents.set(group.name, [])
        groupEvents.get(group.name).push({ ...group, date })
      }
    }
  }
  const categories = SCORED_TRAINING_CATEGORIES.map((name) => {
    const events = categoryEvents.get(name)
    const groups = name === 'Krafttraining' ? [...groupEvents].map(([groupName, groupDays]) => ({
      name: groupName, ...summary(groupDays),
    })).sort((a, b) => a.name.localeCompare(b.name, 'de')) : []
    return { name, ...summary(events), groups }
  })
  return { overall: summary(overallEvents), categories }
}
