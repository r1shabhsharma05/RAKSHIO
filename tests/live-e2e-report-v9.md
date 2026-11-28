# Live E2E #5 — RAKSHIO v9 (Step 17) — 28 Nov 2026, 10:58–11:11 IST

Device Chrome first, then moved mid-run to cloud browser (session state lost, full flow
re-run in a fresh profile: new incident #RK-MWZZ9ZM1, ₹20,000, probe 11:06 am).
English mode. No real calls, no complaint, no message, wipe/reset not used.

## Method caveats (matter for the verdicts)

- 1034px was NEVER truly tested: cloud window fixed at 1919px, cannot resize.
  Closest was 175% zoom ≈ 1097 CSS px, plus 150% zoom ≈ 1279 CSS px proxy.
  At 1097px the ≤1060px media query (Step 17's 212px stage fit) does NOT apply,
  so the "1034px fix still broken" verdict rests on a width where that fix
  does not trigger.
- 1366px "dock hides buttons" observations are mid-scroll states. Per Step 16,
  the floating dock passing over content mid-scroll is by design; only
  end-of-scroll clearance is test-pinned.
- **Verification note (28 Nov, after the run): both Step 17 CSS fixes ARE in the
  live v9 bundle** — `scroll-padding-bottom: 40px` and `calc(100svh - 212px)`
  both present in live `index-Srw5Lu4-.js` (the glassy CSS ships inside the JS
  bundle, not the .css file). So the E2E claim "the claimed dock fixes did not
  land" is WRONG. The overlap seen at max scroll needs a different explanation
  (scroll-padding only affects scroll-into-view, not the dock's static visual
  position) — Step 18 must reproduce at true widths and measure bounding boxes.

## Step 17 fixes — verdicts

(1) FULL ENGLISH — PARTIALLY VERIFIED. Verified: Report "You are safe" /
"This card will close in 10 seconds"; mic prompts + errors English; Confirm
read-back English (Amount ₹20,000, When "yesterday at 7 PM", How UPI, Bank SBI
4th item); Shield Truth/red-flags/advice English; model line "scored this as
safe" (danger 3%, safe 1%); Coach script fully English; Bank draft + block
steps English; Portal Copy Deck labels English ("1930 Ack number", "Amount",
"Date / Time", "Bank / App", "Method", "UTR / Reference", "Fraud type",
"OTP/PIN shared?", "Contact channel"); Settings "The whole app follows this
language", no Hinglish claim. STILL BROKEN: incident detail page
(/#/incidents/rk-mwzz9zm1) almost entirely Hinglish — "Aapka incident card",
"Rashi", "Kab hua", "Kaise gaye", "Bank / App", "UTR — Nahi mila",
"Is situation me kya karein", "Panic se Proof tak", "Fraud hua / kal, 7 baje",
"Aapne RAKSHIO ko bataya", "Baaki hai", "Aage ke kadam dekhein",
"Madad ke tools", "Evidence Vault — saboot save karein". Leftovers (LOW):
"Naya report shuru karein" button, "Notification band karein" dismiss,
Care SOS preview text ("Mujhe fraud hua hai — madad chahiye. Rashi: ₹20,000.
Samay: kal, 7 baje…"). 32 Situation Guides intentionally Hinglish — not flagged.
(2) 1034px VIEWPORT — STILL BROKEN (per E2E, with the caveats above).
Mark done: at ~1097px first TWO clicks did nothing, third advanced the
follow-up (3 days → 7 days). Button was mid-card, not dock-covered — overlap
does not explain it. Footer text fully visible at max scroll, but the floating
dock still overlaps the main card's bottom edge at ~1097px, ~1279px and 1919px.
No horizontal overflow observed. At true 1366px (earlier session) dock hid
Coach Done until scrolled, half-covered Shield "Check a Message / Number",
covered Portal Save area, partly covered 2nd HDFC helpline, covered Judge card
bottom (mid-scroll states — see caveat).
(3) CAREGIVER DEFAULT — VERIFIED OFF in fresh profile. Settings switch
unchecked, no header badge. Earlier session ON = persisted state, as expected.
No wipe used. This closes E2E #4 open item (d).

## Regression — all PASS

Home widgets (hero, Golden Hour Clock 1d 7h / 7h 48m / 2d 7h, Current Incident,
Quick Actions, Action Plan, Snapshot, Vault, Progress Tracker, Shield "Looks
fine", Care Circle, Proof Pack, Follow-up Guardian, Demo/Judge); probe →
₹20,000 + Bank 4th confirm item; Coach Done (call-tap logged + notification);
Portal ack 193012345678 saved, countdown 23h 59m; Bank SBI→HDFC 1800 1600 /
1800 2600; Vault 1 entry hash 42c0aaf8f92c…, "Chain is correct — 1 entries",
tamper test on copy only ("Chain BROKEN — record #1 was changed. The real
entries are safe"), real chain re-verified; Shield danger 9 + red disagreement
warning, suspicious 5 / model 62%, safe 0 / model 1%; Care QR + wa.me link
builds correctly (not clicked); Proof PDF 2 KB + ZIP 3 KB downloaded;
Incidents search "MWZZ9ZM1" isolates, "Awaiting Portal" filter works; Guide
"SIM" → 1 guide, courier detail opens; Judge Mode "Current active incident:
#RK-MWZZ9ZM1 (₹20,000)". Minor note: a11y dump shows "₹₹20,000" in Coach
script, screenshot shows single ₹ — not a bug.

## New bugs

(1) HIGH — floating dock still overlaps page content at tested widths (card
bottom edges, buttons hidden). Disputed: fixes ARE in the live bundle (see
verification note) — the overlap mechanism needs re-diagnosis, not a
"did not land" re-fix.
(2) HIGH — Follow-up "Mark done" needs three clicks; first two silently do nothing.
(3) MEDIUM — incident detail page not translated (Step 17 miss).
(4) LOW — leftover Hinglish strings (3 spots above).

## Test artefacts left in app (browser local only)

Incident #RK-MWZZ9ZM1 (₹20,000, SBI, UPI), Vault entry, ack 193012345678,
follow-ups advanced, language English. Seeded demo untouched.
