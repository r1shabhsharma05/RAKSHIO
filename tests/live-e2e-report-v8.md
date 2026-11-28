# Live E2E #4 — RAKSHIO v8 (Step 16) — 28 Nov 2026, 02:08–02:16 IST

Device Chrome, 1366px viewport, English mode. v8 = Step 16 (13 fixes).
No real calls: 1930/bank never dialled, no complaint, no message, wipe/reset not used,
Judge reseed cancelled after confirmation appeared.

## 13 fixes — verdicts

| # | Fix | Verdict |
|---|-----|---------|
| 1 | Model/rules disagreement warning | VERIFIED — rules DANGER 9, red warning shown, model 3% as plain text (no green badge). Minor: line still literally says model "thinks this is safe". |
| 2 | English complete | STILL BROKEN (partial) — Home/Vault/Care/Proof/Settings fully English. Report page, Shield result card, Coach script, Bank draft, Portal Copy Deck still Hinglish. Settings states "The panic flow always stays in Hinglish". |
| 3 | Top-bar overlap 1366px | VERIFIED — one row, no overlap. |
| 4 | Bottom dock overlap | VERIFIED at 1366px (footer, Shield card incl. model line, Guide link all visible). Caveat: at ~1034px Home footer not reachable, dock overlaps card bottom edge. |
| 5 | Guide reachable | VERIFIED — sidebar link + search "guide" finds it. |
| 6 | Dark true black | VERIFIED — page background solid black (4x crop). |
| 7 | Page loads | VERIFIED — Incidents/Vault/Care/Proof render in ~1s, no skeleton. |
| 8 | No duplicate titles | VERIFIED — H1 once per page. |
| 9 | Confirm gate Bank question | VERIFIED — 4 items incl. Bank: SBI; summary mentions bank. (No separate "Konsa bank hai?" asked — SBI was extracted from probe text.) |
| 10 | HDFC helplines | VERIFIED — 1800 1600 / 1800 2600 shown. |
| 11 | Mark done 1 click | VERIFIED at 1366px (1h → 24h → 3d, one click each). Caveat: at ~1034px first click on 7-day follow-up did not advance. |
| 12 | "10 second" | VERIFIED — "10 second me ye card band ho jayega." |
| 13 | Judge confirm / caregiver default | PARTIAL — Judge confirm VERIFIED (names #RK-MWZG7OCM ₹20,000, stays saved). Caregiver OFF by default NOT VERIFIED — session inherited persisted ON state from E2E #3; cannot test without wipe (forbidden). |

Score: **10 verified, 1 partial, 2 still broken/unverifiable.**

## Regression — all PASS

- Home widgets (clock, incident card, action plan, snapshot, follow-ups, demo).
- Report probe "Mere SBI account se kal shaam 7 baje bees hazaar rupaye kat gaye" → ₹20,000, incident #RK-MWZG7OCM (SBI, UPI, "kal, 7 baje").
- Coach Done → "✓ Logged — the call button was tapped…", 1930 not called.
- Portal — ack 1930TEST12345 saved, Copy Deck updated, countdown "23 hours 59 min".
- Bank SBI→HDFC — helplines + draft updated.
- Vault — "Test fraud SMS" (hash 121b4269…), "✓ Chain is correct — 1 entries", tamper test "Chain BROKEN — record #1 was changed" on copy only, real entries safe.
- Shield — danger DANGER 9 / model 3%, suspicious SUSPICIOUS 5 / 62%, safe 0 / 1%.
- Care — SOS QR renders, wa.me link verified (not clicked).
- Proof — PDF 2 KB + ZIP 3 KB downloaded, "downloaded" toasts.
- Incidents — search "SBI" → 3 cards, "Reported (2)" → 1 card.
- Settings — language/caregiver/demo-region switches work.
- Guide — "SIM" → SIM swap full detail; "courier" → "Parcel / courier dhokha" full detail + related.

## New bugs

(a) **Medium** — English incomplete: Report, Shield result card, Coach script, Bank draft, Portal Copy Deck remain Hinglish in English mode.
    NOTE: Step 16 deliberately kept "engine content" Hinglish (1930 script, bank draft, SOS text, guides, rule text) — the E2E treats this as broken. Decision needed: translate panic flow too, or keep Hinglish by design?
(b) **Low** — at ~1034px viewport, first "Mark done" click on 7-day follow-up did not advance; second click worked.
(c) **Low** — at ~1034px viewport, Home footer not reachable at max scroll; dock overlaps card bottom edge.
(d) Unresolved — caregiver ON in persisted session; first-load OFF default unverifiable without wipe.

## Test artefacts left in app (browser local only)

Incident #RK-MWZG7OCM (₹20,000, SBI, UPI), Vault entry "Test fraud SMS", ack 1930TEST12345,
SOS consent checked, some follow-ups marked done, language English. Seeded demo #RK-MWZDCVPR untouched.
