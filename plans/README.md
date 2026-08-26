# Animation Plans — girlfriend-app

Produced by the `improve-animations` audit on commit `78b2f99`.
Each plan is self-contained; executors need zero conversation context.
Run `npm run build` after each plan; lint must stay at exactly the two
pre-existing `useQuizBank.ts` errors.

## Plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| 001 | Introduce duration tokens and consolidate hand-typed values | LOW | DONE¹ |
| 002 | Gate hover lifts behind (hover: hover) + drop dead shadow transition | MEDIUM | DONE |
| 003 | Consolidate the two ambient bob keyframes into one parameterized loop | LOW | DONE |
| 004 | Animate the quiz question swap | MEDIUM | DONE |
| 005 | Add a like-commit pulse to the guest album heart | LOW | DONE |
| 006 | Remove dead timeline motion CSS | LOW | DONE |
| 007 | Animate bucket-list item removal with a collapse-and-fade exit | LOW | DONE |

All seven executed on 2026-08-25 in order 002 → 001 → 003 → 006 (shared CSS
build), then 004, 005, 007 with individual builds. Every build clean; lint
constant at the two pre-existing `useQuizBank.ts` errors.

¹ Executed with the review amendment: the `--dur-pop` token carries an inline
comment justifying its 0.45s length as an exempt occasional/explanatory
reveal (`resultPop`), per the `/review-animations 001` pass.

## Recommended execution order

1. **002** — smallest, independent, unblocks one line of 001.
2. **001** — token foundation; 003/004/007 prefer `--dur-*` tokens (each plan
   states a literal fallback if 001 hasn't run, so order here is a preference,
   not a hard gate).
3. **003**, **004**, **005** — independent feel improvements; any order.
4. **006** — dead-code removal; run its grep guard first.
5. **007** — largest JSX change; run last and review its diff carefully.

Dependencies:

- 002 before 001 (001's mapping expects meme-card's transition line to already
  be transform-only).
- No other hard dependencies.

## Deliberately not planned

- JS springs / gesture physics — no draggable surfaces exist; CSS covers all
  motion here.
- Exit animations for DateIdeas saved-pills — same pattern as plan 007 but the
  removal is driven by the bookmark toggle's data flow; worth doing as a
  follow-up only if bucket-list exits feel right in practice.
