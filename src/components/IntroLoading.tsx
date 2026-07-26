import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMilestones } from '../data/milestones'
import { site } from '../data/site'

type IntroLoadingProps = {
  /** Shared garden data finished syncing (or timed out). */
  dataReady: boolean
  onComplete: () => void
}

export function IntroLoading({ dataReady, onComplete }: IntroLoadingProps) {
  const milestones = getMilestones()
  const [activeIndex, setActiveIndex] = useState(-1)
  const [barsDone, setBarsDone] = useState(false)
  const [done, setDone] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    let i = 0
    let cancelled = false
    const stepMs = 700
    setActiveIndex(0)

    const interval = window.setInterval(() => {
      i += 1
      if (i < milestones.length) {
        setActiveIndex(i)
      } else {
        window.clearInterval(interval)
        window.setTimeout(() => {
          if (!cancelled) setBarsDone(true)
        }, 500)
      }
    }, stepMs)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [milestones.length])

  useEffect(() => {
    if (!barsDone || !dataReady || completedRef.current) return
    completedRef.current = true
    setDone(true)
    const timer = window.setTimeout(onComplete, 700)
    return () => window.clearTimeout(timer)
  }, [barsDone, dataReady, onComplete])

  const waitingOnData = barsDone && !dataReady

  return (
    <div className={`intro${done ? ' is-done' : ''}`} aria-live="polite">
      <p className="intro__brand">{site.nickname}</p>
      <p className="intro__hint">
        {waitingOnData
          ? 'Almost ready — gathering our shared garden…'
          : 'Watering our little garden…'}
      </p>
      <div className="intro__bars">
        {milestones.map((m, index) => (
          <div
            key={m.id}
            className={`intro-bar${index <= activeIndex ? ' is-active' : ''}`}
            style={{ '--target': `${m.progress}%` } as CSSProperties}
          >
            <div className="intro-bar__label">
              <span>{m.label}</span>
              <span>{index <= activeIndex ? m.value : '…'}</span>
            </div>
            <div className="intro-bar__track">
              <div className="intro-bar__fill" />
            </div>
          </div>
        ))}
      </div>
      {waitingOnData ? (
        <p className="intro__sync" role="status">
          Loading meets, quizzes &amp; bucket list…
        </p>
      ) : null}
    </div>
  )
}
