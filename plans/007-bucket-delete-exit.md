# 007 — Animate bucket-list item removal with a collapse-and-fade exit

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (`src/components/BucketList.tsx`,
  `src/styles/theme.css`)

## Problem

Deleting a bucket item unmounts it instantly — the list jumps with no exit.

```tsx
/* src/components/BucketList.tsx ≈76-101 */
{items.map((item) => (
  <li
    key={item.id}
    className={`bucket-item${item.done ? ' is-done' : ''}`}
  >
    {/* checkbox / meta / category / Remove button */}
    <button
      type="button"
      className="bucket-item__delete"
      onClick={() => deleteItem(item.id)}
      aria-label={`Delete ${item.text}`}
    >
      Remove
    </button>
  </li>
))}
```

## Target

Clicking Remove keeps the row mounted for ~220ms while it collapses and fades,
then removes it from data. The collapse uses the modern `grid-template-rows:
1fr → 0fr` technique — no max-height measuring, no layout thrash beyond the
one unavoidable reflow per frame of the shrinking row.

### CSS

Add near the existing `.bucket-item` rules:

```css
.bucket-slot {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows var(--dur-base) var(--ease),
    opacity var(--dur-base) ease;
}

.bucket-slot.is-exiting {
  grid-template-rows: 0fr;
  opacity: 0;
}

.bucket-slot > .bucket-item {
  min-height: 0;
  overflow: hidden;
}
```

If `--dur-base` does not exist yet (plan 001 not applied), use `0.2s`.

### TSX

1. Add exit-tracking state inside `BucketList`:

```tsx
const [exitingIds, setExitingIds] = useState<string[]>([])

function handleRemove(id: string) {
  setExitingIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
  window.setTimeout(() => {
    deleteItem(id)
    setExitingIds((ids) => ids.filter((x) => x !== id))
  }, 220)
}
```

2. Restructure each row so the styled card sits inside a grid wrapper `<li>`:

```tsx
{items.map((item) => {
  const isExiting = exitingIds.includes(item.id)
  return (
    <li key={item.id} className={`bucket-slot${isExiting ? ' is-exiting' : ''}`}>
      <div className={`bucket-item${item.done ? ' is-done' : ''}`}>
        {/* move ALL existing children (checkbox, meta, category span, button)
            unchanged into this div */}
        <button
          type="button"
          className="bucket-item__delete"
          onClick={() => handleRemove(item.id)}
          disabled={isExiting}
          aria-label={`Delete ${item.text}`}
        >
          Remove
        </button>
      </div>
    </li>
  )
})}
```

3. Check `.bucket-item`'s CSS for layout assumptions broken by the new parent
   (e.g., if it relied on being the `<li>` directly, like `li.bucket-item`
   selectors elsewhere) and confirm nothing references `li.bucket-item`.

## Repo conventions to follow

- Exits fade + move only; opacity transitions use plain `ease` while spatial
  motion uses `var(--ease)` — exemplar: the guest-sheet panel transition.
- The global reduced-motion kill-switch collapses this to instant removal.

## Steps

1. Apply the three CSS rules.
2. Add `exitingIds` state and `handleRemove` to `BucketList`.
3. Restructure the map body exactly as shown (children moved verbatim).
4. Point the button's onClick at `handleRemove(item.id)` and add
   `disabled={isExiting}`.

## Boundaries

- Do NOT touch DateIdeas saved-pills or any other list — bucket list only.
- Do NOT add dependencies or a shared hook file.
- Keep `key={item.id}` on the outer `<li>`.
- If `items`/`deleteItem` don't match the excerpts (hook drift), STOP and report.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged.
- **Feel check**: add two test items, then remove one: it collapses upward and
  fades over ~200ms while its sibling slides up smoothly behind it; removing
  the last item leaves no ghost gap; double-clicking Remove can't fire twice
  (button disables); deleting during a Firestore sync round-trip still removes
  exactly once.
- In DevTools at 10% speed, the row shrinks via height collapse — content is
  clipped by `overflow: hidden`, never squashed mid-line.
- Toggle `prefers-reduced-motion`: removal becomes instant.
- **Done when**: every delete shows one smooth collapse, and item count/data
  end-state matches pre-change behavior exactly.
