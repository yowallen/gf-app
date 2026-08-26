# 003 — Consolidate the two ambient bob keyframes into one parameterized loop

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file (`src/styles/theme.css`), 2 keyframe sets → 1

## Problem

Two decorative floating elements each carry a private, near-identical
keyframes block (gentle bob + tilt):

```css
@keyframes love-envelope-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-10px) rotate(2deg);
  }
}
```

```css
@keyframes guest-garden-float-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-1.5deg);
  }
  50% {
    transform: translateY(-8px) rotate(1.5deg);
  }
}
```

Used by exactly two elements:

```css
.love-envelope-float {
  /* … */
  animation: love-envelope-bob 2.8s ease-in-out infinite;
}
```

```css
.guest-garden-float {
  /* … */
  animation: guest-garden-float-bob 2.7s ease-in-out infinite;
}
```

## Target

One shared keyframe driven by per-element custom properties:

```css
@keyframes floatBob {
  0%,
  100% {
    transform: translateY(0) rotate(calc(var(--bob-tilt) * -1));
  }
  50% {
    transform: translateY(calc(var(--bob-height) * -1)) rotate(var(--bob-tilt));
  }
}

.love-envelope-float {
  --bob-height: 10px;
  --bob-tilt: 2deg;
  animation: floatBob 2.8s ease-in-out infinite;
}

.guest-garden-float {
  --bob-height: 8px;
  --bob-tilt: 1.5deg;
  animation: floatBob 2.7s ease-in-out infinite;
}
```

Visual output is identical to today (rest pose tilts negative, apex tilts
positive, same heights and periods).

## Repo conventions to follow

- Custom-property-driven variation already exists in this repo — exemplar:
  the sprout keyframes read `var(--sprout-tilt)` (`stemSproutPopRight` /
  `stemSproutPopLeft`), and bars read `var(--target)`. Follow that pattern.

## Steps

1. Add the `floatBob` keyframes once (place it where `love-envelope-bob` was).
2. Delete both old `@keyframes` blocks.
3. In `.love-envelope-float`: add the two `--bob-*` declarations and change the
   animation line to `animation: floatBob 2.8s ease-in-out infinite;`. Keep
   every other declaration in the rule unchanged.
4. Do the same for `.guest-garden-float` with its own values.

## Boundaries

- Do NOT touch child rules like `.guest-garden-float:hover img` or
  `.love-envelope__glow` / label styles — only the two animation declarations
  and the two keyframes blocks.
- Do NOT change durations, easings, heights, or tilt values.
- If `grep -n "love-envelope-bob\|guest-garden-float-bob" src/styles/theme.css`
  shows more than one usage of either name, STOP and report.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged.
- **Feel check**: load the app as "her" user — the envelope floats exactly as
  before; switch theme and open the guest view — the garden FAB bobs exactly
  as before. Watch one full cycle of each at normal speed: same amplitude,
  same period.
- Toggle `prefers-reduced-motion` and confirm both loops freeze (global
  kill-switch).
- **Done when**: `grep -c "@keyframes" src/styles/theme.css` counts exactly one
  fewer than before (13 → 12), and neither old keyframe name appears anywhere.
