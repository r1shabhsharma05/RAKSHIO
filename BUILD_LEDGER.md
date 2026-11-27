# Build ledger — RAKSHIO (Scaler × Wispr Flow, Round 2)

Plan: `~/workspace/user/files/RAKSHIO_Execution_Master_Plan.docx` + Round 2 brief.
Execution: inline, step by step, one step verified before the next.

## Step 1: complete (2026-11-27)
Core voice loop: scaffold, Panic, Voice Adapter, Understanding Engine,
confirmation gate, incident card + timeline, Golden Hour Clock, Action
Queue, 1930 Call Coach, demo aid, README.
Evidence: `npm run build` green (tsc + vite, 1.81s); `npx vitest run`
12/12 pass; `npm run preview` smoke — page 200, title + root div present,
JS bundle 200, CSS 200, manifest 200.
Fixes during Step 1: two pre-existing type errors in extract.ts
(unused `text` param in parseAmount; parseMethod return type widened to
`Field<'UPI'|'card'|'netbanking'|'wallet'>`).

## Rulings
- Astryx neutral theme as-is for library primitives; custom RAKSHIO theme
  via defineTheme/palette generation deferred — needs palette generation,
  not a Step 1 job. Cost if wrong: visual mismatch between neutral
  components and Calm Mode palette; fixable in Step 3 polish.
- Lenis skipped per its own skill boundary (app UIs use native scroll;
  this is a single-screen mobile app with minimal scroll). Native scroll kept.
- shadcn/kokonutui skipped as dependencies (both need Tailwind + Radix;
  project is plain CSS + Astryx). Their composition rules applied instead:
  full Card composition, Badge status, Alert-style callouts.
- 21st.dev checked: Speech Input / Dictation Button found, all Tailwind +
  shadcn based; porting costs more than the bespoke mic button and risks
  Calm Mode tokens. MediaRecorder fallback N/A (no backend, no keys).
- System-ui font stack, not Atkinson Hyperlegible (design-system
  recommendation) — offline resilience beats the font; system-ui is the
  recommendation's own fallback.
- Confirmation gate: a field the user marks "Pata nahi" counts as
  resolved; the card locks until amount/time/method is confirmed OR
  explicitly unknown. Cost if wrong: a user who truly doesn't know a
  field could be blocked — they aren't; "Pata nahi" is always offered.
- Gap answers for amount get a "rupaye" cue appended before parsing, so
  a bare "bees hazaar" parses. Cost if wrong: none — cue is inert when
  the answer already contains it.
- PWA: manifest only; no service worker / plugin (not trivial, Step 1
  doesn't need offline install). Noted as skipped.
- `ocr` review + Strix: Step 3 (repo needs `git init` first for OCR
  workspace mode; Strix CLI availability unchecked).

## Step 2: complete (2026-11-27)
Differentiators: Evidence Vault (Dexie/IndexedDB + SHA-256 hash chain +
redaction + Verify + labelled tamper test), Ack Bridge + 24h countdown +
Portal Copy Deck, Smart Triage Router (lost-money -> 1930/bank/portal;
attempted -> Chakshu), Second-Scam Shield 2.0 (12 weighted rules + Truth
Card), Bank Alert Kit (10 banks, helplines verified 2026-11-27 against
Google Pay directory + 2026 listings; unlisted banks get no number),
Care Circle (consent preview, WhatsApp deep link, offline QR; number never
stored), Bilingual Proof Pack (pdf-lib Latin-script Hinglish PDF + ZIP +
root-hash QR), Judge Mode (seeded scenario, no mic), Caregiver Mode
(badge on every screen + records labelled).
Evidence: `npm run build` green; `npx vitest run` 21/21 (extract 12,
shield 50-message set 50/50 = 100% vs 90% target, vault 3 incl. tamper
turns chain red + names record, triage 4).
Bank helplines: SBI 1800 11 2211, HDFC 1800 1600/2600, ICICI 1800 1080,
Axis 1860 419 5555, Kotak 1860 266 2666, PNB 1800 180 2222, BoB
1800 102 4455, Canara 1800 425 0018, Union 1800 22 2244, Yes 1800 1200.

## Rulings (Step 2)
- Step 1 bug found + fixed during Step 2 wiring: the machine had no
  `panic -> extracting` transition, so the Demo button silently did
  nothing. Added panic -> extracting/judge, judge -> extracting,
  actions -> bank/vault/care/ack. Cost if wrong: a dead demo button in
  front of judges — caught by writing the transitions, not by a test.
  A Playwright click-through (Step 3) guards against recurrence.
- Shield "batao" fix: verb list needed the imperative forms (batao/
  bataiye) — \b after "bata" never matched "batao". Root cause, not a
  test tweak: the rule was wrong, the test caught it.
- Proof PDF is Latin-script Hinglish, not Devanagari — pdf-lib standard
  fonts have no Devanagari glyphs and embedding a font needs a network
  fetch at generation time. Said plainly in the UI.
- Care Circle number is never stored — used only to build the wa.me link.
- Bundle grew to 1.29 MB (pdf-lib + Dexie + QR + JSZip); chunk-size
  warning stands. Lazy-loading Proof/Vault is a Step 3 polish item.

## Step 3: complete (2026-11-27)
Proof: Vitest 21/21; Playwright smoke 3/3 (incl. axe-core 0 violations on
Panic + Incident screens); docs PRIVACY/THREAT_MODEL/DEMO + 3 ADRs;
8-slide pitch deck PDF (64,523 bytes, 8 pages, via Chromium print-to-PDF).
Security: secret scan clean (only false positives — "tokens" as word
tokens, OTP-masking regexes, "Calm Mode tokens"); no innerHTML/eval;
zero fetch/XHR in src. npm audit BLOCKED by registry policy
(policy_denied) — not run, not a pass. Strix NOT installed on this VM
(no CLI, no Docker) — find-security-vulnerabilities-in-code could not
run; covered instead by security-audit checklist + OCR delegate review.
OCR delegate review (ocr v1.13.13, workspace mode, 39 source files):
rules received (3 groups); findings fixed — dead code deleted
(src/voice/prompts.ts unused, Step2Badge unused after Actions rework),
Proof BlobPart cast narrowed with WHY comment, Listen empty-stop now
shows a hint instead of silently doing nothing. 700ms extracting
timeout: uncleaned, but harmless — the state machine blocks the late
transition if the user navigated away.
UI pass (charles-unslop + impeccable, real phone screenshots 390x844):
Astryx secondary buttons read as disabled — forward action on each
screen is now a hand-built .rk-primary-btn (solid #0369A1); raw engine
string "otp-impersonation" shown to victims — now Hindi labels via
fraudTypeLabel/methodLabel; "Turant" badge truncated — badge-wrap
flex:none. Verified by re-screenshot.

## Rulings (Step 3)
- Axe failures were mid-animation measurements (GSAP fades), not real
  contrast failures — fixed by settling 900ms before axe, not by
  changing colors. The one real failure (Astryx primary black-on-black,
  1.21) was fixed by dropping the primary variant entirely.
- Vitest picked up Playwright specs in tests/ — fixed with
  vitest.config.ts exclude, not by moving the specs.
- The earlier stale-dist screenshots were re-taken after the rebuild;
  only the fresh ones count as evidence.
- Bundle 1.29 MB chunk warning stands (pdf-lib + Dexie + QR + JSZip).
  Lazy-loading Proof/Vault deferred — local demo load is acceptable.
- Care Circle wa.me link assumes Indian numbers (91 prefix) — India-only
  hackathon, stated in code, no fix needed.

## Deferred minors
- Custom RAKSHIO theme via Astryx defineTheme/palette generation.
- Lazy-load Proof/Vault screens to cut the 1.29 MB bundle.
- PWA service worker (manifest only for now).
- Bank helpline re-verification before the pilot (last checked 2026-11-27).

## Step 4: complete (2026-11-27) — production upgrade
Goal: production-grade + design polish for judges, inside Calm Mode.
Stack unchanged and confirmed: React 19 + TypeScript + Vite — no plain-HTML
pages added (index.html stays only the Vite entry shell). `strict: true`
added to tsconfig.app.json; tsc green. No `any` anywhere in src.

1. **PWA service worker** — `public/sw.js` (versioned cache `rakshio-v1`,
   shell cached on install, hashed /assets cache-first, pages network-first
   with cache fallback; old cache deleted on activate, no skipWaiting, so an
   update never breaks the panic path mid-session). Registered in main.tsx,
   production only. Manifest gained stable `"id": "/"` + `"scope": "/"`.
   Playwright offline test: load → worker active → reload → offline →
   reload → Panic screen still renders. Gap: no 192/512 PNG icons — the
   manifest keeps the SVG icon; PNGs would be new binaries, unpushable via
   the text-only API route (same as the deck PDF — web upload if wanted).
2. **Code-splitting** — Vault, Proof, Care are React.lazy + Suspense with a
   skeleton fallback. Before: one chunk 1,287.21 kB (gzip 456.18 kB), chunk
   warning on first load. After: index 655.74 kB (gzip 213.18 kB),
   Proof 519.88 kB, vault 99.15 kB, Vault 4.26 kB, Care 2.10 kB.
   First-load JS −49% (−53% gzip). The >500 kB warning remains only for the
   lazy Proof chunk, which never blocks first paint.
3. **Custom RAKSHIO theme** — `src/theme/rakshioTheme.ts`, defineTheme
   extends neutralTheme: accent re-seeded on Calm #0369a1 (HCT scale,
   on-accent computed), surfaces #f0f9ff/#ffffff, secondary buttons
   Calm-tinted (#e0f2fe bg, #0c4a6e text) so they read as tappable, not
   disabled. Verified by 390×844 screenshots: Panic "Likh kar batayein"
   and Actions secondaries are visibly enabled now; axe 0 violations.
4. **Error boundary** — `src/components/ErrorBoundary.tsx` (class boundary
   in main.tsx): calm fallback, banner copy kept, tel:1930 one tap away,
   reset reloads to '/'. Vitest covers the fallback copy; the catch path is
   covered by a Playwright fault-injection test (throwing
   Date.toLocaleString → fallback renders). SSR cannot test the catch:
   legacy renderToString rethrows, and renderToPipeableStream aborts the
   shell on a sync throw — documented, not worked around.
5. **Loading + feedback** — Toast (`src/components/Toast.tsx`, hand-built
   ~60 lines: ui-motion-kit toast meta timing 220/160ms, polite live
   region, pause on hover/focus, reduced-motion 0ms; the kit's component
   needs motion + @base-ui/react, two new deps for one pattern — not
   installed). Wired: Vault save, Proof PDF/ZIP, Ack save, copy-deck copy.
   Copy's old inline "Copy hua ✓" label flip deleted — one mechanism per
   job. Clipboard helper has an execCommand fallback for old webviews.
   Skeletons: Extracting step + lazy-screen Suspense fallback (aria-busy,
   static under reduced motion). Vault Verify has a busy state.
6. **Meta/OG + favicon** — og:title/description/type + twitter:card
   (summary) in index.html; no og:image (no share image asset — not
   invented). Favicon is now a Calm-blue shield SVG (was the Vite purple
   lightning bolt). Theme-color already present.
7. **Empty states + 404** — Vault empty state now names the next step;
   Proof empty state warns the PDF would be empty and routes to Vault.
   Corrupt localStorage (`{broken json`) falls back to Panic (loadIncident
   already try/catches) — Playwright test. No router exists, so no 404
   surface: every load starts at Panic or resumes a valid incident.
8. **Design polish (charles-unslop, within Calm Mode)** — direction:
   calm, exact, a little warm; world = a help-desk counter; moment = the
   giant mic + Golden Hour Clock; signature = the permanent honest banner.
   Subtracted: two disabled buttons on Panic ("Bank helpline (Step 2 me
   aayega)" etc.) → one quiet line; inline styles 44 → 0 in TSX (labels,
   notes, layout stacks, verdict colours now classes in index.css).
   Helper notes (.step2-note, footer, .note) raised 0.875rem → 1rem (the
   18px Calm minimum); cards gained one soft shadow; primary-button
   consistency comes from the theme (secondary no longer reads disabled).
   TTS rate 0.85 and the 10s skippable calm prompt untouched.
9. **Accessibility re-check** — axe-core 0 violations on Panic + Incident
   (smoke spec, after changes); mic button keyboard-focusable (Playwright).
10. **Performance** — no render-blocking regressions: build 1.70s, preview
    smoke / 200, /sw.js 200, /manifest 200, /favicon.svg 200, title + root
    div present, entry JS/CSS 200.

Evidence: `npm run build` green (tsc strict + vite, 1.70s);
`npx vitest run` **26/26** (21 old + lazy 1 + pwa 3 + fallback 1);
`npx playwright test` **9/9** (smoke 2 incl. axe 0/0, production 6,
shots 1). Fresh 390×844 screenshots in `tests/shots-local/` (local only,
NOT committed — before/after compared visually: secondaries tappable,
Turant badge intact, hierarchy unchanged). Secret scan clean (only the
OTP-masking regex false positives from Step 3). No .env files.

## Rulings (Step 4)
- Toast test lesson: `getByRole('status', {name})` never matches the toast
  — the accessible name folds in the close button's label. Tests assert
  the visible text instead; role="status" stays for screen readers.
- `getByRole('status')` matches 11 elements: every aria-live="polite"
  region has implicit status role. Not a bug.
- ui-motion-kit checked first (standing rule): toast + skeleton patterns
  adapted from its meta (timing, a11y); its components not copied — they
  need motion + @base-ui/react + Tailwind tokens this plain-CSS app
  doesn't have. Lenis still skipped (single-screen, native scroll).
- `npm audit` still BLOCKED by registry policy — not run, not a pass
  (same as Step 3). Strix still not installed.
- Proof Pack PDF stays Latin-script Hinglish (pdf-lib has no Devanagari
  glyphs) — stated in UI, unchanged.

## Step 5: complete (2026-11-27) — Damir unslop pass ("kill ai gradient")
Skill: `~/workspace/custom-skills/unslop/` (Damir Sokolovsky, CC BY 4.0) +
refs/signs.md, tokens.md, visuals.md, refs.md — read in full before the
pass. Scope: the current mobile-first Calm Mode panic flow only; no
redesign, no new brand, no desktop dashboard (separate unconfirmed job).
Rishabh's order was "just do it", so the skill's wait-for-direction step
was skipped; the direction below is shown in the report.

Direction (5 lines, from the product, same as Step 4's, now formal):
- Product: RAKSHIO gets a panicking fraud victim — often elderly, often
  alone — through the first hour after fraud, in the right order, with
  proof that holds up.
- Character: calm, exact, a little warm.
- World: a help-desk counter at a bank branch — paper forms, a stamped
  receipt, the helpline number written in ink.
- Moments: the giant blue mic ("Boliye, kya hua?") and the Golden Hour
  Clock — the two things a panicked person looks at first.
- Signature: the permanent honest banner ("RAKSHIO report file nahi
  karta…") on every screen.

Audit (signs.md, one line per sign — real screenshots, 390×844 + 1440px):
- Colored glow on the mic: `.mic-btn` box-shadow
  `0 0.5rem 1.5rem rgba(3,105,161,0.35)` — blue halo visible in both
  screenshots. FOUND, fixed.
- Same colored-shadow pattern on `.toast`
  (`rgba(12,74,110,0.35)`). FOUND, fixed.
- Gradients: none in src/index.css, screens, or components. PASS.
- Gradient text, radial washes, blobs, neon borders: none. PASS.
- Emoji as icons/decoration: none (✓/✗/✕ are text glyphs, not emoji;
  mic is inline SVG). PASS.
- Exclamation marks, greeting headline, hype words, unverified claims:
  none in UI strings. PASS.
- Uppercase tracked labels, italic emphasis: none. PASS.
- Headline with trailing period: "Aap safe hain." (Panic h2). FOUND, fixed.
- Internal jargon in UI: "Step 2 tools" (Incident h2 — a build-phase
  label, not user language). FOUND, fixed.
- Type weights 800 (wordmark, deadline-chip time) — above the token cap
  of 600. FOUND, softened to 700 (700 kept elsewhere: buttons, values,
  status — legibility for elderly victims, deliberate).
- Skeleton shimmer loop (`rk-shimmer`, infinite alternate) — looping
  motion. FOUND, removed; bars are static now.
- Spacing: rem steps consistent, equal rows share sizes; root is 18px so
  0.75rem = 13.5px, not a literal 4px grid — rhythm even, no fix.
- 1440px: narrow 28rem centered column, wide empty margins — deliberate
  mobile-first panic app; desktop layout is the separate unconfirmed job.
  Noted, no fix.
- Motion otherwise: no pulse/ping/transition-all/hover:scale; one 220ms
  crossfade + one short stagger per screen, reduced-motion safe. PASS.
- Verdict: LIGHT SLOP. One real sign (the glow) + small copy/type/motion
  nits. No redesign warranted.

Changes, by pass (spacing/icons/layout/details/visuals: pass, no change):
- Color: mic glow → neutral `0 0.5rem 1rem rgba(12,74,110,0.12)`; toast
  shadow → neutral `rgba(0,0,0,0.20)`. Mic keeps prominence through
  size + solid Calm blue, not glow.
- Copy: "Aap safe hain." → "Aap safe hain" (visible h2 only; TTS string
  keeps its period — speech needs it). "Step 2 tools" → "Madad ke tools".
- Type: wordmark 800 → 700; deadline-chip time 800 → 700.
- Motion: `rk-shimmer` keyframes + `.skeleton-pulse` deleted (CSS +
  shared.tsx); skeleton bars static, aria-busy still announces loading.

Evidence: `npm run build` green (1.89s); `npx vitest run` **26/26**;
`npx playwright test` **9/9** (smoke incl. axe 0 violations on Panic +
Incident). Fresh 390×844 screenshots in `tests/shots-local/` (local
only, NOT committed): mic is a flat solid circle, no halo; heading
period gone. Secret scan clean; no .env files; no binaries pushed.

## Rulings (Step 5)
- 700 weights kept on buttons/values/status on purpose: Calm Mode is an
  accessibility-first product for panicked elderly users; the token cap
  (600) assumes a dashboard audience. Only the two 800s were softened.
- The desktop-width empty margins are NOT slop here — the app is a
  phone-first panic tool by design. Widening it belongs to the desktop
  dashboard job, not this pass.

## Step 6: complete (2026-11-27) — dashboard rebuild + live-E2E fixes

Direction: the master prompt + the dashboard screenshot Rishabh sent
("is trh ka frontend chaiye mujhe exact"), plus all 6 bugs from the
27 Nov real-Chrome E2E walk of the Step 4 live site. No scope cut.

What changed — shell only; engines (extraction, clock/deadlines, vault
SHA-256 chain, shield rules, triage, banks, proof pack, ack) reused
untouched, screens reused with small prop additions:
- New: `src/dashboard/` — Shell (sidebar/header/bottom nav/drawer,
  PageFade, flat two-tone ShieldLogo), Home (hero + 4 tiles + clock +
  incident + quick actions + 5-step plan + snapshot + vault + shield +
  progress + care + proof widgets), ReportFlow (panic flow extracted
  from old App.tsx, `?mode=voice|text` deep links), ToolPages (9 tool
  wrappers), IncidentsPage (search/filter/status chips, totals, Recharts
  bar + pie, lazy), IncidentDetail (status picker + FollowUpList +
  two-step delete), SettingsPage (language, toggles, storage, export,
  per-incident delete, one-tap wipe), GoldenHour (SVG ring), Progress
  (tracker from recorded facts only), FollowUp (F16: 1h/24h/3d/7d +
  hand-built .ics), routes.ts; `src/state/incidents.ts` (multi-incident
  list, statuses, settings, follow-ups, shield-last, one-time migration
  from legacy single-incident key), `src/state/dashboardStore.ts`
  (Zustand thin mirror over localStorage, no persist middleware),
  `src/i18n.ts` (EN/HI dashboard chrome only); `src/dashboard.css`;
  `tests/dashboard.spec.ts` (17 tests).
- Modified: App.tsx (HashRouter + 14 routes), main.tsx, vite.config.ts
  (tailwindcss plugin), index.css (Tailwind theme+utilities import, no
  preflight; #root full width), index.html (theme-color #06101F),
  store.ts (optional status), Panic/Listen/Shield/AckBridge (small prop
  additions), Judge (back button), BankKit (draft + ref save), Incident
  (en-IN date), Actions (window labels), banks.ts (`bankDraft(stored,
  bankName?)`), deadlines.config.ts (`windowLabel`), smoke/production/
  shots/all-screens specs (`goto('/#/report')`).
- Deps: tailwindcss, @tailwindcss/vite, react-router-dom, zustand,
  framer-motion, recharts, lucide-react (54 packages).
- Rulings: React 19 kept (no 18 downgrade); HashRouter (static drop has
  no server rewrites); hand-written sw.js kept (no vite-plugin-pwa —
  offline panic path risk); Tailwind utilities-only (Astryx reset owns
  the base); `.db-flow` re-seats `--rk-*` on the dark palette instead of
  restyling 12 screens; shield stays a flat two-tone SVG (no glow, Step 5
  unslop ruling); mock numbers never hard-coded (₹12,500 / 00:47:23 /
  #RK-2026-1187 / upi_txn.png are screenshot fiction — real saved data
  only, seeded ₹20,000 demo only when no incident exists).

The six live-E2E fixes (each has a Playwright test in dashboard.spec.ts):
1. Back: JudgeScreen + TriageScreen Wapas buttons; HashRouter gives real
   history entries, so browser Back moves between routes instead of
   exiting the app. Test: Judge → Wapas → Panic; Triage → Wapas →
   detail; home → report → browser Back → home.
2. Bank Kit: `bankDraft(stored, bankName)` — switching bank re-fills the
   draft from the new bank (was: stuck on HDFC after SBI switch).
   Reference number no longer auto-saves on keystroke: explicit "Save
   karein" button + status confirmation + persists across reload.
3. Caregiver: visible everywhere — "Caregiver mode ON" badge on Panic
   the moment the box is ticked, Caregiver badge in the header,
   "Caregiver ne bhara hai" on the incident card, "(caregiver)" on vault
   rows (byCaregiver was already stored, never shown).
4. Clock: `windowLabel` on every deadline (1930 ≤48 hours, portal ≤24
   hours, bank ≤3 working days) rendered on Home chips and Actions
   chips, plus an explainer line when any deadline is overdue ("portal
   (24h) 1930 (48h) se pehle khatm hota hai").
5. Dates + calm tick: Incident timeline `hi-IN` → `en-IN` (was mixed
   script "27 नव॰, 03:55 pm"); calm prompt extracted into a `CalmPrompt`
   child that owns the 1s interval — the countdown is plain text, the
   "Aage badhein" button label is static, and the mic/emergency sections
   never re-render per tick. TTS rate now follows the settings value.
6. Offline: the suite's offline reload test (production.spec.ts) passes
   — service worker serves the report screen with the network off.
- Post-push verification caught a 7th flaw (not in the E2E list): after
  the report flow, Home opened with the old scroll offset — hash
  navigation keeps scroll, so the sticky header covered the honest
  banner's top half. Fixed with `ScrollToTop` in App.tsx (scroll to 0
  on every pathname change), pinned by a dashboard.spec.ts test
  (scrollY 0 + banner below the 68px header). Verified by screenshot
  before/after.

Bugs the suite itself caught (all fixed in this step):
- FollowUpList crashed every page it rendered on: the Zustand selector
  `s.followups[incident.id] ?? {}` returned a NEW object on every
  getSnapshot call, so React's useSyncExternalStore looped to error
  #185 ("getSnapshot should be cached") and the error boundary showed
  "Kuch gadbad ho gayi". First full run: 22 failed / 6 passed, all
  through seedDemo → detail. Fix: module-level `EMPTY_FOLLOWUPS`
  constant. Only selector in the codebase with the pattern (grep-verified).
- Axe color-contrast on the dark dashboard: (a) an Astryx wrapper div
  (`display: contents`, class `xjp7ctv`) re-set the inherited text color
  to #171c22 between #root and the shell — fixed with `color` on
  `.db-shell`; (b) Astryx's layered `p`/`small` rules paint dark text on
  dark cards — fixed with un-layered `.db-flow p` and `.db-quick small
  { color: inherit }` + `color` on `.db-shield-alert` (its `p` rule never
  matched the `<p class>` itself); (c) Astryx secondary buttons inherit
  the shell's white text (via un-layered `button { color: inherit }`)
  while keeping their light #e0f2fe bg — fixed with an un-layered
  `.db-flow .astryx-button[data-variant="secondary"]` override (dark
  elevated bg, light text). Ghost (transparent) and destructive (red)
  buttons already passed.
- Mobile 390 overflow: header Settings avatar pushed 38px past the
  viewport (hidden on mobile — Settings is in bottom nav + drawer;
  scoped to that button only, the hamburger shares the class), then the
  Settings selects overflowed 10px (rows stack on mobile now).
- Test-only fixes (not app bugs): ₹20,000 / '1 items saved' / 'Chain
  sahi hai' strict-mode multi-matches (`.first()` / exact / region
  scoping); helpline renders as `<a>`, not `<button>`; timeline string
  is "Aapne RAKSHIO ko bataya", not "Incident darj hua"; drawer link
  scoped to the dialog (the hidden sidebar link matches first in DOM
  order).

Evidence: `npm run build` green (2.40s); first-load JS 983.20 kB
(gzip 318.96 kB) vs 655.74 kB Step 4 — shell cost (router + zustand +
framer-motion + lucide + Dexie in main chunk); lazy chunks IncidentsPage
440.00 kB, proofpack 517.51 kB (warning is the lazy proofpack chunk
only, never blocks first paint); `npx vitest run` **26/26**;
`npx playwright test` **28/28** (dashboard 17/17 incl. the 5 fix tests,
smoke 2/2, production incl. offline reload + render-crash fallback,
shots, all-screens); axe 0 violations on home, incidents page, Panic
and Incident screens; mobile 390 bottom nav + drawer + overflow 0.
Secret scan clean; no .env files; no binaries pushed.

## Rulings (Step 6)
- The FollowUpList crash is the reason the dashboard was NEVER green
  before this step: the suite was not run after the rebuild until the
  fixes landed, and every seeded flow hits the detail page. A one-line
  selector literal (`?? {}`) took the whole app down — selectors must
  return cached references; grep for `?? {}` / `?? []` in selectors on
  any future store change.
- Astryx styles live in a cascade layer: our un-layered rules always
  win, which is both the cause (button `color: inherit`) and the fix
  (overrides). Any future Astryx color surprise: check layers first,
  then the `display: contents` wrapper.
- First-load JS grew ~50% for the shell. Accepted: the dashboard is the
  Round 2 deliverable and the heavy chunks (charts, proof pack) are
  lazy. Do not "fix" by removing the shell deps.
- NOT redeployed. Live link still serves the Step 4 build (Step 5 dist
  `rakshio-dist-v3.zip` ready, redeploy is his call). This step is
  code-complete and pushed; deploy only on his word.
