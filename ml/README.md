# Shield ML model — trained TF.js scam classifier (Steps 14–15)

A genuinely trained model, not a rules wrapper: a small TF.js neural net
trained on real labeled datasets, running fully on-device in the browser.
It is an **extra signal only** — the 16 rules are still the Shield
verdict and the explanation. The model score never overrides the rules.

## Datasets (Step 15: three real labeled sources, merged)

| # | Source | What | Rows used | License |
| --- | --- | --- | --- | --- |
| 1 | `jngb-labs/sms-spam` — https://huggingface.co/datasets/jngb-labs/sms-spam | UCI SMS Spam Collection (Almeida & Gómez Hidalgo, 2011), deduplicated | 5,159 whole set → **5,129** after cross-source dedupe | SMS Spam Collection v.1 (free, redistribution allowed, attribution; verbatim in `ml/data/LICENSE.txt`) |
| 2 | `SetFit/enron_spam` — https://huggingface.co/datasets/SetFit/enron_spam | Enron spam/ham emails (Metsis et al.), train 31,716 + test 2,000 | Seeded sample **6,000** (3,000 spam / 3,000 ham) → **5,999** after dedupe | Enron Email Dataset — public corpus released by the U.S. Federal Energy Regulatory Commission (FERC); the HF repo carries no license field |
| 3 | `zefang-liu/phishing-email-dataset` — https://huggingface.co/datasets/zefang-liu/phishing-email-dataset | Phishing/safe emails (Kaggle "Phishing Email Detection" copy: Nazario phishing + Enron + SpamAssassin), 18,650 rows | Seeded sample **5,000** after dedupe → **5,000** | LGPL-3.0 (`ml/data/LICENSE-lgpl-3.0.txt`) |

**Merged total: 16,128 rows** (5,331 spam / 10,797 ham). Email texts were
truncated to the first 600 chars by `ml/prepare-data.mjs` (subject +
opening carry the signal; the app's inputs are short messages).
**Global dedupe by normalized text runs BEFORE the split**, so no message
can leak from train into test through another source (the phishing set
overlaps Enron by ~9% — 1,723 rows on the full sets). Split is stratified
per source, seeded (42) 80/10/10: train 12,902 / val 1,611 / test 1,615.

**Files in repo:** `ml/data/sms-spam.csv`, `ml/data/enron-sample.csv`,
`ml/data/phishing-sample.csv` (the committed samples).
**Re-download + re-prepare:** `ml/download-data.sh` (raw originals go to
`ml/data/raw/`, NOT committed — 150+ MB), then `node ml/prepare-data.mjs`
(seeded sampling + dedupe + truncation). Raw-file SHA-256 (verified
2026-11-27):

- `sms-spam.csv`: `7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff`
- `enron-train.jsonl`: `b846cf15bcad7676c37ea3535622e39e6bff5c9c004f634513e4f9c2951e5f02`
- `enron-test.jsonl`: `f07a4cca7bfc1d845d4ff59650e69a0ad31d9b5c0409ddad088219f7fc32bb52`
- `Phishing_Email.csv`: `18ef4fff1acb8986f0ab01e83ede6025420c829656af5a377560fce17e153b97`
- Committed `enron-sample.csv`: `06aed96320c9feb7df9ecb1440354fdad585cc5c38e68b8fe5d381602e019c4e`
- Committed `phishing-sample.csv`: `e9466e5a6f5f416eb3ef52058c53a3a24adea16a4f662392203be91eec283eb3`

## Model

- **Features:** binary bag-of-words over a **per-source vocab union**
  (top 1,500 SMS tokens + top 2,500 email tokens = 3,108 tokens, built
  ONLY from the training split; tokenizer in `ml/tokenizer.mjs`, shared
  verbatim by training and the browser — one code path, no drift). A
  single merged frequency ranking was tried first and REJECTED: email
  docs dominate it, so SMS tokens like `ringtone`, `kyc`, `otp`, `upi`,
  `aadhaar` fell out of the vocab and SMS precision collapsed to 79%.
- **Architecture:** Dense(32, relu) → Dropout(0.2) → Dense(1, sigmoid).
  Binary scam/safe output. Adam (lr 0.003), 12 epochs, batch 32, class
  weights from the train split (spam is the minority). Decision
  **threshold 0.7, tuned on the VALIDATION split only** (grid 0.30–0.70,
  max accuracy); the test split was evaluated once, after tuning, and
  never re-rolled.
- **Artifact:** `public/ml/shield-model/model.json` (547 KB, single file).
  Standard TF.js `ModelArtifacts` serialization — modelTopology +
  weightSpecs + base64 weightData — saved via `model.save` with a
  `withSaveHandler` capture and loaded in the browser through the public
  `tf.io.fromMemory` API. No binary weight shard to upload separately;
  the whole model ships as one text file.
- **Retrain:** `npm run train` (Node, CPU, ~5 min). It rewrites
  `public/ml/shield-model/model.json`, `ml/metrics.json` and
  `ml/fixtures.json`, then round-trip reloads the written file and
  re-evaluates — the script fails if the reloaded accuracy differs.

## Real metrics (Step 15 final model — run #2, kept)

Train accuracy is recorded this time (Step 14 did not log it).

| Split | n | Accuracy | Precision | Recall |
| --- | --- | --- | --- | --- |
| Train | 12,902 | **99.90%** (TP 4260, FP 1, TN 8629, FN 12) | 99.98% | 99.72% |
| Validation | 1,611 | **95.84%** (TP 481, FP 12, TN 1063, FN 55) | 97.57% | 89.74% |
| **Held-out test** | **1,615** | **96.22%** (TP 487, FP 25, TN 1067, FN 36) | **95.12%** | **93.12%** |

Per-source held-out test (same threshold 0.7) — the headline must not
hide a weak side:

| Source | n | Accuracy | Precision | Recall |
| --- | --- | --- | --- | --- |
| SMS | 514 | **96.50%** (TP 67, FP 11, TN 429, FN 7) | 85.90% | 90.54% |
| Enron email | 601 | **96.67%** (TP 271, FP 4, TN 310, FN 16) | 98.55% | 94.43% |
| Phishing email | 500 | **95.40%** (TP 149, FP 10, TN 328, FN 13) | 93.71% | 91.98% |

These are the numbers the Shield screen quotes. The vitest check
(`src/engines/shield/mlModel.test.ts`) re-derives the same seeded split
and re-evaluates the shipped model file, asserting overall accuracy
within ±0.02 and precision/recall within ±0.05 of `ml/metrics.json`,
plus the SMS-subset accuracy within ±0.05.

### The 99% target: NOT reached — 96.22% on held-out test

The user asked for 99%. The honest result is 96.22%. Why it stops
there, and what would be needed:

- **Train 99.9% vs val 95.8%** — the tiny net memorizes the training
  rows; the bag-of-words features do not generalize further on this
  noisy, cross-domain mix. Val accuracy was flat (~95.6–96.0%) from
  epoch 1 to 12, so more epochs do not help.
- **Cross-domain conflict.** Email ham is corporate mail that uses
  spammy words ("free", "offer", "click") legitimately, so the same
  words are weaker spam evidence for SMS. The merged model's SMS side
  (96.50%, precision 85.9%) is WEAKER than the Step 14 SMS-only model
  (98.26%, precision 98.3%). Breadth was bought with SMS accuracy —
  that trade-off is stated here, not hidden.
- **Email text is noisy.** Truncated 600-char heads of long emails with
  quoted threads; the phishing set mixes three corpora with ~9%
  Enron overlap (deduped) and uneven label quality.
- What 99% would need: the FULL datasets (33,716 Enron + 18,650
  phishing rows, not 6k/5k samples), richer features (character
  n-grams / TF-IDF / a bigger model), and — most of all — real labeled
  modern Indian fraud messages, which do not exist as a public dataset
  (see the rejected list below). None of that was faked: no split was
  re-rolled, no test row was trained on, no number was inflated.

### Training runs (all on the same seeded split; selection by val only)

- **Run #1** (merged DF vocab 3,000, 20 epochs, no dropout): test
  95.85%, SMS precision 79.1% — vocab dilution diagnosed (SMS tokens
  missing from the vocab). Discarded.
- **Run #2** (per-source vocab union, 12 epochs, dropout 0.2): test
  **96.22%**, val 95.84% — **KEPT and shipped**.
- **Run #3** (run #2 + word bigrams, vocab 4,010): test 95.79%, val
  95.65% — bigrams helped phishing (97.2%) but sank SMS precision
  (85.9% → 71.6%). Reverted; run #2 artifacts restored byte-identical.

## Per-situation coverage (keyword proxy — NOT labels)

The 32 Situation Guides are guides, not training classes. This table
counts **spam rows in the merged training data whose text contains
keywords for that situation** — a rough coverage proxy, not a label
claim. Most modern Indian fraud types have almost no training signal;
the rules remain the primary defence there.

| Coverage | Situations (spam rows with keywords) |
| --- | --- |
| Covered (≥50) | phishing-link 1,548 · investment-scam 332 · loan-app-scam 140 · tech-support-scam 96 · lottery-scam 93 · romance-scam 77 · refund-scam 72 |
| Thin (1–49) | digital-arrest 44 · upi-fraud 40 · card-reward-scam 35 · visa-scam 26 · task-scam 21 · courier-scam 21 · gift-card-scam 16 · travel-scam 16 · fake-customer-care 12 · otp-scam 9 · sextortion-scam 8 · olx-buyer-scam 4 · electricity-scam 3 · matrimonial-scam 3 · scholarship-scam 3 · crypto-scam 2 · kyc-scam 2 · sim-swap 2 |
| None (0) | qr-scam · upi-collect-scam · delivery-fee-scam · rental-scam · remote-access |
| n/a | attempted-fraud (no-loss guide — no training signal by design) |

No real labeled multi-class fraud dataset was found on Hugging Face, so
there is no multi-class head: the model stays binary scam/safe, and
this table is the honest statement of what it covers.

## Honest coverage and limits

- The merged model is broader than Step 14 but **weaker on SMS**
  (96.50% vs 98.26% SMS-only). A pasted SMS is still judged by the
  rules first; the model is an extra signal only.
- **Hinglish coverage is none.** The model only knows Latin-script
  English tokens; Hindi/Hinglish words are out-of-vocabulary and
  contribute nothing. A Hinglish scam message can score low — the
  "Turant OTP batao…" example still scores ~1% safe while the rules
  correctly say KHATRA.
- **Modern Indian fraud has ~0 training rows** (QR scams, UPI collect
  requests, delivery-fee scams, rental scams, remote-access scams —
  see the coverage table). The model is blind there by construction.
- **Recall is the weak side (93.1% test):** 36 of 523 held-out spam
  messages were missed. A low model score is NOT proof a message is safe.
- **The 32 Situation Guides are guides, NOT training classes.** The
  model was never trained on them and must never be described that way.
- No data leaves the device: inference runs in the browser with
  @tensorflow/tfjs, loaded lazily only when a Shield check runs.

## Datasets considered and rejected

- `CloveAI/india-spam-sms` (20,010 rows, MIT) — rejected: templated,
  not real collected messages. Only 5,586 distinct texts after masking
  digits (top templates repeat ~600× with just numbers swapped), and
  spam rows are mutated UCI templates ("Single women in 9199612583
  waiting to meet you! Call Tenali", "Jio: You won 1 year free
  subscription! Call 780 to claim." / "Call 984 to claim."). Zero exact
  overlap with UCI only because numbers/names were swapped.
- `Shade63/scam-classification-multiclass` (14,000 rows, 5 classes) —
  rejected: the multi-class set we wanted, but no source named, no
  license stated, and the rows read as generated (polished, varied,
  named officers, dates in June 2026). Provenance could not be
  established as real labeled data.
- `dbarbedillo/SMS_Spam_Multilingual_Collection_Dataset` — rejected:
  machine-translated UCI SMS spam (M2M100); the Hindi rows are
  Devanagari, which the Latin-script tokenizer strips to nothing, and
  it is the same UCI source in another language, not new data.
- `David-Egea/phishing-texts` — rejected: the same Kaggle phishing
  dataset as zefang-liu (identical rows), no new data.
- `FredZhang7/all-scam-spam` — rejected: a merge of the same corpora
  (Enron + SpamAssassin + UCI), no new data.
- `bolewara/hinglish-scam-text-dataset` (3,787 rows) — NOT used. Mostly
  UCI-derived English; only 35 hand-written Hinglish scam + 28
  hand-written Hinglish benign rows, i.e. author-written curated
  examples, not real collected messages.
- `bhavya2910/indian-scam-sms-synthetic-audited` — rejected: explicitly
  Gemini-generated synthetic data, not real messages.
- `ganesh9353/Indian_Multilingual_Scam_Message_Dataset` — rejected:
  templated-looking rows, unclear provenance; could not establish it
  is real labeled data.
- `vichetkao/Scam_Message_9_Language` — rejected: gated, needs a
  Hugging Face login/accept to download; cannot fetch without auth.
- Kaggle — not used: no Kaggle token exists and none was requested;
  no public credential-free direct download was available.

## Files

| File | What |
| --- | --- |
| `ml/data/sms-spam.csv` | UCI SMS Spam (5,159 real rows) |
| `ml/data/enron-sample.csv` | Enron sample (6,000 real rows) |
| `ml/data/phishing-sample.csv` | Phishing-email sample (5,000 real rows) |
| `ml/data/LICENSE.txt` | SMS Spam Collection v.1 license (verbatim) |
| `ml/data/LICENSE-lgpl-3.0.txt` | LGPL-3.0 (phishing dataset) |
| `ml/data/raw/` | Raw downloads (NOT committed, 150+ MB) |
| `ml/download-data.sh` | Reproducible re-download + SHA check |
| `ml/prepare-data.mjs` | Seeded sampling + dedupe + truncation |
| `ml/dataset.mjs` | Merged loading + global dedupe + seeded stratified split |
| `ml/tokenizer.mjs` | Shared tokenizer + vocab + vectorize |
| `ml/train.mjs` | Training script (`npm run train`) |
| `ml/metrics.json` | Train/val/test + per-source test metrics |
| `ml/fixtures.json` | Real held-out rows used by vitest |
| `public/ml/shield-model/model.json` | Shipped model (547 KB) |
| `src/engines/shield/mlModel.ts` | Lazy browser loader + inference |
| `src/engines/shield/mlModel.test.ts` | Load + fixture + accuracy checks |
