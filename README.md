<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=26&pause=1000&color=0369A1&center=true&vCenter=true&width=600&lines=RAKSHIO;Fraud+Golden+Hour+Response+System;Panic+me+bhi%2C+sahi+kadam.)](https://bright-boba-9edf34.netlify.app)

**Voice-first cyber fraud recovery companion for India.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://bright-boba-9edf34.netlify.app)
[![Tests](https://img.shields.io/badge/vitest-26%2F26-4B8BF5?style=for-the-badge)](https://github.com/r1shabhsharma05/RAKSHIO)
[![Playwright](https://img.shields.io/badge/playwright-9%2F9-2EAD33?style=for-the-badge)](https://github.com/r1shabhsharma05/RAKSHIO)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://github.com/r1shabhsharma05/RAKSHIO)
[![Zero backend](https://img.shields.io/badge/backend-none-0369A1?style=for-the-badge)](https://github.com/r1shabhsharma05/RAKSHIO)

### 👉 Try it live: [bright-boba-9edf34.netlify.app](https://bright-boba-9edf34.netlify.app)

</div>

After UPI fraud, an unauthorised debit, a fake customer-care call or an OTP
scam, the victim speaks what happened in Hindi/Hinglish — RAKSHIO extracts
the facts, confirms them back, and walks the victim through the first hour:
stop the loss, call 1930, notify the bank, complete the portal complaint.

Built for Scaler × Wispr Flow **"India Runs on Voice"** — Round 2, Track 5
(Everyday Access). Solo entry, Rishabh.

## Screenshots

| Panic | Incident | Actions |
|---|---|---|
| ![Panic screen — giant mic, 1930 call button](tests/shots/panic.png) | ![Incident card — confirmed facts, timeline](tests/shots/incident.png) | ![Actions — Golden Hour Clock, action queue](tests/shots/actions.png) |

## What RAKSHIO does NOT do

- **It never files a report.** It guides the victim to call 1930 and to file
  at cybercrime.gov.in — it does not call, file, or recover anything itself.
- **It never guarantees recovery or a refund.**
- **It never asks for or stores OTP, PIN, CVV, UPI PIN, card numbers, or
  Aadhaar.** Numbers spoken next to OTP/PIN words are masked before storage.
- **It has no backend, no API keys, no server.** All data stays in the
  browser's localStorage on the victim's own phone.

## Quick Start

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production build (tsc strict + vite)
npm test        # vitest unit tests (26)
npx playwright test  # smoke flow + axe-core + production checks (9 tests)
npm run preview # serve the production build
```

Requires Node 20+. Speech recognition needs Chrome/Edge (Web Speech API);
without it the app silently offers Text Mode instead of a dead mic button.

## Step 1 — what works (Phase 0–1 of the master plan)

- Panic screen: giant mic, 10-second skippable calm prompt (slow TTS),
  1930 call button, bank/family placeholders labelled Step 2.
- Voice Adapter: SpeechRecognition + SpeechSynthesis behind one interface,
  hi-IN primary / en-IN fallback, silence-restart, Text Mode fallback.
- Understanding Engine: deterministic rules only, no LLM — Hindi number
  words (`bees hazaar` = 20,000, `dedh lakh` = 150,000), Devanagari digits
  and words, 12-digit UTR, bank/UPI-app lexicon, weighted fraud-type
  scorer, date/time words. Every field carries a confidence score; missing
  fields are never guessed.
- Flow: Panic → Listen → Extract → Gap questions (one at a time, "Pata
  nahi" allowed) → Confirmation gate (TTS + large text, card locked until
  amount/time/method are confirmed or marked unknown) → Incident card +
  Panic-to-Proof timeline.
- Golden Hour Clock: live timer, deadlines as data with sources (1930
  within 48h, portal within 24h, bank within 3 working days); the Action
  Queue re-orders as deadlines approach.
- 1930 Call Coach: `tel:1930` button, 30-second script from confirmed
  facts, checklist, "Done" logs only that the button was tapped.
- Demo aid: "Demo data bharo (₹20,000 UPI scenario)" fills the seeded
  story so the loop runs without a mic.

## Step 2 — what works (Phase 2 differentiators)

- **Evidence Vault:** IndexedDB + SHA-256 hash chain + redaction + Verify
  screen. Tamper test turns the chain red and names the broken record.
- **Ack Bridge:** 1930 acknowledgement number + 24-hour portal countdown +
  field-by-field Portal Copy Deck.
- **Smart Triage Router:** lost money → 1930/bank/portal; attempted fraud,
  no loss → Chakshu (Sanchar Saathi, 30 days).
- **Second-Scam Shield 2.0:** 12 weighted red-flag rules + Truth Card.
  50-message test set: **50/50 (100%)**, target was 90%.
- **Bank Alert Kit:** 10 banks, helplines verified 2026-11-27; block steps;
  pre-filled draft (review before sending — RAKSHIO never sends it);
  reference-number field; NPCI link.
- **Care Circle:** consent-first SOS card, WhatsApp deep link (number never
  stored), offline QR SOS card.
- **Bilingual Proof Pack:** Latin-script Hinglish PDF + ZIP + root-hash QR.
- **Judge Mode:** seeded ₹20,000 scenario, one button, no mic.
- **Caregiver Mode:** badge on every screen, records labelled.

## Step 3 — proof

- Vitest: 21 tests (understanding 12, shield 50-message set, vault 3,
  triage 4) — `npm test`.
- Playwright smoke flow (real Chromium): demo → confirm gate → incident
  card → Golden Hour Clock → Vault add/verify/tamper → back; plus Shield
  Truth Card — `npx playwright test`. axe-core: 0 violations on Panic and
  Incident screens. Production spec adds: offline reload via service
  worker, corrupt-storage fallback to Panic, lazy Proof load + PDF
  download + toast, Ack save/copy toasts, keyboard-focusable mic,
  render-crash fallback (fault injection).
- Docs: `docs/PRIVACY.md`, `docs/THREAT_MODEL.md`, `docs/DEMO.md` (exact
  3-minute script for 29 Nov), `docs/decisions/` (3 ADRs),
  `docs/RAKSHIO-pitch-deck.pdf` (8 slides; source `.html`, export via
  `node scripts/export-deck.mjs`).

## Step 4 — production upgrade (27 Nov)

- **Offline PWA:** service worker (`public/sw.js`, versioned cache) — app
  shell loads offline after the first visit; updates never break the panic
  path mid-session. Manifest has a stable `id`.
- **Code-splitting:** Vault, Proof and Care load on demand (React.lazy).
  First-load JS 1,287 kB → 656 kB (−49%; gzip 456 → 213 kB); the heavy
  Proof Pack (pdf-lib) only loads when opened.
- **Custom RAKSHIO theme:** Astryx `defineTheme` on the Calm palette —
  secondary buttons finally read as tappable, not disabled.
- **Error boundary + toasts + skeletons:** a render crash shows a calm
  fallback with 1930 one tap away; every save/download/copy confirms with
  a toast; Extracting and lazy screens show skeletons.
- **Polish:** inline styles 44 → 0 (classes + typed components), helper
  text at the 18px Calm minimum, dead buttons removed from Panic, OG/Twitter
  meta, shield favicon. TypeScript `strict: true`, zero `any`.
- Stack: React 19 + TypeScript + Vite — no plain-HTML pages; index.html is
  only the Vite entry shell.

## Step 5 — Damir unslop pass (27 Nov, "kill ai gradient")

- **Verdict: light slop.** Audit against the unslop signs list found one
  real sign — a blue glow halo on the giant mic button — plus small
  copy/type/motion nits. No gradients anywhere, no emoji, no hype copy.
- **Color:** mic glow (`rgba(3,105,161,0.35)` shadow) → soft neutral
  shadow; toast shadow likewise neutralised. The mic keeps prominence
  through size + solid Calm blue, not glow.
- **Copy:** "Aap safe hain." → "Aap safe hain" (headline, no trailing
  period); "Step 2 tools" → "Madad ke tools" (build-phase jargon out of
  the UI).
- **Type:** wordmark and deadline figures 800 → 700 (700 kept on buttons
  and values — legibility for elderly victims, deliberate).
- **Motion:** skeleton shimmer loop removed; loading bars are static now.
- Direction kept from Step 4: calm, exact, a little warm; help-desk
  counter world; moments = giant mic + Golden Hour Clock; signature = the
  permanent honest banner.
- Evidence: build green, vitest 26/26, Playwright 9/9, axe 0 violations;
  fresh screenshots confirm the halo is gone.

## Deliberately NOT done

- Demo video (script ready in `docs/DEMO.md`, record 29 Nov).
- Dashboard submission (30 Nov 11:59 pm) — needs Rishabh's word.

## Architecture

```
src/
  voice/          VoiceAdapter (SpeechRecognition/Synthesis), prompts
  engines/
    understanding/  extract.ts — deterministic parser (Appendix A rules)
    orchestrator/   machine.ts (screen state machine),
                    deadlines.config.ts (deadlines as data + sources),
                    clock.ts (deadline states, action ordering)
  screens/        Panic, Listen, Gaps, Confirm, Incident, Actions, Coach
  theme/          rakshioTheme.ts — Astryx defineTheme on the Calm palette
  components/     Toast (confirmation toasts), ErrorBoundary (calm fallback)
  state/          store.ts — localStorage only
  demo/           seed.ts — ₹20,000 UPI demo scenario
```

Design: Calm Mode tokens (18px min text, 48px touch targets, high
contrast, one action per screen). Motion is calm only — 220ms crossfades,
press feedback, no loops, reduced-motion respected. Primitives from
Astryx (Button, Badge, Card); the giant mic button is hand-built because
no library ships a 160px calm panic button.

## Docs

- `docs/PRIVACY.md`, `docs/THREAT_MODEL.md`, `docs/DEMO.md`
- `docs/decisions/` — ADRs for the significant calls (local-only storage,
  deterministic engine, no backend, Astryx primitives).
- `docs/RAKSHIO-pitch-deck.pdf` — 8-slide pitch deck (source
  `docs/RAKSHIO-pitch-deck.html`, export with `node scripts/export-deck.mjs`).
