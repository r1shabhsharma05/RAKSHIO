# RAKSHIO — Privacy

RAKSHIO is local-first by design. There is no backend, no account, no
analytics, and nothing leaves the phone unless the victim deliberately
shares it.

## What is stored — and where

| Data | Where | Notes |
|---|---|---|
| Incident (amount, time, bank, UTR, fraud type, masked transcript) | `localStorage`, key `rakshio.incident.v1` | One incident per device. OTP/PIN/CVV digits are masked before storage. |
| Evidence (SMS/notes/files + SHA-256 hash chain) | IndexedDB, database `rakshio-vault` | Text is redacted before storage (OTP/PIN digits, card and Aadhaar numbers). |
| 1930 ack number | `localStorage`, key `rakshio.ack.v1` | Saved only after the victim types it in. |
| Bank reference number | `localStorage`, key `rakshio.bankref.v1.<incidentId>` | Saved only after the victim types it in. |
| Care Circle family number | **Never stored** | Used only to build the WhatsApp link, in memory. |

## What is never collected or stored

- OTP, PIN, CVV, UPI PIN, card numbers, Aadhaar — never asked for, and
  masked if spoken or pasted anyway (4–6 digit numbers next to OTP/PIN
  words; 16-digit card and 12-digit Aadhaar numbers keep only the last 4).
- Voice recordings — speech recognition runs in the browser; RAKSHIO keeps
  only the transcript text, masked as above.
- Name, phone number, address, location — the app never asks for them.

## Speech privacy (honest disclosure)

The app shows this in the UI: the browser's speech service may process
voice on its servers. Where the browser offers it, RAKSHIO requests
on-device processing (`processLocally`). Anyone who wants fully offline
input can use Text Mode instead of the mic.

## Sharing

- Care Circle shares only a minimal SOS card, and only with the victim's
  explicit consent (checkbox).
- The Proof Pack (PDF/ZIP) is generated on-device and downloaded by the
  victim; RAKSHIO uploads nothing.
- There is no "send to RAKSHIO" anywhere in the app.

## Deletion

"Saaf karein — naya incident shuru karein" on the incident card wipes the
localStorage incident. Evidence in IndexedDB can be cleared from the
browser's site-data settings. There is no server copy to delete — because
there is no server.
