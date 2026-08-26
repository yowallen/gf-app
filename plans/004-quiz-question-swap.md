# 004 — Animate the quiz question swap

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: MEDIUM (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (`src/components/Quiz.tsx`, `src/styles/theme.css`)

## Problem

Answering a question hard-cuts to the next one — prompt and options teleport.
This is the highest-frequency state change in the app and the only major seam
with no motion:

```tsx
/* src/components/Quiz.tsx ≈431 — QuizPlayingView's root */
  return (
    <div className="quiz-card">
      <div className="quiz-playing-head">
```

```css
/* src/styles/theme.css ≈1933 — .quiz-card has no entrance of its own */
.quiz-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(var(--primary-deep-rgb), 0.06);
}
```

## Target

The card remounts per question (`key={current.id}`) and plays a short
rise-and-fade on entry. Enter-only is deliberate — the old card vanishes
instantly, the new one rises in; that matches the app's existing `resultPop`
pattern and avoids exit-animation machinery.

```tsx
<div className="quiz-card" key={current.id}>
```

```css
.quiz-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(var(--primary-deep-rgb), 0.06);
  animation: questionIn var(--dur-fast) var(--ease) both;
}

@keyframes questionIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
```

If `--dur-fast` does not exist yet (plan 001 not applied), use `0.15s` as a
literal instead.

## Repo conventions to follow

- Entrance keyframes are opacity + small translate with `var(--ease)` and
  `both` fill — exemplar: `stemItemIn` / `resultPop` in
  `src/styles/theme.css`.
- Per-item React remount via `key` is already used for list children across
  the app.

## Steps

1. In `src/components/Quiz.tsx`, find `function QuizPlayingView` and its
   `return (<div className="quiz-card">`. Add `key={current.id}` to that div.
   `current` is already in scope there (the component reads `current.prompt`
   and `current.id`).
2. In `src/styles/theme.css`, add the `animation:` line inside `.quiz-card`
   (keep all existing declarations).
3. Add the `questionIn` keyframes directly after the `.quiz-card` rule.

## Boundaries

- Do NOT touch `quiz-results`, `resultPop`, the timer bar, or option buttons.
- Do NOT add exit animations or new dependencies.
- Do NOT restructure JSX beyond adding the `key` attribute.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged (2 pre-existing).
- **Feel check**: start any quiz and answer three questions quickly:
  - each new question rises ~8px and fades in over ~150ms — no double-exposure,
    no flash of empty card;
  - answering fast (spam-tap options) never stacks animations — each press
    swaps immediately;
  - the timer bar restarts full-width on each new question (it remounts with
    the card — expected and correct).
- In DevTools Animations panel at 10% speed, confirm the motion starts from
  opacity 0 / +8px, not from scale(0).
- Toggle `prefers-reduced-motion` and confirm the swap becomes an instant cut.
- **Done when**: playing a quiz shows a gentle rise on every question change
  and none on anything else.
