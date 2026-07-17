export type CountdownParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function parseAnniversaryDate(anniversaryDate: string): {
  year: number
  month: number
  day: number
} {
  const [year, month, day] = anniversaryDate.split('-').map(Number)
  return { year, month, day }
}

export function isAnniversaryDay(
  anniversaryDate: string,
  now: Date = new Date(),
): boolean {
  const { month, day } = parseAnniversaryDate(anniversaryDate)
  return now.getMonth() === month - 1 && now.getDate() === day
}

export function getNextAnniversaryTarget(
  anniversaryDate: string,
  now: Date = new Date(),
): Date {
  const { year, month, day } = parseAnniversaryDate(anniversaryDate)
  const anchor = new Date(year, month - 1, day)

  if (now < anchor) return anchor

  const thisYear = new Date(now.getFullYear(), month - 1, day)
  if (now < thisYear) return thisYear

  return new Date(now.getFullYear() + 1, month - 1, day)
}

export function getCountdownParts(
  target: Date,
  now: Date = new Date(),
): CountdownParts | null {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}
