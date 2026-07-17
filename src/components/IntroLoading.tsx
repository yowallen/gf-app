import { useEffect, useState, type CSSProperties } from 'react'
import { milestones } from '../data/milestones'
import { site } from '../data/site'

type IntroLoadingProps = {
  onComplete: () => void
}

export function IntroLoading({ onComplete }: IntroLoadingProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    let finished = false
    const stepMs = 700
    setActiveIndex(0)

    const interval = window.setInterval(() => {
      i += 1
      if (i < milestones.length) {
        setActiveIndex(i)
      } else {
        window.clearInterval(interval)
        window.setTimeout(() => {
          if (finished) return
          finished = true
          setDone(true)
          window.setTimeout(onComplete, 700)
        }, 500)
      }
    }, stepMs)

    return () => {
      finished = true
      window.clearInterval(interval)
    }
  }, [onComplete])

  return (
    <div className={`intro${done ? ' is-done' : ''}`} aria-live="polite">
      <p className="intro__brand">{site.nickname}</p>
      <p className="intro__hint">Watering our little garden…</p>
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
    </div>
  )
}
