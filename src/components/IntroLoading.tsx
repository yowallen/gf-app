import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMilestones } from '../data/milestones'
import { site } from '../data/site'

type IntroLoadingProps = Readonly<{
  /** Shared garden data finished syncing (or timed out). */
  dataReady: boolean
  onComplete: () => void
}>

export function IntroLoading({ dataReady, onComplete }: IntroLoadingProps) {
  const milestones = getMilestones()
  const [activeIndex, setActiveIndex] = useState(0)
  const [barsDone, setBarsDone] = useState(false)
  const [done, setDone] = useState(false)
  const completedRef = useRef(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (barsDone) return

    let cancelled = false
    let timer = 0
    // Once the shared garden data is in, fast-forward through remaining bars.
    const stepMs = dataReady ? 120 : 700

    const tick = () => {
      const nextIndex = indexRef.current + 1
      if (nextIndex < milestones.length) {
        indexRef.current = nextIndex
        setActiveIndex(nextIndex)
        timer = window.setTimeout(tick, stepMs)
      } else {
        timer = window.setTimeout(() => {
          if (!cancelled) setBarsDone(true)
        }, dataReady ? 150 : 500)
      }
    }

    timer = window.setTimeout(tick, stepMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [barsDone, dataReady, milestones.length])

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
            style={{ '--target': m.progress } as CSSProperties}
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
    </div>
  )
}
