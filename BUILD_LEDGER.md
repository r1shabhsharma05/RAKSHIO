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
