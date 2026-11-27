# ADR-002: Deterministic understanding engine, no LLM

## Status
Accepted

## Date
2026-11-27

## Context
The victim speaks freely in Hindi/Hinglish. The app must extract amount,
time, method, bank, UTR, and fraud type — and must never guess, because a
wrong amount on a 1930 call wastes the golden hour.

## Decision
A rule-based extractor (`src/engines/understanding/extract.ts`): Hindi
number words, Devanagari digits/words, 12-digit UTR, bank lexicon,
keyword-weighted fraud-type scorer, date/time words. Every field carries
a confidence score; a missing field stays null until the user confirms it
or says "Pata nahi".

## Alternatives Considered

### On-device LLM / cloud LLM
- Pros: handles messier speech, more languages.
- Cons: cloud needs keys and sends the victim's story to a server
  (privacy); on-device needs a model download the demo cannot rely on.
  Rejected: the brief bans keys, and "never guess" is easier to prove
  with rules than with a model.

### Free-form transcript only (no extraction)
- Pros: nothing to get wrong.
- Cons: no confirmation gate, no Call Coach script, no triage — the
  product collapses to a notepad. Rejected.

## Consequences
- Extraction is testable: 12 unit tests, including the 5 required Hindi
  inputs, all green. A regression is a failing test, not a vibe.
- Coverage is narrow by design: unusual phrasings fall through to gap
  questions, which is the honest failure mode.
