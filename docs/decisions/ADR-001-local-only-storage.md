# ADR-001: Local-only storage, no backend

## Status
Accepted

## Date
2026-11-27

## Context
RAKSHIO handles fraud victims' most sensitive facts (amount, bank, UTR)
in their worst hour. The hackathon requires the app to start without
secret keys, and the demo must run on a judge's phone with no setup.

## Decision
All data lives on the device: incident in `localStorage`, evidence in
IndexedDB (Dexie). No backend, no API keys, no accounts, no analytics,
no network calls except links the victim deliberately opens.

## Alternatives Considered

### Supabase/Firebase backend
- Pros: sync across devices, caregiver could see the incident remotely.
- Cons: needs keys (banned by the brief), a privacy policy with teeth, and
  a server that could leak the victim's data. Rejected: the risk is the
  product's whole point.

### In-memory only (no persistence)
- Pros: nothing to leak at all.
- Cons: a refresh loses the incident mid-flow; the Evidence Vault cannot
  exist. Rejected: the golden-hour flow spans 24 hours.

## Consequences
- The app works offline after first load; the demo cannot fail on network.
- Care Circle sharing is link-based (WhatsApp deep link, QR), not sync.
- If the phone is lost, the incident is lost — stated in PRIVACY.md, not
  hidden. A server backup is a post-hackathon decision, not a silent one.
