import { useEffect, useId, useRef, useState } from 'react'
import { loveLetter } from '../data/loveLetter'
import { site } from '../data/site'
import type { GateActor } from '../hooks/useGateAuth'

type LoveLetterProps = {
  actor: GateActor
}

export function LoveLetter({ actor }: LoveLetterProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const isHer = actor.role === 'her'
  const name = site.nickname

  // Native <dialog>: focus trap, Esc-to-close, and focus restore included.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  if (!isHer) return null

  function openLetter() {
    setIsOpen(true)
  }

  function closeLetter() {
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="love-envelope-float"
        onClick={openLetter}
        aria-label={`Open a letter from ${loveLetter.fromName}`}
      >
        <span className="love-envelope-float__glow" aria-hidden="true" />
        <span className="love-envelope" aria-hidden="true">
          <span className="love-envelope__flap" />
          <span className="love-envelope__body" />
          <span className="love-envelope__heart">♥</span>
          <span className="love-envelope__sparkle love-envelope__sparkle--1">
            ✦
          </span>
          <span className="love-envelope__sparkle love-envelope__sparkle--2">
            ✧
          </span>
        </span>
        <span className="love-envelope-float__label">For you ♡</span>
      </button>

      <dialog
        ref={dialogRef}
        className="love-letter-overlay"
        aria-labelledby={titleId}
        onClose={closeLetter}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
      >
        <div className="love-letter">
          <div className="love-letter__seal" aria-hidden="true">
            ♥
          </div>

          <div className="love-letter__paper">
            <p className="love-letter__from">A note for {name}</p>
            <h2 id={titleId} className="love-letter__title">
              My dearest {name} ♡
            </h2>

            <div className="love-letter__body">
              {loveLetter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="love-letter__signoff">
                {loveLetter.signoff}
                <br />
                <span>
                  {loveLetter.fromName} ✿
                </span>
              </p>
            </div>

            <div className="love-letter__decor" aria-hidden="true">
              <span>❀</span>
              <span>♡</span>
              <span>❀</span>
            </div>
          </div>

          <button
            type="button"
            className="love-letter__close"
            onClick={closeLetter}
          >
            Tuck it away ♡
          </button>
        </div>
      </dialog>
    </>
  )
}
