import { site } from './site'

export type Milestone = {
  id: string
  label: string
  /** Display value shown after the bar fills */
  value: string
  /** 0–100 target fill for the whimsical progress bar */
  progress: number
}

/** Full calendar months elapsed since the met date (local time). */
export function monthsSinceMet(
  metDate: string = site.metDate,
  now: Date = new Date(),
): number {
  const [year, month, day] = metDate.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  if (Number.isNaN(start.getTime()) || now < start) return 0

  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())

  if (now.getDate() < start.getDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

export function formatMonthsTogether(months: number): string {
  if (months <= 0) return 'Just beginning'
  if (months === 1) return '1 month'
  return `${months} months`
}

/** 50 years = golden anniversary */
const GOLDEN_ANNIVERSARY_MONTHS = 600

function monthsProgress(months: number): number {
  // Fill toward 600 months (50 years / golden anniversary).
  if (months <= 0) return 1
  return Math.min(
    100,
    Math.round((months / GOLDEN_ANNIVERSARY_MONTHS) * 100),
  )
}

export function getMilestones(now: Date = new Date()): Milestone[] {
  const months = monthsSinceMet(site.metDate, now)

  return [
    {
      id: 'm1',
      label: 'Months together',
      value: formatMonthsTogether(months),
      progress: monthsProgress(months),
    },
    {
      id: 'm2',
      label: 'Inside jokes',
      value: 'Too many to list',
      progress: 88,
    },
    {
      id: 'm3',
      label: 'Adventures logged',
      value: 'Still unlocking',
      progress: 74,
    },
    {
      id: 'm4',
      label: 'Shared playlists',
      value: 'On repeat',
      progress: 81,
    },
    {
      id: 'm5',
      label: 'Photos of us',
      value: 'Never enough',
      progress: 96,
    },
  ]
}

/** @deprecated Prefer getMilestones() so months stay current */
export const milestones: Milestone[] = getMilestones()
