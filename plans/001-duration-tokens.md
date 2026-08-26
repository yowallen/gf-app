# 001 — Introduce duration tokens and consolidate hand-typed values

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file (`src/styles/theme.css`), ~20 small value swaps

## Problem

The stylesheet has one excellent easing token (`--ease`) but no duration scale.
Durations are hand-typed in ~20 places, and the same entrance keyframe
(`resultPop`) runs at three different durations:

```css
/* src/styles/theme.css — three uses of the same entrance, three durations */
.quiz-results   { animation: resultPop 0.55s var(--ease) both; }  /* ≈line 2055 */
.idea-choices   { animation: resultPop 0.4s  var(--ease) both; }  /* ≈line 2164 */
/* idea-result card */ { animation: resultPop 0.45s var(--ease) both; } /* ≈line 2218 */
```

Press feedback, dialogs, and hovers each drifted onto their own nearby-but-
different values (0.12 / 0.15 / 0.22 / 0.25 / 0.3 / 0.32). Nothing is wrong
individually; collectively it means every new component invents a number.

## Target

Add six tokens to `:root` in `src/styles/theme.css` (inside the existing
`:root, [data-theme='green']` block, next to `--ease`):

```css
  --dur-press: 0.12s; /* button/pill press feedback */
  --dur-fast: 0.15s;  /* color hovers, small fades */
  --dur-base: 0.2s;   /* default UI transitions (.btn) */
  --dur-lift: 0.25s;  /* hover lifts, timer bar */
  --dur-panel: 0.3s;  /* dialogs, backdrops */
  --dur-pop: 0.45s;   /* one-shot reveal entrances (resultPop);
                         occasional/explanatory moment — exempt from the 300ms UI budget */
```

Then apply this EXACT mapping (search each excerpt; excerpts are the source of
truth, not line numbers):

| Current | Replacement |
| --- | --- |
| `transition: transform 0.2s var(--ease), background 0.2s;` (`.btn`) | `transition: transform var(--dur-base) var(--ease), background var(--dur-base);` |
| Every `transform 0.12s var(--ease)` (chip, quiz-option, idea-choice, idea-saved__item, idea-result__action, guest-tabs__btn, guest-album like/comment/viewers/count buttons) | `transform var(--dur-press) var(--ease)` |
| Every bare `0.15s` in those same rules (background/color/border-color/opacity entries) | `var(--dur-fast)` |
| `.quiz-timer-bar::after` … `transition: transform 0.25s linear;` | `transition: transform var(--dur-lift) linear;` |
| Guest-sheet panel: `opacity 0.22s ease` → `opacity var(--dur-fast) ease`; `transform 0.32s var(--ease)` → `transform var(--dur-panel) var(--ease)`; both `overlay 0.32s … allow-discrete, display 0.32s allow-discrete` → `overlay var(--dur-panel) … allow-discrete, display var(--dur-panel) allow-discrete`; backdrop `background-color 0.32s ease, backdrop-filter 0.32s ease, overlay/display 0.32s` → all `var(--dur-panel)` |
| Quiz-history dialog: same normalization (`0.22s`→fast fade, `0.3s`→panel everywhere) |
| Love-letter overlay/backdrop/letter: same normalization (`0.22s`→fast fade, `0.3s`→panel everywhere) |
| All three `animation: resultPop Xs var(--ease) both;` | `animation: resultPop var(--dur-pop) var(--ease) both;` |

## Repo conventions to follow

- Easing/duration tokens live in the `:root, [data-theme='green']` block at the
  top of `src/styles/theme.css`. Exemplar: `--ease: cubic-bezier(0.22, 1, 0.36, 1);`
  — every animated rule references it instead of typing a curve.
- Do NOT introduce new easings. Only durations become tokens.

## Steps

1. Add the six `--dur-*` declarations directly under the `--ease:` line in the
   `:root` block (do NOT add them to `[data-theme='purple']` — they are
   theme-independent).
2. Apply the mapping table above, top to bottom. Use the code excerpts to find
   each site (Ctrl+F for the exact strings).
3. Leave these alone (ambient/explanatory motion, intentionally literal): body
   theme crossfade, nav background, heroRise, intro bars/fades, milestone fill,
   gate/intro visibility, bob loops, guestPlantBloom/stemItemIn entrances,
   `.intro__skip`, `.love-envelope-float`, `.guest-garden-float`.

## Boundaries

- Do NOT touch any file other than `src/styles/theme.css`.
- Do NOT change any easing function, delay, or keyframe — durations only.
- If the meme-card line still reads `transition: transform 0.25s var(--ease),
  box-shadow 0.25s var(--ease);` then plan 002 has not been applied — STOP and
  report instead of improvising.
- If an excerpt doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build` completes clean; `npm run lint` reports the
  two pre-existing `useQuizBank.ts` errors and nothing new.
- **Feel check**: open the app and confirm nothing changed perceptibly — press
  chips/buttons, open and close a guest sheet repeatedly, finish a quiz. The
  refactor must be feel-neutral except `quiz-results` becoming slightly
  snappier (0.55s → 0.45s), which is intended.
- Toggle `prefers-reduced-motion` (DevTools Rendering panel) and confirm all
  transitions still collapse to instant (the global kill-switch must keep
  working).
- **Done when**: `grep -c '0.12s\|0.22s\|0.32s' src/styles/theme.css` returns 0,
  and `resultPop` appears exactly three times, always as
  `var(--dur-pop)`.
