# RAKSHIO — Threat Model

Scope: a static, local-only web app. No backend, no accounts, no network
calls except the links the victim deliberately opens (1930 `tel:` link,
cybercrime.gov.in, Sanchar Saathi, NPCI, WhatsApp).

## Assets

- The victim's incident facts (amount, bank, UTR) — sensitive, but only
  useful to the victim, the bank, and the police.
- The evidence chain (screenshots/SMS) — the victim's proof.
- The victim's attention in the first hour — the scarcest asset; the whole
  product exists to spend it on 1930, not on the app.

## Threats considered

| Threat | Assessment | Mitigation |
|---|---|---|
| OTP/PIN theft via the app | The app never asks for credentials; if spoken, they are masked before storage (`maskCredentials`, `redactText`) and the UI says why. | Mask-before-store in both the extractor and the Vault; unit tests assert the digits never land in storage. |
| Evidence tampering (victim's own proof questioned) | Anyone with the phone could edit IndexedDB. | SHA-256 hash chain: each record hashes the previous record's hash. Verify recomputes the chain and names the broken record. A tampered chain is detectable, not silently trusted. |
| Second-scam "recovery agent" | The most likely attack on a fraud victim: someone offers to recover the money for a fee. | Second-Scam Shield (weighted rules + Truth Card) + the permanent "RAKSHIO report file nahi karta" banner + no in-app payments, ever. |
| Fake helpline numbers | Search results and SMS can carry fake bank numbers. | Bank Kit lists only numbers verified against multiple published directories (2026-11-27); unlisted banks get no number at all, with instructions to use the bank's own website/card. |
| False reassurance | The victim thinks using RAKSHIO = having reported. | Permanent banner on every screen; "Done" logs only a button tap; the app never claims a call happened or a complaint was filed. |
| Over-claiming in the demo/pitch | "India's first", guaranteed recovery, fake stats. | Banned in copy. The deck and README claim only what the prototype does. |
| XSS via pasted message text | Shield/Vault render user-pasted text. | React escapes text by default; no `dangerouslySetInnerHTML` anywhere; no `eval`. |
| Speech sent to a server | Browser speech recognition may use a server engine. | Disclosed in the UI; `processLocally` requested where supported; Text Mode is the fully-offline alternative. |
| Stolen phone / shared device | Incident data sits in localStorage/IndexedDB. | One-tap wipe on the incident card; no account to hijack; no server copy. No lock screen is claimed — the phone's own lock is the boundary. |

## Out of scope (stated, not hidden)

- The hash chain proves tampering after the fact; it does not prevent
  someone with the unlocked phone from deleting the whole database.
- RAKSHIO cannot verify that a 1930 call happened, that the bank was
  notified, or that a portal complaint was filed. It records only what
  the victim taps or types, and says so.
- The Shield is rule-based, not ML: it misses novel scams and can
  misjudge edge cases. Its test set (50 messages, 100%) is a floor, not
  a guarantee.
- Bank helpline numbers change. Last verified 2026-11-27; the Bank Kit
  tells the user to verify before calling.
