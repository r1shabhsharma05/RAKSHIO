# ADR-003: Astryx for primitives, hand-built panic surfaces

## Status
Accepted — amended Step 4 (2026-11-27): the deferred custom theme is done.
`src/theme/rakshioTheme.ts` (defineTheme extends neutralTheme) re-seats the
accent on Calm #0369a1 and tints secondary buttons Calm-blue, so they read
as tappable. The neutral theme is no longer used as-is. The forward action
stays a hand-built `.rk-primary-btn` (Astryx `primary` still renders
black-on-black, axe 1.21 — unchanged).

## Date
2026-11-27

## Context
Lib-first rule: check installed component libraries before hand-building.
The app needs accessible buttons, badges, and cards — and one bespoke
surface no library ships: a 160px calm panic mic button.

## Decision
Use Astryx (`@astryxdesign/core` + neutral theme) for Button, Badge, and
Card. Hand-build the giant mic button, the Golden Hour Clock chips, the
timeline, and the checklist in plain CSS under the Calm Mode tokens.

## Alternatives Considered

### shadcn / kokonutui
- Both need Tailwind + Radix; the project is plain CSS + Astryx. Adding
  Tailwind for buttons would have been a bigger change than the buttons
  themselves. Their composition rules (full Card, Badge status,
  Alert-style callouts) were applied to the hand-built pieces instead.

### 21st.dev components
- Speech Input / Dictation Button found in the catalog, but all are
  Tailwind + shadcn based; porting costs more than the bespoke mic
  button and risks the Calm Mode tokens. The MediaRecorder fallback does
  not apply (no backend to send audio to).

### Full custom theme via defineTheme
- Done in Step 4 (2026-11-27): `src/theme/rakshioTheme.ts` — accent
  re-seeded on Calm #0369a1 via HCT, surfaces tinted, secondary buttons
  Calm-blue. Verified by screenshots + axe 0 violations.

## Consequences
- axe-core found the neutral theme's `primary` Button variant renders
  black text on a near-black background (contrast 1.21, caught live
  2026-11-27). All `primary` buttons were switched to `secondary`
  (verified clean); `destructive` is kept for the 1930 call only.
  A custom RAKSHIO theme remains deferred polish.
