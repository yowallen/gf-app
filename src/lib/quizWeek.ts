/** Monday-start week id as the Monday date `YYYY-MM-DD` (local time). */
export function getWeekId(now: Date = new Date()): string {
  const monday = getWeekStart(now)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekStart(now: Date = new Date()): Date {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  date.setDate(date.getDate() - day)
  return date
}

export function getNextWeekStart(now: Date = new Date()): Date {
  const next = getWeekStart(now)
  next.setDate(next.getDate() + 7)
  return next
}

export function getWeekEnd(now: Date = new Date()): Date {
  const end = getWeekStart(now)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function formatWeekLabel(weekId: string = getWeekId()): string {
  const [y, m, d] = weekId.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return `${startLabel} – ${endLabel}`
}

export function daysUntilNextWeek(now: Date = new Date()): number {
  const next = getNextWeekStart(now)
  const ms = next.getTime() - now.getTime()
  return Math.max(1, Math.ceil(ms / 86_400_000))
}
