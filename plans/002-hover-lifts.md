# 002 — Gate hover lifts behind (hover: hover) and drop the dead shadow transition

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: MEDIUM
- **Category**: Accessibility / Performance
- **Estimated scope**: 1 file (`src/styles/theme.css`), 3 rules

## Problem

Two hover rules apply transform *lifts* without a pointer-capability gate. On
touch devices, taps fire `:hover` and the lift sticks after the tap:

```css
/* src/styles/theme.css ≈175 — .btn:hover changes background AND lifts */
.btn:hover {
  background: var(--primary-deep);
  transform: translateY(-1px);
}
```

```css
/* src/styles/theme.css ≈2474 — .meme-card also transitions box-shadow even
   though no rule ever changes box-shadow on this element (dead weight that
   would force a repaint if it ever retargeted mid-hover) */
.meme-card {
  /* … */
  transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
}

.meme-card:hover {
  transform: translateY(-3px);
}
```

(The third audited site, `.timeline__photo:hover`, is dead CSS — plan 006
removes it. Do not touch it here.)

## Target

Split `.btn:hover` so only the color change is ungated, and move both lifts
into a pointer-gated media query. Final state of the three regions:

```css
.btn:hover {
  background: var(--primary-deep);
}

.btn:active {
  transform: translateY(0) scale(0.98);
  /* Engage fast, settle gently */
  transition-duration: 0.1s;
}
```

(`.btn:active` already exists exactly as shown above — leave it untouched.)

```css
@media (hover: hover) and (pointer: fine) {
  .btn:hover {
    transform: translateY(-1px);
  }

  .meme-card:hover {
    transform: translateY(-3px);
  }
}
```

```css
.meme-card {
  /* …existing properties unchanged… */
  transition: transform 0.25s var(--ease);
}
```

Place the new `@media (hover: hover)` block immediately after the existing
`.meme-card:hover` rule's original location (i.e., replace the old
`.btn:hover` and `.meme-card:hover` rules as shown, and add one shared media
block — its position in the file may be right after the meme-card rules).

## Repo conventions to follow

- Media queries are written inline next to the rules they modify (exemplar:
  the touch-target and `prefers-reduced-transparency` blocks already in
  `src/styles/theme.css`). Match that style; no separate file.
- Keep using `var(--ease)` for transforms.

## Steps

1. In `.btn:hover`, delete the `transform: translateY(-1px);` line.
2. In `.meme-card`, change the transition declaration to
   `transition: transform 0.25s var(--ease);`.
3. Delete the standalone `.meme-card:hover { … }` rule.
4. Add the combined `@media (hover: hover) and (pointer: fine) { … }` block
   from the Target section containing both lift declarations.

## Boundaries

- Do NOT touch color/background-only hovers (chips, nav links, tabs, album
  buttons) — they are harmless on touch.
- Do NOT touch `:active` press feedback — that must keep working on touch.
- Do NOT touch `.timeline__photo` or any `.timeline__*` selector.
- If `.btn:active` does not match the excerpt above, STOP and report.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged (2 pre-existing
  useQuizBank errors).
- **Feel check** (desktop): buttons still lift 1px on hover; meme cards still
  float 3px.
- **Feel check** (touch emulation, DevTools device toolbar): tapping a button
  or meme card leaves NO stuck lifted state after release; background/press
  feedback still fires via `:active`.
- **Done when**: `grep -n "translateY(-1px)\|translateY(-3px)"
  src/styles/theme.css` shows both occurrences inside the same
  `(hover: hover)` media block.
