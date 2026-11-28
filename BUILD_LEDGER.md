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

## Step 7: complete (2026-11-27) — Damir unslop pass on the dashboard

Direction (polish mode, from the existing brand — no new direction):
Calm, exact, a little warm. World: a night-desk incident file — dark
ink-blue surfaces, one blue accent, amber only for the honest warning.
Moments: the Golden Hour Clock ring and the incident figures. Signature:
the amber honest banner, once per page.

Audit (signs.md, 6 screens shot at 1440 + code grep): LIGHT SLOP.
- Duplicate honest banner: `NoReportBanner` rendered in 15 flow
  screens AND the Shell `.db-banner` on every route — every tool page
  showed it twice; Gaps rendered it twice itself (3x). Removed all
  16 renders + the component + both dead CSS rules; Shell owns it now.
- Vault select rendered as a white bar: `.rk-input` styled only
  `textarea`/`input`, so `select` fell back to the UA white default.
  Added `select.rk-input` to the rule.
- Incidents pie was one tiny wedge in a big empty card (1 incident).
  Replaced with a ranked status list + thin bars (share = list with
  bars per the skill); bar x-label un-rotated (`angle={-20}` → 0) with
  the parenthetical stripped (`OTP dhokha (customer care)` → `OTP dhokha`).
- Search placeholder wordy (`Search — ID, bank, type, amount, UTR…`)
  → `Search`.
- Type: hero title + stat numbers at 800 → 700 (Step 5 cap).
- Deliberately KEPT: green/purple Quick Action buttons (the approved
  photo's design; WhatsApp green is a real brand color), bold hero,
  ✓/✗ text status marks (not emoji). No gradients, glows, pulse,
  shimmer, emoji, or exclamation marks found anywhere in src.
- Verification detour: the full suite hung twice — port 4173 was held
  by the Healthcare Hub preview (other chat) and 4174 by the portfolio
  preview, so tests hit the wrong apps and timed out; the suite's own
  4175 RAKSHIO preview was the live one. Ran the suite against 4175
  via a temp config (deleted after). Lesson: when a Playwright run
  hangs, check `ss -ltn` + the served `<title>` before re-running.

Evidence: build green; vitest 26/26; Playwright **32/32** (dashboard
20/20 incl. 2 new unslop tests — banner-once per tool page, dark
select + status list; smoke 2/2, production incl. offline reload,
shots, all-screens); axe 0 (dashboard spec); screenshots re-taken
after the fix (vault + incidents) and read. NOT deployed — live link
still serves the Step 4 build; deploy on his word.

## Step 8: complete (2026-11-27) — GSAP Home entrance + Lenis ruling

His order: "lenis skill use kr lena or gsap bhi frontend ke liye". Both
skills read in full first.

- **GSAP was already in the app.** `gsap` + `@gsap/react` were installed
  and in use in 3 screens (Actions, Incident, ReportFlow — 220ms
  crossfades, reduced-motion skipped). The gap was Home: the dashboard
  home had NO entrance animation at all — hero + widget cards appeared
  instantly. Added the missing piece in `src/dashboard/Home.tsx`
  (same established pattern): `useGSAP` + `gsap.fromTo` on
  `.db-card` — 220ms fade+rise, 40ms stagger, transform+opacity only,
  skipped entirely under reduced motion, 1930 button clickable from
  the first frame. TS caught one thing: `querySelectorAll` can be
  undefined — guarded before the tween.
- **Lenis NOT applied — the skill itself forbids it.** Lenis skill:
  "NOT for dashboards/app UIs where native scroll is expected" /
  "Never inside app dashboards, admin panels, data tables". RAKSHIO is
  a dashboard app UI, and it is a panic app — smooth-scroll hijacking
  could delay reaching the 1930 action. Native scroll stays. No
  landing/marketing page exists in the app where Lenis would fit.
- New test in `tests/dashboard.spec.ts` (dashboard now 21 tests):
  "gsap step 8: home cards end visible; reduced motion skips the
  entrance" — poll asserts every `.db-card` ends at opacity 1, then
  `emulateMedia({ reducedMotion: 'reduce' })` + reload asserts cards
  are fully visible at once with no entrance.
- Screenshot `tests/shots-local/gsap-home-1440.png` read: hero, tiles,
  clock, incident, quick actions all fully visible after the entrance;
  single honest banner; dim text inside the empty-state cards is the
  pre-existing muted empty copy, not the animation.

Evidence: build green (`tsc -b && vite build`); tsc clean; vitest
26/26; Playwright dashboard **21/21** (run against the 4175 preview —
4173 was Healthcare Hub, 4174 portfolio; same port rule as Step 7).
Deploy: v4 (Step 6+7) went live 17:39 IST, verified live
(`db-status-list` in the live IncidentsPage chunk, "Madad ke tools"
in the live index chunk, `NoReportBanner` 0, all v4 chunk filenames
200). This Step 8 build is NOT deployed yet — v5 deploy follows.

## Step 10: complete (2026-11-27) — Glassy dashboard redesign + Step 9 fixes

His order: "is dashboard ko mere dashboard se replace kr de mera purana
vala dashboard design hta ye vala lga de but mera data ho" — the
21st.dev GlassyDashboard component, with ALL RAKSHIO data and features,
plus the Step 9 bug fixes (language, TTS, mic, situation guide, Report
Fraud hardening) and the live-probe sidebar finding.

- **GlassyDashboard, verbatim.** `src/components/ui/glassy-dashboard.tsx`
  (1,360 lines) copied verbatim from the pasted source — markers
  verified (`gd-app` 31 hits, `studioPhoto`, `ATLAS`, `routeFromHash`).
  One additive deviation only: `export { dashboardStyles }` appended so
  the adapted shell reuses the same ~700 lines of CSS instead of
  duplicating them. The verbatim `GlassyDashboard` component itself is
  NOT rendered (it ships sample e-commerce views); `GlassShell`
  (`src/dashboard/GlassShell.tsx`) reuses only its `dashboardStyles` CSS
  + Dock/GSAP patterns and wires the 12 real RAKSHIO routes (HashRouter),
  the top pill bar (brand, ask/search dialog, language select, Caregiver
  badge, Offline Ready pill, theme toggle, settings), the 12-item side
  dock, the 5-item bottom dock, and the GSAP blur/fade route transition
  (320ms, skipped under reduced motion). Old `Shell.tsx` DELETED;
  `dashboard.css` rewritten (old chrome classes gone; all `.db-*`
  content classes kept). Background photo downloaded to
  `public/rakshio-bg.jpg` (271,505 bytes, local copy so the offline PWA
  keeps the look); Unsplash credit kept in the footer. Manrope installed
  (`@fontsource-variable/manrope`). Theme follows the pasted `demo.tsx`:
  auto-detect via prefers-color-scheme, toggle in the top bar, default
  light. No sample e-commerce data anywhere — every number is real saved
  data or the seeded ₹20,000 demo.
- **Language ×3 (Step 9.1).** `Lang = 'en' | 'hi' | 'hg'`; complete
  dicts for every key — en proper English, hi full Devanagari, hg
  Hinglish (the old Roman-Hindi strings). Default `'hg'`; stored `'en'`
  migrates to `'hg'` (old EN was Hinglish), stored `'hi'` stays.
  `speechLang` follows the UI language (hi/hg → hi-IN, en → en-IN).
  Panic-flow strings stay Hinglish by design. The dropdown bug is
  fixed: `<option>` elements get the component surface explicitly
  (light `#f6ece2`/`#25201e`, dark `#241c16`/`#fff6e9`) — verified in the
  dark-theme screenshot and by a computed-style test.
- **TTS tap-only (Step 9.2).** Auto-speak REMOVED from the calm card
  (`Panic.tsx` CalmPrompt) and from the Confirm readback — both now have
  an explicit button ("Suniye" / "Summary suniye") that speaks only on
  tap; `stopSpeaking` on dismiss/unmount. TTS never starts without a tap.
- **Mic (Step 9.3).** `VoiceAdapter` requests the mic first via
  `getUserMedia({audio:true})` (forces the permission prompt), verifies
  live input with an `AnalyserNode` level meter built from REAL mic data
  only (no meter when no real level — never a fake waveform), then stops
  the tracks. `Listen.tsx` is permission-first with distinct UI per
  error (denied → how-to steps + Retry + Text Mode; network → service
  unreachable; audio-capture → no mic found; no-speech → 15s window of
  zero interim/final/audio peak, then guidance while KEEPING listening +
  Retry). `continuous=true` + restart loop kept. Real-mic test still
  needs Rishabh on his own Chrome — never verified here.
- **Situation Guide engine (Step 9.4).** `src/engines/guide/` —
  deterministic, on-device, rule-based. NEVER called a trained model /
  AI / ML anywhere in UI, code, or docs (vitest asserts that). 14
  situations: upi-fraud, otp-scam, fake-customer-care, phishing-link,
  kyc-scam, refund-scam, investment-scam, sim-swap, qr-scam, job-scam,
  loan-app-scam, attempted-fraud, digital-arrest, remote-access. Each:
  recognize / first-5-minutes / 1930-bank-portal steps / don't-do /
  evidence to save. Only established official windows (1930 ≤48h, portal
  ≤24h, bank ≤3 working days); never promises recovery. Wired: after the
  Understanding Engine extracts a fraud type, the Incident screen shows
  "Is situation me kya karein"; route `/guide` (list + detail),
  reachable from Shield, Incident, and Home — NO dock entry; Shield
  Truth Card links to the matching guide. `guideForFraudType` covers
  all 8 extractor outputs; `guideForShieldRule` maps shield rule ids.
- **Sidebar (live probe).** The probe found navigation itself worked —
  all 7 gated sections rendered the IDENTICAL "Pehle incident banayein"
  panel, which read as "nothing opens". Every gated tool's empty state
  is now SECTION-SPECIFIC (`NeedsIncident({title, what, preview})`):
  name + what it does + why it needs an incident + a preview of what it
  will show + the "Report Fraud shuru karein" CTA. SW cache bumped
  `rakshio-v1` → `rakshio-v2` (+ `/rakshio-bg.jpg` in the shell list).
  Chunk-load recovery (`src/components/chunkRecovery.tsx`): a failed lazy
  chunk hard-reloads once, then shows a "Naya version aaya — reload
  karein" panel — never a silent blank.
- **Report Fraud hardening (Step 9.5).** TTS + mic + language-aware
  recognition + guide after extraction (above); Text Mode fallback
  always visible; calm card keeps its 10s dismiss (no auto-speak).

Verification — the five failures found by the suite, and what each was:
1. Quick actions (line 101): 'Bank Alert Kit' heading ×2 (view-head h1
   + screen h1) — test now uses `.first()`.
2. Axe: 6 color-contrast nodes — the glassy inline `<style>` rule
   `.gd-app :where(button){color:inherit}` ties with `.db-btn-red` on
   specificity but loads later, so buttons inherited dark ink. Fix:
   `.gd-app .db-btn-*` prefix (wins) + deeper 700-shade backgrounds
   (white on #ef4444/#15803d is 3.8:1; #b91c1c 5.9:1, #166534 7.0:1).
   Plus 1 label-content-name-mismatch: the ask pill's aria-label didn't
   contain its visible text — aria-label removed, the visible text is
   the name now (test updated to match it).
3. Mobile 390: 1px overflow — the actions row is 357px in a 346px bar
   (the component's own breakpoint is 760px, not 720px). Fix at ≤760px:
   hide the informational status pill (`.gd-pill-status`; Caregiver
   pill stays), the brand subtitle, and the top-bar Settings link (the
   mobile bottom dock already has Settings). One mis-fire caught by
   grep: the class first landed on the Caregiver pill — moved to the
   Offline pill (line 283).
4. Fix 1 (line 275): 'Report Fraud' link renamed 'Fraud Report Karein'
   under the hg default — test updated.
5. Vault widget — the long hunt. The test asserted on
   `getByText('Test SMS')`, but that matches the TEXTAREA's own value
   before any save, so `goto('/')` fired while the Dexie write was
   still in flight and Home's read saw a pre-write snapshot (0 rows).
   The Dexie indexed query was EXONERATED: a `toArray()` detour showed
   the same 0-while-raw-getAll-found-1 pattern, and the instrumented
   logs showed Home's read transaction was created before the write
   committed. The `toArray` change was reverted (indexed
   `where().equals().sortBy()` restored — it was never the problem).
   Fix: the test now waits for the 'Saboot save ho gaya' toast, which
   fires only after the write committed AND the re-read returned the
   row. Vault test 5/5 after the fix. Real-app note: the save toast is
   the app's own "write committed" signal; a user navigating mid-save
   would see the same stale-empty Home until revisit — accepted, the
   toast is the completion signal.

Evidence: build green (`tsc -b && vite build`, 2.61s); vitest
**32/32** (8 files, incl. 6 new guide tests); Playwright dashboard
**29/29** (2.1m; one incidents-test flake in an intermediate run —
passed in isolation and in the re-run); axe 0 on home + incidents
(inside the suite). First-load JS index chunk 905,113 bytes
(884K; was 983.20 kB Step 6 — shell cost, charts/proof lazy).
Screenshots read (`tests/shots-local/glassy-*.png`): light + dark home
1440, gated Action Plan empty state, Guide list (14 situations),
Settings (Hinglish select visible), home 390 (two-row top bar, bottom
dock labelled, no overflow). Secret scan clean. NOT deployed — live
still serves the Step 8 build; deploy needs his word.

## Rulings (Step 10)

- The verbatim GlassyDashboard component is a reference, not a
  render target: its views are sample e-commerce data. Only its CSS +
  Dock/GSAP patterns are reused; every number on screen is RAKSHIO
  data. Do not render its demo views.
- The bottom dock floats at all widths (component's own design:
  `position:absolute; bottom:-24px`, same as the side dock hanging
  left). Left as the source intends — it is quick access, not a bug.
- The `.gd-app` prefix rule: anything overriding the glassy inline
  `<style>` needs higher specificity than the component's own selectors
  (the inline style loads after the external sheet). `.gd-app .x`
  beats `.x`. Remember this for every future glass override.
- The vault test race is a standing lesson: never assert a save with a
  locator that also matches the input's own value — wait for the
  completion signal (toast / rendered row). An IndexedDB read created
  before a write commits sees the pre-write snapshot; that is not a
  Dexie bug.

## Step 11: complete (2026-11-27) — true-black dark mode + filled guide + filled empty pages

His order: "dark mode me black ho jaye blue nhi or situation guide vale
page ko bhr de khali lag rha h or jo bhi page khali lag rha h bhr de use
koi or detail dal de ya or clear krkr dal de usi detail ko ya fir kuch or
add kr de un pages pe upgarde" — dark mode truly black (not blue), fill
the Situation Guide page, fill every page that feels empty.

- **Dark = true black (Task 1).** The Step 6 navy (`#06101F` family)
  and the Glassy warm browns are gone from every dark neutral:
  `dashboard.css` `:root` → bg `#000000`, sidebar `#0a0a0a`, card
  `#111111`, elevated `#161616`, border `#262626`; dark `.db-flow`
  rk vars → `#000000`/`#111111`/`#161616`, calm card `#161616`, toast
  text `#000000`; glassy dark block in `glassy-dashboard.tsx` →
  neutral blacks (`--gd-surface #0a0a0a`, `--gd-card rgb(17 17 17 /
  58%)`, `--gd-rail rgb(10 10 10 / 62%)`, `--gd-ink #fafafa`,
  `--gd-muted #d4d4d4`, `--gd-focus #f5f5f5`); background photo dimmed
  (`brightness(.30) saturate(.45)`) + a FLAT black scrim
  (`rgb(0 0 0 / 62%)`, no gradient) over it, so the photo is a faint
  texture only. Chart stragglers fixed too: Golden Hour ring track
  `#262626`, Incidents chart grid `#262626`, tooltip `#111111`/`#262626`.
  Accents stay — blue primary, red emergency, teal, amber, the shield
  logo, the amber honest banner. Light theme UNCHANGED (verified: app
  background is not black in light). Catch found by reading the
  screenshots: the view-head h1 ("Home", "Action Plan"…) rendered in
  dim blue — it sits outside `.db-flow`, so it kept the light Calm
  `--rk-fg` (`#0c4a6e`, computed `rgb(12, 74, 110)`). Fixed with
  `.gd-app[data-theme="dark"] .gd-view-head h1 { color: var(--db-text) }`
  and pinned by the dark test (expects `rgb(248, 250, 252)`).
- **Situation Guide page, filled (Task 2).** Engine fields added to
  every guide (`category`, `timeNote`, `related`, `common?`): 9
  money-lost, 1 no-loss, 3 account, 1 message; time notes use only the
  official windows (1930 ≤48h, portal ≤24h, bank ≤3 working days);
  related links point at real guide ids (vitest asserts validity +
  exactly 3 commons: upi-fraud, otp-scam, fake-customer-care). The page
  (`GuidePage.tsx`, wide `.db-flow-wide` grid) now has: a "Sabse pehle
  ye teen karein" strip (1930 tel: link, Bank Kit link, cybercrime.gov.in
  link — on list AND detail); search over title + recognition + first-5
  steps; filter chips with counts (Sabhi 14, Paisa gaya 9, Paisa nahi
  gaya 1, Account 3, Call/Message 1); the 3 most common as pinned
  buttons (buttons, not links — the grid keeps the only link per title,
  which the Step 10 test clicks by name); every guide as a card with
  category chip, time note ("Samay kyun zaroori hai", amber left bar),
  first 2 recognition signs, and the first first-5-minutes step +
  "Poora guide padhein". Detail shows all 5 sections + time note +
  related guides. 20 new i18n keys (en/hi/hg) for the strip, search,
  chips, and headings; guide content stays Hinglish. One CSS fix from
  the screenshots: in the narrow `.db-flow` detail view the strip
  stacks vertically (3× ~8rem columns wrapped "1930 par call karein"
  mid-phrase).
- **Every empty-looking page, filled (Task 3).** `NeedsIncident` now
  takes `tips: string[]` + optional `extra`: every gated tool shows a
  "Kya yaad rakhein" checklist (3 real tips each — deadlines, what to
  keep ready, what never happens automatically). Bank's empty state
  adds a verified-helpline preview (SBI 1800 11 2211, HDFC 1800 1600,
  ICICI 1800 1080, Axis 1860 419 5555 — tel: links, same numbers the kit
  uses; full list of 10 lives in the kit). Home's no-incident widgets
  now teach the flow: clock shows the "Why it matters?" bullets,
  Current Incident lists what the card will hold, Action Plan previews
  the 5 steps (same titles as the live plan), Snapshot/Vault/Progress/
  Follow-up each explain what they will show (shared `CLOCK_WHY` /
  `PLAN_PREVIEW` consts — the live branches reuse them, no copy drift).
  Incidents empty adds a 3-step "how to start" list + a "Pehle Situation
  Guide padhein" link. Settings (5 sections) and the report flow were
  already full — untouched. No feature removed; all 12 routes, engines,
  Glassy shell, 3 languages, tap-only TTS, mic fixes intact.

Verification: build green (`tsc -b && vite build`, 2.54s); vitest
**33/33** (8 files, +1 new guide-fields test); Playwright
dashboard **32/32** (2.1m; 3 new Step 11 tests: dark-is-black incl. dark
axe 0 + h1 white, guide full incl. search/filter/detail, enriched empty
states). Two Step 10 tests needed updates for intentional changes: the
dark option colours are now `#111111`/`#fafafa` (were `#241c16`/
`#fff6e9`), and the guide-detail '1930 par call karein' text now
appears twice (strip + report step) so the assertion uses `.first()`.
Axe 0 on home + incidents + guide (light, in-suite) and on dark home
(in the Step 11 dark test). First-load index chunk 919.00 kB (was
905,113 bytes Step 10 — guide grid + empty-state copy). Screenshots
read (`tests/shots-local/step11-*.png`): home 1440 dark (true black,
white heading) + light, guide list + detail dark, bank + actions empty
states dark, home + guide 390 dark (no overflow, bottom dock labelled).
Secret scan clean. NOT deployed — live still serves the Step 8 build;
deploy needs his word.

## Rulings (Step 11)

- Dark theme rule: every neutral must be a neutral black/grey — no
  blue-tinted and no warm-tinted surface survives in dark. Accents
  (blue primary, red, teal, amber) are meaning, not tint, and stay.
- The view-head h1 lives OUTSIDE `.db-flow`, so the dark flow's
  `--rk-*` re-seat never reaches it — it kept the light `--rk-fg`.
  Any future heading outside `.db-flow`/`.db-card` needs the same
  explicit dark rule. (The suite's dark test now pins its colour.)
- Common guides on the list are buttons, not links: the grid must keep
  exactly one link per guide title (the Step 10 test clicks it by
  name; a duplicate would break strict mode).
- The golden strip stacks vertically inside `.db-flow` (detail view)
  and at ≤767px — three narrow columns wrap labels mid-phrase.

## Step 12: complete (2026-11-27) — normal type scale (user call: font far too big)

User call 27 Nov 21:52 IST: "project ka font or text bda dikh rha bhut jada".
Audit first (measured computed sizes, before): root 18px, body 18px,
view-head h1 48.24px, hero title 45px, hero sub 20.25px, card h2 22.5px,
card h3 20.25px, page title 22.5px (31.5px on Settings, which uses h1),
muted 18px, step strong 19.1px. At 390px: view-head 29px, hero 36px.
Root cause: `:root` was `font-size: 1.125rem` (the old Calm 18px minimum),
which inflated every rem size by 12.5%; on top of that the Glassy
view-head clamp maxed at 49px and the hero was 2.5rem.
Fix (systematic, not one-off): `:root` → `1rem` (16px base — the user's
call overrides the old Calm 18px minimum); h1 1.75→1.375rem, h2
1.375→1.25rem, h3 1.125→1rem; hero 2.5→2rem, hero sub 1.125→1rem; card h2
1.25→1rem, h3 1.125→0.9375rem; page title 1.75→1.375rem, page sub
1.0625→1rem; `.db-btn` 1.0625→1rem; stat `.n` 1.75→1.5rem; chip `.t`
1.125→1rem; ring-num 1.5→1.25rem; step/golden/common strong 1.0625→1rem;
mic label, transcript, inputs, primary button, checklist, script box
1.125→1rem; deadline-chip time 1.25→1.125rem; toast close 1.125→1rem;
Glassy clamps: view-head 29/3.35vw/49 → 24/2.2vw/32, metric value
22/2.35vw/35 → 19/1.7vw/27, summary 20/2vw/31 → 18/1.5vw/24,
balance number 28/3.85vw/57 → 22/2.2vw/34, device total 23→20px,
dialog h2 24→20px; inline GoldenHour strong 1.125→1rem, IncidentsPage
amount 1.5→1.25rem. After (measured, 1440): root/body 16px, view-head
31.68px, hero 32px, hero sub 16px, card h2 16px, card h3 15px, page title
22px (Settings), muted 16px, step strong 16px. At 390px: view-head 24px,
hero 32px. Touch targets kept: buttons min-height 3rem = 48px, pinned by
the new test (≥44px). Left alone deliberately: Glassy 9–14px meta/labels
(already small), `.db-chip .w` 11px caption, the line-236 clamp padding
(spacing, not text), mobile hero media query 2rem = 32px (matches the
hero target). No layout, colour, content, route, or feature changed.
Evidence: build green (2.67s); vitest 33/33; Playwright dashboard 33/33
(2.1m, incl. the new Step 12 type-scale test pinning root 16px and
headings ≤32px at 1440 + 390); axe 0 in-suite. Screenshots read
(`tests/shots-local/step12-after-*.png`): home 1440 light + dark, guide
1440 dark, vault + settings 1440 dark, home 390 dark. Before-shots kept
as `step12-before-*.png`. Secret scan clean. NOT deployed — live still
serves v6 (Steps 10+11); deploy needs his word.

Second half (same day, 22:03 IST): the live E2E probe on v6 found 12 bugs;
all folded into this same change, one push. Font target corrected SMALLER
than the first half (probe measured hero ~30–32px, section titles ~28–32px,
body/buttons ~17–18px as still oversized vs a typical 14–16px body):
hero 2rem→1.75rem (28px), view-head clamp max 32→28px, `.db-btn`
1rem→0.9375rem (15px), stat `.n` 1.5→1.375rem (22px). Measured after:
hero 28px, view-head 28px at 1440; 24px at 390. Buttons stay ≥44px tall
(min-height 3rem, test-pinned).

1. Extraction (MAJOR): "Mere SBI account se kal shaam 7 baje bees hazaar
   rupaye kat gaye" extracted ₹7 — the "7" from "7 baje" borrowed "hazaar"
   from the real amount via a 4-word lookahead window, and
   `parseNumberWords` scanned forward past non-number words. Fix in
   `src/engines/understanding/extract.ts`: `parseNumberWords` now parses
   only a run starting at the current word and returns `{value, consumed}`;
   `parseAmount` strips time expressions (`/\b(?:\d{1,2}|[a-z]+)\s+baje\b/`)
   before any scan, and validates only the run's own words (scale word in
   the run, or a money word immediately after). Vitest: the exact probe
   sentence → ₹20,000, SBI, fraudAt yesterday 19:00; "7 baje" with money
   but no amount → no amount.
2. Languages: only ~30–40% translated — body copy was hardcoded Hinglish,
   not keyed. Fix: 221 keys per locale in `src/i18n.ts` (EN real English,
   HI Devanagari, HG Hinglish), `t()` gained optional `{var}`
   interpolation; wired Home, GlassShell (banner/footer/search/theme),
   FollowUp (reminder labels at render; the .ics file keeps the Hinglish
   source strings), Settings, ToolPages (all 8 empty states + helpline
   preview), IncidentsPage, IncidentDetail. Panic flow stays Hinglish by
   design. Test: home body copy changes across en/hi/hg. Note: several
   existing spec assertions had to move to the keyed names (theme toggle,
   search prompt, export/wipe buttons, plan buttons, 'Sabhi' filter).
3. Light-mode contrast: glass panels were 23–48% opaque over the photo
   (`--gd-frame` 23%, `--gd-card` 46%, `--gd-inner` 37%) — text washed
   out. Raised: frame 82%, card 88%, card-light 80%, inner 78%, raised
   92%, rail 80%. Verified by screenshot (light home/bank 1366, home 390)
   + a new test asserting card alpha ≥0.8 + axe 0 in light.
4. Home contradiction: Golden Hour over-text said "1930 (48h) aur portal
   (24h) ki deadlines abhi bhi khuli hain" while the portal chip said
   "Samay khatm". Fix: `GoldenHour.tsx` reads `deadlineStatuses` and the
   line is deadline-aware — portal over + 1930 open says so and tells the
   user to still file on the portal; both over says both windows passed
   and to still call 1930 + bank. No invented deadlines. Test-pinned with
   the seeded demo (~30h old: portal over, 1930 open).
5. Coach Done: the button already showed a note + Ack button, but the
   probe saw no feedback. Fix: explicit toast ("Call tap log ho gaya —
   agla kadam: ack number bharein") + the note now starts "✓ Logged —".
   Test-pinned (toast + Logged note + Ack button).
6. Tamper test had no undo: it mutated the only vault entry via
   `tamperRecord`. Fix: new pure `tamperTestCopy(rows)` in `vault.ts` —
   clones rows in memory, corrupts the clone, reports what verification
   WOULD say; real Dexie rows never touched. UI shows the demo result in
   its own panel ("ye test copy par chala, asli Vault me kuch nahi badla")
   + an "Asli chain verify karein" button. `tamperRecord` stays exported
   (vault.test.ts uses it). Vitest: copy breaks, real chain verifies
   clean, real text untouched. Dashboard test: after tamper test, real
   entry verifies clean.
7. Layout overlaps at 1366×633: fixed bottom dock covered content;
   `.db-flow` was 28rem (narrow extraction panel); most pages had two
   H1s. Fix: `.gd-stage-scroll` bottom padding 41px→96px (desktop),
   17px→88px (mobile ≤760px); `.db-flow` 28rem→36rem; every content h1
   demoted to h2 (17 screens incl. Gaps ×2 + Skeleton, Home hero,
   IncidentsPage, IncidentDetail, SettingsPage, chunkRecovery) — the shell
   keeps the single H1; ErrorBoundary keeps its own (renders without the
   shell); the verbatim Glassy component's h1 is dead code, untouched.
   Test: exactly one h1 on all 13 routes (empty + seeded). Verified at
   1366×633 + 390, light + dark, 0 horizontal overflow. Known remaining
   cosmetic: the view-head title and the screen's own title still show
   the same words stacked (e.g. "Bank Alert Kit" twice on the page) —
   that is the pre-existing design, not a second H1.
8. Shield quirk: safe example "Your OTP is 482913" scored 0 — correct
   (a plain OTP notification with no share-request is NOT a scam; the
   score stays honest), but the rule looked blind. Fix: new `otpNote`
   field on `ShieldVerdict` — set when an OTP + 4–6 digits are present,
   rendered as an amber info note, never adds to the score. Vitest with
   the exact example (safe, score 0, note present) + dashboard test.
9. Settings label: "Calm prompt kitni dheere bole —0.70×." — the JSX
   space before the value was unreliable. Fix: single template string
   with the space guaranteed + "(1.00× = normal speed)" context; the
   label is now also keyed (`settingsTtsHint`, `{rate}` interpolation).
10. Judge Mode hard to find: not in search, #/judge fell through to Home.
    Fix: `navJudge` key (EN/HI/HG); `SEARCHABLE` = NAV + judge (Scale
    icon) in the palette; `EXTRA_TITLES['/judge']`; new
    `src/dashboard/JudgePage.tsx` route rendering `JudgeScreen` (seeding
    mirrors ReportFlow's confirm → incident detail); Home demo note links
    to /judge. No 13th dock item — search + link only. Test-pinned
    (search → navigate, direct #/judge, seed from the route, Home link).
11. Voice/mic live: NOT fixed from here — no mic-permission prompt
    appeared in the probe environment; needs the user on his own Chrome.
    Not claimed fixed anywhere.
12. Fonts: covered above (smaller targets).

Evidence (second half): build green (2.88s); vitest 37/37 (8 files: +2
extraction, +1 shield, +1 vault); Playwright dashboard 41/41 (2.6m,
incl. 8 new Step 12 tests: body-copy x3, coach toast, tamper-copy,
one-h1-per-page, judge route+search, shield OTP note, light alpha+axe,
deadline-aware text); axe 0 in-suite (light home+incidents, dark home).
Screenshots read (`tests/shots-local/step12-verify-*.png`): home 1366
light + dark, bank 1366 light, home 390 light + dark — light panels
solid, text reads, no overflow, dock clears content. Secret scan clean.
NOT deployed — live still serves v6; deploy needs his word.

## Rulings (Step 12)

- Type scale is pinned by test now (root 16px, hero/view-head ≤32px at
  1440 and 390). Any future display size above 32px needs the user's word.
- The old Calm 18px minimum is dead: `:root` is 1rem. Do not reintroduce
  an 18px root "for accessibility" — the user explicitly called the text
  too big, and 16px body with 48px targets is the accessible floor here.
- One H1 per page, owned by the shell. Content titles are h2. A bare
  `getByRole('heading', { name })` assertion on a tool page now matches
  the shell h1 AND the screen h2 — scope with `.first()` or the card.
- The tamper test runs on a COPY only (`tamperTestCopy`). Never call
  `tamperRecord` from UI code — it mutates real evidence.
- Amount extraction strips time expressions before any scan
  (`parseNumberWords` is strict-start, run-local guard only). A clock
  time must never become money.
- Dashboard chrome is fully keyed (221 keys × 3 locales); `t()` takes
  optional `{var}` interpolation. New user-facing dashboard strings go
  in `src/i18n.ts` — never hardcoded. Panic flow stays Hinglish by design.

## Step 13: complete (2026-11-27) — Situation Guide 14 → 32 situations

User call 27 Nov 22:50 IST: "or situation dal or upgarde kr kam se kam
30 situtaion dal". Added 18 new guides, every one with the same full
structure as the existing ones (recognize, first-5-minutes, report steps,
dontDo, evidence, category, timeNote from the official windows only,
related links that resolve):

- courier-scam (money-lost, common) — parcel held / "drugs in parcel"
  threat, customs-fee link
- lottery-scam — prize won, processing fee first
- electricity-scam — power-disconnection threat, fake bill link
- matrimonial-scam — shaadi rishta, advance/gift before marriage
- romance-scam — dating/online rishta, emergency money
- tech-support-scam (account) — fake virus pop-up, "support" number
- sextortion-scam (message) — video-call blackmail
- card-reward-scam — reward-points expiry / card-block, OTP demand
- olx-buyer-scam — fake payment screenshot, QR / "₹1 verify karo"
- upi-collect-scam — collect request sold as incoming payment
- delivery-fee-scam — address-update fee link
- crypto-scam — fake trading app, withdrawal fee/tax
- visa-scam — guaranteed visa, escalating fees
- rental-scam — too-cheap listing, advance before viewing
- gift-card-scam — payment demanded as a gift-card code
- task-scam (money-lost, common) — like/rating tasks, premium deposit
- scholarship-scam — fake admission/scholarship, processing fee
- travel-scam — fake flight/hotel booking, no confirmation

Common row is six now (was three): upi-fraud, otp-scam,
fake-customer-care, digital-arrest (newly pinned), courier-scam,
task-scam. Counts: Sabhi 32, Paisa gaya 25, Paisa nahi gaya 1, Account 4,
Call/Message 2.
Shield wiring: 'courier' → courier-scam (was phishing-link),
'prize-lottery' → lottery-scam (was null), 'upi-collect' →
upi-collect-scam (was upi-fraud). Extractor mapping unchanged — all 8
extractor outputs already map.
No GuidePage code change: search, filter chips, counts, and the common
row all derive from GUIDES. The common row is a 3-column grid — six
items render as two rows; mobile 1 column.
Evidence: build green (3.02s); vitest 37/37 (8 files; guide tests now
assert count ≥30, the six commons, and the new shield mappings);
Playwright dashboard 42/42 (incl. 1 new Step 13 test: list count, common
row, courier search + detail); axe 0 in-suite. Screenshots read
(`tests/shots-local/step13-guide-*.png`): list counts right, courier
detail full, 390 no overflow. NOTE: the shots render the light theme
(headless default) — the files were renamed to drop the wrong "-dark"
suffix. Secret scan clean. NOT deployed — live still serves v6; deploy
needs his word.

## Rulings (Step 13)

- Guide count is pinned at ≥30 by test (`guide.test.ts`). New situations
  must use the full structure and only the official windows in timeNote.
- Common row is capped at 6 — a seventh common needs the user's word.
- Shield rule → guide mappings must point at the most specific guide
  (courier → courier-scam, not the generic phishing guide). When a new
  guide covers an existing Shield rule better, re-point the rule.

## Step 14: complete (2026-11-27) — genuinely trained TF.js model on real SMS spam data

User call 27 Nov 23:12 IST: "TF.js trained model banao" + "isko trained
kro is situation and data sets pe" + "internet hugging face khi se bhi
dataset leke aao" + "ya kaggle se khi se bhi leke aao".

Dataset: `jngb-labs/sms-spam` (Hugging Face, UCI SMS Spam Collection
deduplicated) — 5,159 real rows, 4,517 ham / 642 spam, columns
label,text. SHA-256 verified against a fresh download
(7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff).
License in `ml/data/LICENSE.txt` (SMS Spam Collection v.1, verbatim in
`ml/README.md`): free, redistribution allowed, copyright attribution.
Re-download: `ml/download-data.sh`. Kaggle not used — no token exists,
none requested, no credential-free direct download.

Model: binary bag-of-words (1,500-token vocab built ONLY from the
training split) → Dense(32, relu) → Dense(1, sigmoid). Seeded (42)
80/10/10 split: train 4,127 / val 515 / test 517. `npm run train`
(Node CPU, ~1 min) rewrites the model + metrics + fixtures and
round-trip reloads the written file before reporting.
Artifact: `public/ml/shield-model/model.json` (264 KB, single file —
standard TF.js ModelArtifacts serialization, modelTopology + weightSpecs
+ base64 weightData, loaded via public `tf.io.fromMemory`; no binary
weight shard, nothing to upload separately). Tokenizer is one shared
module (`ml/tokenizer.mjs`) for train and browser — no drift.

REAL held-out test metrics (n = 517, never training data): accuracy
98.26% (508/517), precision 98.31%, recall 87.88% (TP 58, FP 1, TN
450, FN 8). These are the numbers the Shield screen quotes.

Shield wiring (Shield screen only): TF.js loads lazily on first check,
never on first load (separate 1.1 MB chunk, dynamic import). The model
score shows next to the rules verdict with an honest disclosure:
dataset name + 5,159 rows + held-out test accuracy 98.3% + "extra
signal only — rules are the explanation, model never overrides flags"
+ on-device, nothing leaves the phone. The 16-rules engine is
unchanged. The 32 Situation Guides are guides, NOT training classes —
never claimed otherwise.

Honest limits (in `ml/README.md` and the UI): English SMS spam from
2011 — does NOT cover digital arrest, UPI collect, crypto, task scams,
etc.; Hinglish coverage is none (out-of-vocabulary). Recall is the weak
side (87.9%): a low model score is NOT proof a message is safe. Seen
live in the screenshot: the Hinglish danger example ("Turant OTP
batao…") scores 1% safe from the model while the rules correctly say
KHATRA — the documented weakness, with the rules winning.

Rejected datasets (reasons in `ml/README.md`): bolewara Hinglish
(only 63 hand-written rows, not real messages); bhavya2910 synthetic
(Gemini-generated); ganesh9353 (templated, unclear provenance);
vichetkao (gated, needs HF login); Kaggle (no token).

Also fixed in this step (found by the new axe check on Shield):
`.rk-primary-btn` inherited the shell's dark text on blue (glassy
`.gd-app :where(button){color:inherit}` ties it on specificity and
comes later) — 2.71:1. One rule in `src/dashboard.css` restores white
text (light 5.2:1, dark 5.9:1). Pre-existing, not caused by the model.

Evidence: build green (3.72s); vitest 39/39 (9 files, incl. 2 new
model tests: real held-out fixtures + full test-split accuracy within
±0.02 of the reported number); Playwright dashboard 42/43 — the 1
failure (step 12 light-mode cards) is a flake, passes alone right
after, untouched by this change (no .db-card CSS touched); new Step 14
spec passes incl. axe 0 on Shield. Screenshots read
(`tests/shots-local/step14-shield-*.png`): verdict card + model score
+ disclosure render, Check button white-on-blue. Secret scan clean.
NOT deployed — live still serves v6; deploy needs his word.

## Rulings (Step 14)

- The model is an extra signal only. No UI copy may say the model
  "decides", "detects", or overrides the rules; no copy may say it was
  trained on the 32 situations.
- Metrics quoted anywhere must be the held-out test numbers in
  `ml/metrics.json` (accuracy 98.3%, precision 98.3%, recall 87.9%),
  never training accuracy. The vitest accuracy check pins this.
- Any tokenizer change retrains the model (`npm run train`) — train
  and browser share `ml/tokenizer.mjs`, never edit one side only.
- The Hinglish gap is a data gap, not a tuning gap: do not claim it
  fixed until a real labeled Hinglish dataset is trained on.

## Step 15: complete (2026-11-27) — more data, retrained model, 99% target NOT reached (honest)

User call 27 Nov 23:34 IST: "or data bdhao or train kro 99% accuracy
leke aao or data set pe tarin kro ar situtaion ke liye tarin kro advance
kro" — grow the data, retrain, bring 99% accuracy, train on datasets
and for the situations, advance the model.

Data (all REAL labeled, license-checked, SHAs in `ml/README.md`):
`jngb-labs/sms-spam` UCI SMS (5,159) + `SetFit/enron_spam` Enron emails
(seeded sample 6,000 of 33,716) + `zefang-liu/phishing-email-dataset`
(seeded sample 5,000 of 18,650, LGPL-3.0) = **16,128 merged rows**
(5,331 spam / 10,797 ham) after global normalized dedupe BEFORE the
seeded (42) stratified 80/10/10 split (train 12,902 / val 1,611 / test
1,615). Email text truncated to 600 chars. Reproduce:
`ml/download-data.sh` (raw to `ml/data/raw/`, not committed) then
`node ml/prepare-data.mjs`. Rejected with reasons in `ml/README.md`:
CloveAI india-spam-sms (templated — 5,586 distinct masked texts in
20,010 rows, mutated UCI templates), Shade63 multiclass (no source, no
license, reads generated — the multi-class set we wanted, unusable),
dbarbedillo multilingual (machine-translated UCI, Devanagari strips to
nothing), David-Egea (same data as zefang), FredZhang7 (same corpora
re-merged), plus the Step 14 rejects (bolewara hand-written, bhavya2910
synthetic, ganesh9353 templated, vichetkao gated, Kaggle no token).

Model (advanced): per-source vocab union (top 1,500 SMS + top 2,500
email tokens = 3,108, train split only) -> Dense(32, relu) ->
Dropout(0.2) -> Dense(1, sigmoid); class weights; threshold 0.7 tuned
on VALIDATION only. Artifact `public/ml/shield-model/model.json`
547 KB single file, no binary shard. Training accuracy now recorded
(Step 14 did not log it).

REAL metrics (held-out test, n = 1,615): accuracy **96.22%** (TP 487,
FP 25, TN 1067, FN 36), precision 95.12%, recall 93.12%. Train 99.90%,
val 95.84%. Per-source test: SMS 96.50% (precision 85.90%, recall
90.54%), Enron 96.67%, phishing 95.40%. **99% NOT reached.** Why:
train 99.9% vs val 95.8% = memorization (val flat ~96% from epoch 1);
cross-domain conflict — corporate email ham uses spammy words
legitimately, so merged SMS precision (85.9%) is weaker than the Step
14 SMS-only model (98.26% / 98.3% precision); noisy truncated email
text. What 99% would need (in `ml/README.md`): full datasets, richer
features, and real labeled modern Indian fraud messages, which do not
exist publicly. No split re-rolled, no test row trained on, no number
inflated.

Runs (same seeded split, selection by val only): run #1 merged-DF vocab
3,000, 20 epochs, no dropout — test 95.85%, SMS precision 79.1%
(vocab dilution: ringtone/kyc/otp/upi/aadhaar missing from vocab);
run #2 per-source vocab + 12 epochs + dropout — test 96.22%, val
95.84% — KEPT; run #3 run #2 + word bigrams (vocab 4,010) — test
95.79%, val 95.65% (phishing 97.2% but SMS precision 85.9% -> 71.6%)
— reverted, run #2 artifacts restored byte-identical.

Situations: no real labeled multi-class fraud dataset exists, so the
model stays binary scam/safe. Coverage is a keyword proxy on the
5,331 spam rows (`ml/README.md` table): covered (>=50) phishing-link,
investment, loan-app, tech-support, lottery, romance, refund; thin
(1-49) digital-arrest 44, upi-fraud 40, card-reward 35, visa 26,
task 21, courier 21, gift-card 16, travel 16, customer-care 12,
otp 9, sextortion 8, olx 4, electricity/matrimonial/scholarship 3,
crypto/kyc/sim-swap 2; none (0) qr-scam, upi-collect, delivery-fee,
rental, remote-access. The rules remain the primary defence there.

Shield wiring: disclosure now says "16,128 real messages (SMS +
email)" + test accuracy 96.2% + extra-signal-only; `mlModel.test.ts`
now uses the merged loader, the shipped threshold (0.7), 8 fixtures
(3 SMS spam + 3 SMS ham + 1 phishing + 1 safe email), and pins the
SMS-subset accuracy too (±0.05).

Evidence: build green (8.12s); vitest **39/39** (9 files, incl. the
updated mlModel checks — 8 fixtures, merged test accuracy + SMS subset
within tolerance); Playwright dashboard **43/43** (2.7m, incl. the
updated step-15 Shield disclosure test; the step-14 test was updated,
not deleted) + a temporary step-15 spec 1/1 with axe 0 on Shield
(spec deleted after use); screenshot read
(`tests/shots-local/step15-shield-1440.png`: lottery message, KHATRA
verdict, model score + new disclosure). Secret scan clean. NOT deployed
— live still serves v6; deploy needs his word.

## Rulings (Step 15)

- The 99% target was NOT reached (96.22% merged test). Never quote
  99%, never quote train accuracy (99.90%) as model quality — the
  numbers to quote are the held-out test numbers in `ml/metrics.json`,
  with the per-source breakdown (SMS 96.50% / Enron 96.67% /
  phishing 95.40%).
- The merged model is broader but WEAKER on SMS than Step 14
  (96.50% vs 98.26%). Say so wherever the model is described; do not
  present the merge as a pure upgrade.
- Model selection is by VALIDATION only. Three training runs total on
  the same seeded split; no further re-rolls to chase 99%.
- The 32 situations are still NOT training classes. Coverage claims
  use the keyword-proxy table in `ml/README.md` only.

## Step 16: complete (2026-11-28) — all 13 live E2E #3 bugs fixed

Source: `tests/live-e2e-report-v7.md` (live v7, 28 Nov 00:44–00:55 IST).
One line per bug:

1. **Model false negative (CRITICAL).** `vocabCoverage()` + `modelWarning()`
   (`src/engines/shield/mlModel.ts`, pure, unit-tested): when rules say
   danger and the model scores <0.5 (or vice versa) a red `role="alert"`
   warning shows — "Model aur rules alag bol rahe hain — rules ko mano.
   Model English SMS/email par train hua tha…" — and when coverage <0.5
   an amber low-coverage note shows. The score stays visible, never
   fudged, never hidden; rules stay the verdict. Pinned with the exact
   sentence "Turant OTP batao, warna account band ho jayega" (real model
   ~3% scam, coverage <0.5) in vitest + Playwright.
2. **English incomplete.** ~190 new i18n keys × EN/HI/HG; clock chips,
   incident card, snapshot, and the Coach/Bank/Portal/Vault/Shield/Care/
   Proof/Actions/Triage/Confirm/Gaps/Judge chrome are keyed
   (`formatDurationLang`, `fraudTypeLabel`/`methodLabel` with lang,
   `STATUS_KEY`, `labelKey` on deadlines). Engine-generated content stays
   Hinglish by design (1930 script, bank draft, portal deck, SOS text,
   guide content, rule truth/advice). Playwright switches to en and
   asserts the clock, the incident card, and Coach + Bank bodies.
3. **Top-bar overlap at 1366px.** Measured: with caregiver ON the actions
   row (~460px) overflowed its `1fr` cell (~421px) leftwards under the
   search pill. Grid is now `minmax(0, 1fr) minmax(200px, 340px) auto`
   (right column sizes to content; brand shrinks instead); the two-row
   top layout now also applies at ≤1060px. Bounding-box assertion with
   caregiver ON at 1366px + 390px.
4. **Bottom dock overlap.** Stage floor 605→360px so the fit formula
   governs on short screens; footer padding-left 34px clears the side
   dock rail; side dock capped with `max-block-size: calc(100% -
   clamp(66px, 16vh, 153px) - 6px)` (wrap-relative) + internal scroll.
   Root cause, measured not guessed: the remaining 6px of page scroll at
   1366×633 was the SIDE dock (its viewport-based cap ignored its own
   `top: clamp(66px, 16vh, 153px)` offset — bottom landed at 639px), not
   the stage. Test pins document scrollHeight ≤ innerHeight at 1366×633
   and the Shield card clearing the dock at end of scroll. Known
   cosmetic, unchanged: mid-scroll the floating dock still passes over
   stage content (pre-existing design); only end-of-scroll clearance is
   guaranteed.
5. **Guide orphaned.** 13th side-dock icon (BookOpen, after /proof) — the
   12 tool sections stay 12; Guide is a reference section. `SEARCH_ALIASES`
   added (`/guide`: situations, scam guide, fraud guide; `/judge`: demo,
   seeded); search "guide" and "situations" both find it.
6. **Dark not true black.** Photo `brightness(.30)` → `.12`, scrim
   `rgb(0 0 0 / 62%)` → `/ 82%` (~2% of photo luminance left). Test pins
   scrim alpha ≥0.8 and photo brightness ≤0.2 after toggling dark + axe 0.
7. **Slow loads.** Cause measured: only the Incidents chunk (Recharts,
   419KB) was lazy in App; Vault/Care/Proof chunks loaded only after
   navigation (click → mount → import → network → render). Local cold
   timings were already fast (incidents 515ms, vault 155ms, care 208ms,
   proof 401ms) — the live 5–11s was the cold CDN + 1MB main-bundle parse
   on the test device, not a code delay; the fix mitigates it. Shared
   loaders in `src/components/chunkRecovery.tsx` (`prefetchLazyChunks()`)
   + App warms all four on idle (requestIdleCallback, 3s timeout, 2s
   fallback) + side-dock links preload on hover/focus. After prefetch:
   incidents 325ms, vault 105ms, care 122ms, proof 96ms. No fake loading
   states. Pre-existing note: the vault.ts dynamic import is ineffective
   (also statically imported elsewhere) — not Step 16's to fix.
8. **Duplicate H1+H2 titles.** Page-level h2s removed where they repeat
   the shell H1 (Incidents, Settings, Guide list, NeedsIncident,
   Coach/Bank/Vault/Care/Proof/Shield/Judge tops). Kept where the text
   differs (AckBridge "Ack Bridge — 1930 ke baad", section h2s, report-flow
   screens). JudgeScreen gets its title back only inside the report flow
   (`showTitle` prop — there the shell H1 is "Fraud Report Karein"; on
   #/judge the shell H1 already says it). The two Step 10 tests that
   pinned the removed card h2s now assert the shell h1 + card aria-label
   instead (same coverage, not deleted).
9. **Confirm gate omits Bank.** `GapField` + Confirm + store now carry
   `bank` as the 4th question ("Konsa bank hai?"); `computeGaps` adds it
   when the bank is missing/low-confidence (exported for tests); the
   summary adds a `Bank {name}.` line; "Teeno sawaal" → "Chaaro sawaal".
   Unit-tested (bank in gaps iff unnamed; four-field coverage) + Playwright
   (Bank + HDFC visible on the gate).
10. **HDFC numbers.** VERIFIED live against HDFC Bank's official site
    (https://www.hdfc.bank.in/contact-us/customer-care, 2026-11-28):
    "Phone numbers mentioned here are the only Customer Care numbers of
    HDFC Bank" — 1800 1600 / 1800 2600 are correct; the E2E suspicion was
    wrong. Numbers unchanged; source URL + check date recorded in
    `src/engines/banks/banks.ts`.
11. **Follow-up Mark done needed two clicks.** Root cause was bug 4, not
    the state update (`markFollowup` was already a correct new-object
    set): the bottom dock covered the button at the bottom of Home. Fixed
    by bug 4; the existing Playwright test (one click → next reminder)
    passes.
12. **"10second" → "10 second".** JSX whitespace collapsed after the
    `{secondsLeft}` expression in Panic.tsx; now a template literal.
13. **Judge seed silently replaces the active incident.** Two-step: first
    click shows a `role="alert"` warning naming the current active
    incident (id + amount, "old incident stays saved"); Confirm seeds,
    Cancel dismisses. The active incident line is shown on the page.
    Caregiver default: `DEFAULT_SETTINGS.caregiver` was already `false` —
    the E2E "ON by default" was a persisted setting from E2E #2's toggle
    test in the same device-browser profile (localStorage persists across
    E2E runs), not a code default; unit test asserts fresh defaults OFF.

Also fixed while in there: three copy regressions the suite caught — the
Shield example buttons were renamed by keying ('Danger example' →
'Khatra example'; restored to the original English labels in HG), the
Coach Done button/note wording drifted from the pinned Step 12 text
(restored verbatim), and the tamper-broken line said "safe hain" where the
Step 12 test pins "surakshit hain" (restored). Lesson: keying must not
rename pinned copy — see Rulings.

Evidence: build green (7.32s); vitest **49/49** (12 files: +5 mlModel
disagreement/coverage, +2 clock durations, +3 reportFlow bank gaps,
+incidents defaults); Playwright dashboard **43/43** + new
`tests/step16.spec.ts` **8/8** = **51/51** (3.3m, incl. axe 0 in-suite
and the dark-home axe check in the bug-6 test); screenshots read
(`tests/shots-local/step16-home-1366-light.png`,
`step16-home-1366-dark.png` — true black, top bar fits;
`step16-shield-danger-1366-dark.png` — KHATRA + 3% score + red
disagreement warning + disclosure, card clears the dock at end of scroll;
`step16-guide-1366-dark.png` — 32 situations, "Poora guide padhein →"
links clear of the dock; `step16-home-390-dark.png`). Secret scan clean.
NOT deployed — live still serves v7; deploy needs his word.

## Step 17: complete (2026-11-28) — all E2E #4 findings fixed (full English + 1034px)

1. **Full English (E2E #4 bug 2, user call: "English bhi poora").** ~120 new
   i18n keys × EN/HI/HG, wired through with `t()`:
   - Report flow — Panic.tsx calm card ("You are safe", countdown, TTS
     line), mic screen, emergency row, caregiver toggle, demo/judge links;
     Listen.tsx voice + text mode (every mic error, the placeholder,
     "Understand this"); Confirm read-back summary (TTS) + the When/Method
     values; BackButton everywhere.
   - Shield result card — the 16 rule explanations, Truth ×3, Advice ×2
     and the OTP note now come from `analyzeShield(text, lang)`; the
     default 'hg' returns the exact old strings (50-message test set
     unchanged, otpNote byte-identical).
   - Coach 1930 script — sentences keyed; the when-line is rebuilt from
     the stored Date via `whenText()` (EN "yesterday at 10 AM", HI
     "कल सुबह 10 बजे", HG keeps the stored display string verbatim), and
     the checklist Time row uses the same line (the first screenshot pass
     caught "Time: kal, 10 baje" leaking there — fixed, test-pinned).
   - Bank draft + fraud-line note — `bankDraft(stored, lang, bankName?)`
     keyed; `BankInfo.blockSteps` is now `{en, hg}` per bank with a
     `bankBlockSteps()` helper (HI keeps the Hinglish text, as before).
   - Portal Copy Deck — `portalCopyDeck(stored, ack, lang)`; labels,
     yes/no, unknown values and the Date/Time value (via `whenText`) all
     translate. The Settings note now says the whole app follows the
     language (was: "the panic flow always stays in Hinglish").
   - Model line wording — "thinks this is safe/scam" → neutral "scored
     this as safe/a scam" (EN/HI/HG keyed); Step 16 test regex updated.
   - OUT OF SCOPE, recorded: the 32 Situation Guides stay Hinglish
     (long-form content, E2E did not flag them); the SOS text and the
     Latin-script PDF stay Hinglish by design. `fraudTypeLabel` /
     `methodLabel` / `whenText` moved into `i18n.ts` so the engines can
     use them without importing React components; `shared.tsx` re-exports
     them (no caller changed).
2. **1034px Mark done needed two clicks (bug b).** Reproduced at
   1034×633 in Playwright: with the button parked at the stage viewport's
   bottom edge, `elementFromPoint` returned a dock link (`A.active`) and
   one real mouse click did NOT advance. Root cause, measured: the
   floating bottom dock overlaps the bottom ~29px of the stage at every
   width, and a button scrolled to that zone is unclickable. Fix:
   `scroll-padding-bottom: 40px` on `.gd-stage-scroll`, so any
   scroll-into-view (Playwright click, keyboard focus, anchor) keeps the
   target above the dock. Test parks the button at the bottom edge, asserts
   the hit target is the button after scrollIntoView, then one click
   advances to "all follow-ups done".
3. **1034px footer unreachable (bug c).** Reproduced at 1034×633:
   `document.scrollHeight` 678 vs viewport 633 = 45px page overflow, and
   wheeling over the stage never scrolled the page
   (`overscroll-behavior: contain`), so the footer never came into view.
   Root cause, measured: the stage fit `calc(100svh - 165px)` assumes the
   one-row top bar (~68px); below 1060px the top bar is two rows (~107px).
   Fix: in the ≤1060px media query the fit is `calc(100svh - 212px)`
   (measured 45px overflow + 2px slack). Test pins page overflow ≤ 0 and
   the footer fully in view at 1034×633 and 1034×768.
4. **Caregiver default OFF (bug d).** Already pinned — unit test
   (`DEFAULT_SETTINGS.caregiver === false`) + Step 16 Playwright test on
   a fresh profile (`aria-checked=false`). No code change. Live
   verification stays impossible without wipe (forbidden) — pinned by
   tests, NOT claimed live-verified.
   Bonus fix the new axe test caught (pre-existing, not in the E2E list):
   the mic button label inherited dark `--gd-ink` on the blue button
   (2.71:1) — the glassy `:where(button){color:inherit}` rule ties with
   `.mic-btn` and the later inline `<style>` wins. `.gd-app .mic-btn {
   color: #ffffff; }` restores white (5.9:1 light, 5.6:1 dark), same
   pattern as the existing `.db-btn-red` fix. Known pre-existing item,
   NOT fixed here: the dark listening-state mic (#f87171 bg) is ~2.7:1
   with white text — same before Step 17, out of scope.

Evidence: build green (7.60s); vitest **54/54** (13 files: +5 Step 17
localization tests — whenText, Shield EN/HG, bank draft byte-identical
HG, block steps, portal deck); Playwright **59/59** across the full
local suite (dashboard 43 + step16 8 + step17 6 + smoke 2 + production 6
+ all-screens 1, 13.5m, incl. axe 0 on the Report page in English);
screenshots read (`tests/shots-local/step17-report-en-1366.png` —
"You are safe", "This card will close in 10 seconds.", white "Speak" on
blue; `step17-shield-en.png` — DANGER + English Truth; `step17-coach-en.png`
— full English script + "Time: yesterday at 10 AM"; `step17-home-1034-footer.png`
— two-row top bar, footer fully visible, dock clear of it). Secret scan
clean. NOT deployed — live still serves v8; deploy needs his word.

## Rulings (Step 16)

- The model score is never fudged, hidden, or overridden. Disagreement
  is shown as a warning; rules stay the verdict. If the model ever
  disagrees again on a new sentence, the warning — not a retrain on
  invented data — is the fix.
- Keying copy into i18n must preserve pinned wording exactly. Three
  regressions in this step (Shield example labels, Coach Done
  button/note, tamper "surakshit hain") were all caught by the existing
  suite — the suite is the contract; copy changes go through it.
- Geometry bugs are measured, not re-derived. The 6px page overflow was
  the side dock's bottom (639px), not the stage stack — two wrong
  formula tweaks (165→175→165) before the probe found it. Probe first.
- An unclickable button is not always a state bug: bug 11's two-click
  follow-up was bug 4's dock covering the button.
- "ON by default" reports must be checked against a fresh profile first:
  the caregiver flag was persisted localStorage from an earlier E2E run,
  not a code default.
- The floating bottom dock still passes over stage content mid-scroll by
  design. Only the page fit and the end-of-scroll clearance are
  test-pinned; do not claim the dock never covers anything.
