import { useEffect, useRef, type CSSProperties } from 'react'
import { AnniversaryCountdown } from './AnniversaryCountdown'
import { getMilestones } from '../data/milestones'
import { site } from '../data/site'

export function Milestones() {
  const rootRef = useRef<HTMLElement>(null)
  const milestones = getMilestones()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const rows = root.querySelectorAll('.milestone-row')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        }
      },
      { threshold: 0.35 },
    )

    rows.forEach((row) => {
      observer.observe(row)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section className="section" id="milestones" ref={rootRef}>
      <p className="section__eyebrow">Growth rings</p>
      <h2 className="section__title">Milestones</h2>
      <p className="section__lead">
        Soft stats from the opening — quieter this time, for when you want to
        linger in the garden.
      </p>
      <div className="milestones-grid">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="milestone-row"
            style={{ '--target': `${m.progress}%` } as CSSProperties}
          >
            <div className="milestone-row__head">
              <span className="milestone-row__label">{m.label}</span>
              <span className="milestone-row__value">{m.value}</span>
            </div>
            <div className="milestone-row__track">
              <div className="milestone-row__fill" />
            </div>
          </div>
        ))}
      </div>
      <footer className="footer">
        <p>
          Made with care for <strong>{site.nickname}</strong>
        </p>
        <p>Anniversary · {site.anniversaryLabel}</p>
        <AnniversaryCountdown />
      </footer>
    </section>
  )
}
