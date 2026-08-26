# 006 — Remove dead timeline motion CSS

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: LOW
- **Category**: Purpose & frequency (unreachable code)
- **Estimated scope**: 1 file (`src/styles/theme.css`), 6 rules deleted

## Problem

The `.timeline__*` rules — including the audited `max-height`/`margin` layout
animation on `.timeline__caption` and the ungated hover lift on
`.timeline__photo` — style markup that no longer exists. The photo timeline was
superseded by the stem-log garden; no `.tsx` file renders any `timeline__`
class:

```css
/* src/styles/theme.css ≈883-896 */
.timeline__photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%);
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
}

.timeline__photo:hover {
  transform: scale(1.015);
}
```

```css
/* src/styles/theme.css ≈907-924 */
.timeline__caption {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.95rem;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.4s var(--ease), opacity 0.35s, margin 0.35s;
}

.timeline__item.is-open .timeline__caption {
  max-height: 8rem;
  opacity: 1;
  margin-top: 0.25rem;
}

.timeline__caption--always {
  max-height: none;
```

## Target

Those motion rules are deleted, not rewritten. Delete exactly these selectors
(including their full declaration blocks and the `--always` variant):

- `.timeline__photo { … }`
- `.timeline__photo:hover { … }`
- `.timeline__item--meet .timeline__photo:hover { transform: none; }` (if present)
- `.timeline__caption { … }`
- `.timeline__item.is-open .timeline__caption { … }`
- `.timeline__caption--always { … }` (delete the whole rule; if it has extra
  declarations beyond `max-height: none`, keep them only if they are not
  animation-related — otherwise delete the entire rule)

## Repo conventions to follow

- None needed — this is a deletion.

## Steps

1. FIRST run:
   `grep -rn "timeline__" src --include=*.tsx --include=*.ts`
   If it returns ANY match, STOP and report — the classes are live and this
   plan must not run.
2. Delete the six rules listed above.
3. Leave every other `.timeline__*` selector untouched (full dead-section
   cleanup is out of scope for a motion pass).

## Boundaries

- Do NOT delete any other `.timeline__*` rules (e.g., `.timeline__item`,
  layout rules).
- Do NOT touch stem-log / GrowingFlower styles.
- Do NOT "fix" the caption animation instead of deleting it.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged (2 pre-existing).
  `grep -n "max-height" src/styles/theme.css` no longer shows an animated
  `max-height` transition anywhere.
- **Feel check**: load the app, open the photo-timeline section and the guest
  album — everything renders exactly as before (these styles were never
  applied to real markup).
- **Done when**: step 1's grep returned nothing, and the six selectors no
  longer exist in `theme.css`.
