# 005 — Add a like-commit pulse to the guest album heart

- **Status**: DONE
- **Commit**: 78b2f99
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities / delight
- **Estimated scope**: 2 files (`src/components/GuestAlbum.tsx`,
  `src/styles/theme.css`)

## Problem

Liking a photo flips the heart's fill-weight and color instantly. The commit
moment — the app's main "warm" interaction — gets no physical response:

```tsx
/* src/components/GuestAlbum.tsx ≈139 */
const toggleLike = async (photoId: string) => {
  const existingLike = interactions.find(
    (i) => i.photoId === photoId && i.type === 'like' && i.deviceId === currentDeviceId,
  )
  if (existingLike) {
    await deleteInteraction(existingLike.id)
    return
  }
  await recordInteraction(photoId, 'like')
}
```

```css
/* src/styles/theme.css ≈3143 — liked state is static */
.guest-album__like-btn.is-liked {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  color: #e85a8a;
}
```

## Target

A one-shot ~240ms scale pulse plays on the button **only when a like is
committed** (not on unlike, not when the grid mounts with already-liked
photos). Unliking stays quiet — delight belongs to the positive moment.

CSS (add after `.guest-album__like-btn.is-liked`):

```css
.guest-album__like-btn.is-popping {
  animation: likePulse 0.24s var(--ease);
}

@keyframes likePulse {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
```

TSX — track the just-liked photo id transiently:

```tsx
const [poppingLikeId, setPoppingLikeId] = useState<string | null>(null)
```

Extend `toggleLike`'s liking branch only:

```tsx
if (existingLike) {
  await deleteInteraction(existingLike.id)
  return
}
await recordInteraction(photoId, 'like')
setPoppingLikeId(photoId)
window.setTimeout(() => setPoppingLikeId(null), 260)
```

And the button's className (≈line 213):

```tsx
className={`guest-album__like-btn${liked ? ' is-liked' : ''}${
  poppingLikeId === meet.id ? ' is-popping' : ''
}`}
```

## Repo conventions to follow

- One-shot entrance/celebration keyframes use `var(--ease)` + explicit
  percentages — exemplar: `resultPop`, `guestPlantBloom`.
- The global reduced-motion kill-switch automatically collapses this to
  instant; no extra media query needed.

## Steps

1. In `GuestAlbum.tsx`, add `poppingLikeId` state next to the other useState
   declarations inside `GuestAlbum`.
2. Extend `toggleLike` exactly as shown (only the liking path).
3. Extend the heart button's className template.
4. In `theme.css`, add the `.is-popping` rule and `likePulse` keyframes after
   the `.guest-album__like-btn.is-liked` rule.

## Boundaries

- Do NOT pulse on unlike or on initial mount.
- Do NOT touch the count button, comment button, or viewers button.
- Do NOT change the `is-liked` colors.
- The setTimeout intentionally has no cleanup-on-unmount; React 18+ tolerates
  the late no-op setState. Do not add timer machinery.

## Verification

- **Mechanical**: `npm run build` clean; lint unchanged.
- **Feel check**: open the guest album as a guest:
  - tapping a heart pulses it to ~1.25× and settles within ~a quarter second;
  - tapping again to unlike does NOT pulse;
  - reloading with likes already present does NOT pulse;
  - rapid double-tap (like→unlike fast) never leaves the button stuck scaled.
- Toggle `prefers-reduced-motion` and confirm the pulse disappears while fill/
  color feedback remains.
- **Done when**: every like commit visibly "beats" once, nothing else does.
