Part 1 — Opportunities Table
  #: 1
  Location: src/components/IntroLoading.tsx:68
  Today: Milestone bars animate sequentially on load with transform:
  scaleX(0)→target (0.9s each)
  Purpose: Explanation / Delight
  Frequency: Rare (first load only)
  Suggested Motion: Keep — already well-designed. Staggered scaleX via
  --ease
  (cubic-bezier(0.22, 1, 0.36, 1)), no layout thrashing. Add
  @starting-style for cleaner entry if re-implemented.
  ────────────────────────────────────────
  #: 2
  Location: src/components/LoveLetter.tsx:37
  Today: Floating envelope button has :hover glow + bob animation, but no
  press feedback
  Purpose: Feedback
  Frequency: Occasional (Her only, deliberate action)
  Suggested Motion: Add :active { transform: scale(0.95) } with transition:
  transform var(--dur-press) var(--ease) — subtle, confirms press on a
  meaningful CTA.
  ────────────────────────────────────────
  #: 3
  Location: src/components/GuestAlbum.tsx:56 /
  src/components/LoveLetter.tsx:58
  Today: Native <dialog> modals use .guest-sheet / .love-letter-overlay with
  @starting-style backdrop transitions — panel content has no entrance
  animation (only backdrop fades)
  Purpose: Preventing a jarring change
  Frequency: Occasional (guest views, Her letter)
  Suggested Motion: Add panel animation: @starting-style {
  .guest-sheet[open]
   .guest-sheet__panel { opacity: 0; transform:  translateY(12px); } } +
  transition: opacity  var(--dur-panel) var(--ease), transform
  var(--dur-panel)  var(--ease); Same for .love-letter-overlay
  .love-letter.
  ────────────────────────────────────────
  #: 4
  Location: src/components/QuizEditor.tsx:118
  Today: Star (★) button for marking correct answer — toggles .is-active but
  no press/toggle feedback
  Purpose: Feedback
  Frequency: Occasional (Quiz setup, once per week)
  Suggested Motion: Add :active { transform: scale(0.9) } on button +
  .is-active transition: transition: transform  var(--dur-fast)
  var(--ease), color var(--dur-fast)  var(--ease);
  ────────────────────────────────────────
  #: 5
  Location: src/components/Nav.tsx:42 / Nav.tsx:52
  Today: Theme toggle buttons have .is-active state but no
  press/hover/toggle
   animation
  Purpose: Feedback / State indication
  Frequency: Tens/day (theme switching)
  Suggested Motion: Add transition: background-color var(--dur-fast)
  var(--ease), border-color var(--dur-fast) var(--ease),  transform
  var(--dur-press) var(--ease); on .theme-toggle__btn. :active { transform:
   scale(0.96) } — subtle for frequency tier.
  ────────────────────────────────────────
  #: 6
  Location: src/components/GuestGarden.tsx:61
  Today: Planted slot buttons (zen-slot) — tap to open note sheet, no press
  feedback
  Purpose: Feedback
  Frequency: Occasional (guest visits)
  Suggested Motion: Add :active { transform: scale(0.97) } to
  .zen-slot.is-planted with transition: transform  var(--dur-press)
  var(--ease).
  ────────────────────────────────────────
  #: 7
  Location: src/components/Quiz.tsx:227
  Today: History dialog opens via showModal() — uses native <dialog> but no
  custom panel animation (only default browser behavior)
  Purpose: Preventing a jarring change
  Frequency: Occasional (weekly)
  Suggested Motion: Same pattern as #3: @starting-style for panel enter from
  opacity: 0, translateY(12px) → settled, var(--dur-panel) / var(--ease).

  ---

  Part 2 — Rejected Candidates

  Location: src/components/Nav.tsx:35
  Considered: Nav links on hover/focus
  Gate Failure: Frequency — navigation used 50+/day; any hover animation
  adds
  latency. Current underline-only is correct.
  ────────────────────────────────────────
  Location: src/components/PhotoTimeline.tsx
  Considered: Meet cards in timeline
  Gate Failure: Function — content is information-dense (dates,
  descriptions,
  photos). Cards already animate on mount via stemItemIn (CSS).
  Scroll-triggered re-animation would hinder reading.
  ────────────────────────────────────────
  Location: src/components/DateIdeas.tsx
  Considered: Filter chips + result card
  Gate Failure: Frequency — filters used repeatedly during session. Press
  feedback OK, but entrance/exit animations on filter change would feel
  sluggish. Current instant swap is better.
  ────────────────────────────────────────
  Location: src/components/Quiz.tsx
  Considered: Quiz playing phase (question cards, timer bar)
  Gate Failure: Frequency — core interaction, 10 questions × 60s. Timer bar
  already animates via transform: scaleX (correct). Question cards should
  stay instant — user is reading under time pressure.
  ────────────────────────────────────────
  Location: src/components/MemeCorner.tsx
  Considered: Meme grid on filter change
  Gate Failure: Function — user is scanning visual content. Filter swap
  should be instant. Staggered entrance only on initial page load (already
  handled by reveal-stagger from plan 001).
  ────────────────────────────────────────
  Location: src/components/BucketList.tsx:40
  Considered: Delete animation (collapse + fade)
  Gate Failure: Already implemented — 220ms is-exiting class with transform.
  Good.
  ────────────────────────────────────────
  Location: src/components/GrowingFlower.tsx
  Considered: Petal bloom / leaf sprout animations
  Gate Failure: Already implemented — stemPetalBloom keyframes with stagger
  delays, stemSproutPopRight/Left. These are first-time delight (rare),
  appropriately expressive.

  ---

  Part 3 — Verdict

  This interface is already close to right. The motion vocabulary is
  cohesive (--ease, --dur-* tokens used consistently), respect for
  prefers-reduced-motion is baked in, and the high-frequency paths (nav,
  quiz playing, timeline reading) are correctly animation-free.

  Three highest-leverage additions (all low-effort, high-perceived-quality):
  1. Press feedback on meaningful CTAs (#2, #4, #5, #6) — transform:
     scale(0.95–0.97) with var(--dur-press) on envelope, star buttons, theme     toggles, planted slots. These confirm intent on deliberate actions
     without slowing frequent interactions.
  2. Dialog panel entrance (#3, #7) — The backdrops animate beautifully
     (::backdrop with @starting-style), but the content panels snap in.
     Adding opacity + translateY entrance on .guest-sheet__panel and
     .love-letter would complete the spatial story.
  3. Theme toggle state transition (#5) — A 150ms crossfade on the
     swatch/label when switching themes makes the change feel grounded, not
     teleported.

  ---

  Handoff: Pick any row above → improve-animations plan <description> (e.g.,  improve-animations plan "press feedback on LoveLetter envelope button")
  to generate a self-contained implementation plan with exact file paths,
  token values, and verification steps.