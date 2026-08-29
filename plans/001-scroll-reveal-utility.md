---
title: Add Generic Scroll-Reveal Utility
repo: girlfriend-app
commit: 9cfb2b8
created: 2026-08-29
status: done
---

## Summary

Add a reusable scroll-reveal system (CSS utility classes + React hook) so any section can fade/slide in on scroll. Currently only Timeline and Milestones have scroll animations (via inline `IntersectionObserver`). This plan makes it a drop-in utility used across Hero, Quiz, MemeCorner, DateIdeas, BucketList, and future sections.

---

## Files to Create

### 1. `src/hooks/useScrollReveal.ts` (NEW)
```tsx
import { useEffect, useRef } from 'react'

/**
 * One-shot scroll reveal. Adds `.is-visible` when the element enters the viewport.
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
            observer.unobserve(entry.target) // one-shot: animate once
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
    return () => observer.disconnect()
  }, [])

  return ref
}
```

---

## Files to Modify

### 2. `src/styles/theme.css` — Add after line ~38 (end of `:root` token block) or before `.section` styles (~line 100)

**Exact insertion point**: After the `--dur-pop` token line (line 37) and before `*, *::before, *::after` (line 65), OR after the reduced-motion block (line 88) and before `body` (line 90). Either works — choose where motion tokens live.

```css
/* —— Scroll Reveal Utility —— */
/* Single-element reveal */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity var(--dur-pop) var(--ease),
              transform var(--dur-pop) var(--ease);
  will-change: opacity, transform;
}

.reveal.is-visible {
  opacity: 1;
  transform: none;
}

/* Staggered children reveal (for grids/lists) */
.reveal-stagger > * {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity var(--dur-pop) var(--ease),
              transform var(--dur-pop) var(--ease);
  will-change: opacity, transform;
}

.reveal-stagger.is-visible > * {
  opacity: 1;
  transform: none;
}

/* Stagger delays — 60ms steps, max 6 shown; extra children get last delay */
.reveal-stagger.is-visible > *:nth-child(1)  { transition-delay: 0ms; }
.reveal-stagger.is-visible > *:nth-child(2)  { transition-delay: 60ms; }
.reveal-stagger.is-visible > *:nth-child(3)  { transition-delay: 120ms; }
.reveal-stagger.is-visible > *:nth-child(4)  { transition-delay: 180ms; }
.reveal-stagger.is-visible > *:nth-child(5)  { transition-delay: 240ms; }
.reveal-stagger.is-visible > *:nth-child(6)  { transition-delay: 300ms; }
.reveal-stagger.is-visible > *:nth-child(n+7) { transition-delay: 300ms; }

/* Reduced motion: instant, no transform */
@media (prefers-reduced-motion: reduce) {
  .reveal,
  .reveal-stagger > * {
    transition-duration: 0.01ms !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

### 3. `src/components/Hero.tsx` — Apply reveal to section

**Current** (lines 1–approx 60):
```tsx
export function Hero() {
  // ...
  return (
    <section className="section hero" id="hero">
      {/* content */}
    </section>
  )
}
```

**Change**: Import hook, add ref, add `reveal` class
```tsx
import { useScrollReveal } from '../hooks/useScrollReveal'

export function Hero() {
  const heroRef = useScrollReveal()
  // ...
  return (
    <section className="section hero reveal" id="hero" ref={heroRef}>
      {/* content */}
    </section>
  )
}
```

---

### 4. `src/components/Quiz.tsx` — Apply reveal to section

**Current**: `<section className="section" id="quiz">` (around line 814)

**Change**:
```tsx
import { useScrollReveal } from '../hooks/useScrollReveal'

// Inside component:
const quizRef = useScrollReveal()

// In JSX:
<section className="section reveal" id="quiz" ref={quizRef}>
```

---

### 5. `src/components/MemeCorner.tsx` — Apply **staggered** reveal to grid

**Current**: `<section className="section" id="memes">` (line 13) with grid inside

**Change**:
```tsx
import { useScrollReveal } from '../hooks/useScrollReveal'

export function MemeCorner() {
  const memesRef = useScrollReveal()
  // ...
  return (
    <section className="section reveal-stagger" id="memes" ref={memesRef}>
      <ul className="meme-grid">
        {memes.map((meme) => (
          <li key={meme.id} className="meme-card">
            {/* card content */}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

---

### 6. `src/components/DateIdeas.tsx` — Apply reveal to section

**Current**: `<section className="section" id="dates">` (line 314)

**Change**:
```tsx
import { useScrollReveal } from '../hooks/useScrollReveal'

export function DateIdeas({ addedBy }) {
  const datesRef = useScrollReveal()
  // ...
  return (
    <section className="section reveal" id="dates" ref={datesRef}>
      {/* content */}
    </section>
  )
}
```

---

### 7. `src/components/BucketList.tsx` — Apply reveal to section

**Current**: `<section className="section" id="bucket">` (line 48)

**Change**:
```tsx
import { useScrollReveal } from '../hooks/useScrollReveal'

export function BucketList({ addedBy }) {
  const bucketRef = useScrollReveal()
  // ...
  return (
    <section className="section reveal" id="bucket" ref={bucketRef}>
      {/* content */}
    </section>
  )
}
```

---

## Files NOT to Modify

- `src/components/Milestones.tsx` — Already has its own `IntersectionObserver` for progress bars (different animation). Leave as-is.
- `src/components/PhotoTimeline.tsx` / `GrowingFlower.tsx` — Timeline items use existing `.timeline__item.is-visible` pattern. Leave as-is.
- `src/components/GuestApp.tsx`, `GuestGarden.tsx`, `GuestAlbum.tsx` — Guest views are modal/tabbed, not scroll sections.

---

## Verification

### Automated (CI)
- TypeScript compiles: `npm run build`
- No new ESLint errors

### Manual Feel-Check (required)
1. **Open dev server**: `npm run dev`
2. **Slow-motion test**: DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → verify animations **disable instantly** (no fade, no slide)
3. **Normal motion**: Scroll down page — each section should:
   - **Hero, Quiz, DateIdeas, BucketList**: Fade up smoothly (16px → 0, 0.45s, `--ease`)
   - **MemeCorner**: Grid items stagger in (60ms steps, max 6 visible staggered)
4. **Frame-by-frame**: DevTools → Animations tab → scrub — verify:
   - No layout thrashing (only `opacity` + `transform`)
   - `will-change` present during transition
   - `transform: translateY(...)` not `top/margin`
5. **Mobile**: Test on real device or device toolbar — scroll performance should be 60fps (no jank)
6. **First load**: Sections below fold should be invisible until scrolled to (no flash)

---

## Scope Boundaries

- **In scope**: CSS utility + hook + applying to 5 sections (Hero, Quiz, MemeCorner, DateIdeas, BucketList)
- **Out of scope**: Milestones (custom bar animation), Timeline (existing), Guest views, LoveLetter (floating button), Nav (sticky)

---

## Dependencies

- None. Uses existing tokens: `--dur-pop` (0.45s), `--ease` (cubic-bezier(0.22, 1, 0.36, 1)), `prefers-reduced-motion` media query.

---

## Rollback

If issues arise:
1. Revert `theme.css` additions
2. Delete `useScrollReveal.ts`
3. Remove imports + refs + classes from 5 components