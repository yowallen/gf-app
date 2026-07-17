import { useEffect, useState } from 'react'
import {
  getCountdownParts,
  getNextAnniversaryTarget,
  isAnniversaryDay,
  type CountdownParts,
} from '../lib/anniversary'
import { site } from '../data/site'

const UNITS: { key: keyof CountdownParts; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function AnniversaryCountdown() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (isAnniversaryDay(site.anniversaryDate, now)) {
    return (
      <div className="anniversary-countdown">
        <p className="anniversary-countdown__today">Happy anniversary today</p>
      </div>
    )
  }

  const target = getNextAnniversaryTarget(site.anniversaryDate, now)
  const parts = getCountdownParts(target, now)
  if (!parts) return null

  return (
    <div className="anniversary-countdown">
      <p className="anniversary-countdown__label">Until our next anniversary</p>
      <div className="anniversary-countdown__grid" aria-live="polite">
        {UNITS.map(({ key, label }) => (
          <div key={key} className="anniversary-countdown__unit">
            <span className="anniversary-countdown__value">
              {key === 'days' ? parts[key] : pad(parts[key])}
            </span>
            <span className="anniversary-countdown__name">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
