import { useEffect, useRef } from 'react'

/**
 * Repeatable scroll reveal. Adds `.is-visible` when the element enters the viewport,
 * removes it when it leaves — so the animation plays every time the user scrolls to it.
 * Respects `prefers-reduced-motion` via CSS (no JS branch needed).
 *
 * @param options IntersectionObserver options (threshold, rootMargin)
 * @returns ref to attach to the element you want to reveal
 */
export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          } else {
            entry.target.classList.remove('is-visible')
          }
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px', // trigger slightly before bottom edge
        ...options,
      }
    )

    observer.observe(el)

    // Handle elements already in viewport on mount (e.g., Hero section)
    // IntersectionObserver doesn't fire for already-visible elements synchronously
    const checkInitialVisibility = () => {
      const rect = el.getBoundingClientRect()
      const isInView = rect.top < window.innerHeight && rect.bottom > 0
      if (isInView) {
        el.classList.add('is-visible')
      }
    }
    // Run after paint to ensure layout is settled
    requestAnimationFrame(checkInitialVisibility)

    // Fallback: also check on next tick in case rAF runs too early
    setTimeout(checkInitialVisibility, 0)

    return () => observer.disconnect()
  }, [])

  return ref
}