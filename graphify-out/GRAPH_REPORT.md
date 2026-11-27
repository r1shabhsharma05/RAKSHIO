# Graph Report - rakshio-app  (2026-11-27)

## Corpus Check
- 56 files · ~26,845 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .webmanifest 1, .css 1)

## Summary
- 367 nodes · 726 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- compilerOptions
- package.json
- compilerOptions
- devDependencies
- App
- .oxlintrc.json
- shared.tsx
- RAKSHIO — Fraud Golden Hour Response System
- tsconfig.json
- extract.ts
- AckBridge.tsx
- dependencies
- speech-recognition.d.ts
- Build ledger — RAKSHIO (Scaler × Wispr Flow, Round 2)
- ADR-003: Astryx for primitives, hand-built panic surfaces
- vault.ts
- BankKit.tsx
- ADR-001: Local-only storage, no backend
- ADR-002: Deterministic understanding engine, no LLM
- RAKSHIO — Demo Script (3 minutes, record 29 Nov)
- RAKSHIO — Privacy

## God Nodes (most connected - your core abstractions)
1. `App()` - 33 edges
2. `NoReportBanner()` - 31 edges
3. `compilerOptions` - 18 edges
4. `@astryxdesign/core` - 17 edges
5. `react` - 17 edges
6. `BackButton()` - 15 edges
7. `compilerOptions` - 15 edges
8. `extractIncident()` - 14 edges
9. `ProofScreen()` - 14 edges
10. `VaultScreen()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Threats considered` --references--> `redactText()`  [INFERRED]
  docs/THREAT_MODEL.md → src/engines/evidence/vault.ts
- `Threats considered` --references--> `maskCredentials()`  [INFERRED]
  docs/THREAT_MODEL.md → src/engines/understanding/extract.ts
- `App()` --calls--> `extractIncident()`  [EXTRACTED]
  src/App.tsx → src/engines/understanding/extract.ts
- `App()` --calls--> `AckBridgeScreen()`  [EXTRACTED]
  src/App.tsx → src/screens/AckBridge.tsx
- `App()` --calls--> `ActionsScreen()`  [EXTRACTED]
  src/App.tsx → src/screens/Actions.tsx

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (30): name, private, scripts, build, dev, lint, preview, type (+22 more)

### Community 2 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 3 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @astryxdesign/cli, @axe-core/playwright, fake-indexeddb, oxlint, playwright, @playwright/test, @types/node (+7 more)

### Community 4 - "App"
Cohesion: 0.29
Nodes (12): App(), enterConfirm(), go(), handleConfirmDone(), handleTranscript(), logCallTap(), resetAll(), computeGaps() (+4 more)

### Community 5 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 6 - "shared.tsx"
Cohesion: 0.11
Nodes (42): @astryxdesign/core, gsap, @gsap/react, react, EMPTY_CONFIRM, summaryText(), DEMO_LABEL, DEMO_TRANSCRIPT (+34 more)

### Community 7 - "RAKSHIO — Fraud Golden Hour Response System"
Cohesion: 0.20
Nodes (9): Architecture, Deliberately NOT done, Docs, Quick Start, RAKSHIO — Fraud Golden Hour Response System, Step 1 — what works (Phase 0–1 of the master plan), Step 2 — what works (Phase 2 differentiators), Step 3 — proof (+1 more)

### Community 9 - "extract.ts"
Cohesion: 0.11
Nodes (25): Assets, Out of scope (stated, not hidden), RAKSHIO — Threat Model, Threats considered, mergeField(), redactText(), BANKS, DEVANAGARI_DIGITS (+17 more)

### Community 10 - "AckBridge.tsx"
Cohesion: 0.17
Nodes (15): AckRecord, CopyRow, loadAck(), portalCopyDeck(), portalDeadline(), saveAck(), ActionItem, DeadlineStatus (+7 more)

### Community 11 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @astryxdesign/core, @astryxdesign/theme-neutral, dexie, gsap, @gsap/react, jszip, pdf-lib (+4 more)

### Community 12 - "speech-recognition.d.ts"
Cohesion: 0.25
Nodes (4): SpeechRecognitionEventLike, SpeechRecognitionLike, SpeechRecognitionResultLike, Window

### Community 13 - "Build ledger — RAKSHIO (Scaler × Wispr Flow, Round 2)"
Cohesion: 0.22
Nodes (8): Build ledger — RAKSHIO (Scaler × Wispr Flow, Round 2), Deferred minors, Rulings, Rulings (Step 2), Rulings (Step 3), Step 1: complete (2026-11-27), Step 2: complete (2026-11-27), Step 3: complete (2026-11-27)

### Community 14 - "ADR-003: Astryx for primitives, hand-built panic surfaces"
Cohesion: 0.18
Nodes (10): 21st.dev components, ADR-003: Astryx for primitives, hand-built panic surfaces, Alternatives Considered, Consequences, Context, Date, Decision, Full custom theme via defineTheme (+2 more)

### Community 15 - "vault.ts"
Cohesion: 0.19
Nodes (23): canonical(), sha256Hex(), addEvidence(), db, EvidenceRecord, listEvidence(), RakshioDb, rootHash() (+15 more)

### Community 16 - "BankKit.tsx"
Cohesion: 0.11
Nodes (22): vitest, bankDraft(), BankInfo, BANKS, findBank(), loadBankRef(), saveBankRef(), analyzeShield() (+14 more)

### Community 17 - "ADR-001: Local-only storage, no backend"
Cohesion: 0.20
Nodes (9): ADR-001: Local-only storage, no backend, Alternatives Considered, Consequences, Context, Date, Decision, In-memory only (no persistence), Status (+1 more)

### Community 18 - "ADR-002: Deterministic understanding engine, no LLM"
Cohesion: 0.20
Nodes (9): ADR-002: Deterministic understanding engine, no LLM, Alternatives Considered, Consequences, Context, Date, Decision, Free-form transcript only (no extraction), On-device LLM / cloud LLM (+1 more)

### Community 19 - "RAKSHIO — Demo Script (3 minutes, record 29 Nov)"
Cohesion: 0.22
Nodes (8): 0:00–0:20 — Panic screen, 0:20–0:50 — Confirmation gate, 0:50–1:20 — Golden Hour Clock + 1930 Call Coach, 1:20–2:00 — Evidence Vault + tamper test, 2:00–2:30 — Second-Scam Shield, 2:30–3:00 — Proof Pack + close, RAKSHIO — Demo Script (3 minutes, record 29 Nov), Recording notes

### Community 20 - "RAKSHIO — Privacy"
Cohesion: 0.29
Nodes (6): Deletion, RAKSHIO — Privacy, Sharing, Speech privacy (honest disclosure), What is never collected or stored, What is stored — and where

## Knowledge Gaps
- **8 isolated node(s):** `@stylexjs/stylex`, `@astryxdesign/cli`, `@types/node`, `@types/qrcode`, `@types/react` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 182 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@astryxdesign/core` connect `shared.tsx` to `BankKit.tsx`, `package.json`, `AckBridge.tsx`, `vault.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `@stylexjs/stylex`, `@astryxdesign/cli`, `@types/node` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `react` connect `shared.tsx` to `BankKit.tsx`, `package.json`, `AckBridge.tsx`, `vault.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._