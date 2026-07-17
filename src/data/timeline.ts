export type MeetDay = {
  id: string
  /** Meet calendar day as ISO date `YYYY-MM-DD` */
  date: string
  /** Short label for the hangout */
  title: string
  /** What happened / how it felt */
  description: string
  /** Optional compressed JPEG data URL stored in Firestore (free, no Storage) */
  image?: string
  addedBy: string
  createdAt: number
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  )
}

/** Pretty label for an ISO meet date */
export function formatMeetDate(iso: string): string {
  if (!isIsoDate(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Newest first, then by createdAt — fresh blooms sit at the top */
export function sortMeetDays(items: MeetDay[]): MeetDay[] {
  return [...items].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.createdAt - a.createdAt
  })
}
