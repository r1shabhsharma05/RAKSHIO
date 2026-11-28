# Shield ML model — trained TF.js scam classifier (Steps 14–16)

A genuinely trained model, not a rules wrapper: a small TF.js neural net
trained on real labeled datasets, running fully on-device in the browser.
It is an **extra signal only** — the 16 rules are still the Shield
verdict and the explanation. The model score never overrides the rules.

## Datasets (Step 16: three real labeled sources, FULL pools, merged)

| # | Source | What | Rows used | License |
| --- | --- | --- | --- | --- |
| 1 | `jngb-labs/sms-spam` — https://huggingface.co/datasets/jngb-labs/sms-spam | UCI SMS Spam Collection (Almeida & Gómez Hidalgo, 2011), deduplicated | 5,159 whole set → **5,129** after cross-source dedupe | SMS Spam Collection v.1 (free, redistribution allowed, attribution; verbatim in `ml/data/LICENSE.txt`) |
| 2 | `SetFit/enron_spam` — https://huggingface.co/datasets/SetFit/enron_spam | Enron spam/ham emails (Metsis et al.), train 31,716 + test 2,000 | **FULL pool 29,865** after dedupe (was a 6,000 seeded sample in Step 15) | Enron Email Dataset — public corpus released by the U.S. Federal Energy Regulatory Commission (FERC); the HF repo carries no license field |
| 3 | `zefang-liu/phishing-email-dataset` — https://huggingface.co/datasets/zefang-liu/phishing-email-dataset | Phishing/safe emails (Kaggle "Phishing Email Detection" copy: Nazario phishing + Enron + SpamAssassin), 18,650 rows | **FULL pool 7,619** after cross-dedupe vs the full Enron set (was a 5,000 seeded sample in Step 15) | LGPL-3.0 (`ml/data/LICENSE-lgpl-3.0.txt`) |

**Merged total: 42,612 rows** (16,559 spam / 26,053 ham). Email texts were
truncated to the first 600 chars by `ml/prepare-data.mjs` (subject +
opening carry the signal; the app's inputs are short messages).
**Global dedupe by normalized text runs BEFORE the split**, so no message
can leak from train into test through another source. The phishing set's
overlap with Enron is much larger against the FULL Enron pool than the
Step 15 sample suggested: of 15,185 deduped phishing rows, only 7,619
survive cross-dedupe vs all 29,865 Enron rows — the phishing "safe"
side is largely Enron mail, so the full phishing pool is smaller and
harder than the 5,000 sample was (see the phishing-precision note under
the metrics table). Split is stratified per source, seeded (42)
80/10/10: train 34,089 / val 4,259 / test 4,264.

**Files in repo:** `ml/data/sms-spam.csv`, `ml/data/enron-sample.csv`,
`ml/data/phishing-sample.csv` (the Step 15 committed samples, kept as
fallback), `ml/data/enron-full.csv`, `ml/data/phishing-full.csv` (the
Step 16 full pools actually trained on). `ml/dataset.mjs` prefers the
`*-full.csv` files when present.
**Re-download + re-prepare:** `ml/download-data.sh` (raw originals go to
`ml/data/raw/`, NOT committed — 150+ MB), then `node ml/prepare-data.mjs`
(seeded sampling + dedupe + truncation) or `FULL=1 node
ml/prepare-data.mjs` (whole pools, no caps). Raw-file SHA-256 (verified
2026-11-27):

- `sms-spam.csv`: `7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff`
- `enron-train.jsonl`: `b846cf15bcad7676c37ea3535622e39e6bff5c9c004f634513e4f9c2951e5f02`
- `enron-test.jsonl`: `f07a4cca7bfc1d845d4ff59650e69a0ad31d9b5c0409ddad088219f7fc32bb52`
- `Phishing_Email.csv`: `18ef4fff1acb8986f0ab01e83ede6025420c829656af5a377560fce17e153b97`
- Committed `enron-sample.csv`: `06aed96320c9feb7df9ecb1440354fdad585cc5c38e68b8fe5d381602e019c4e`
- Committed `phishing-sample.csv`: `e9466e5a6f5f416eb3ef52058c53a3a24adea16a4f662392203be91eec283eb3`
- Committed `enron-full.csv` (Step 16): `a7e1b489ba252ea86f1e9f8c23ef80948fe4203a99beaff5b99acb25d25083c1`
- Committed `phishing-full.csv` (Step 16): `c2f41f06a2daef3231c787232255e96d8830a11cb6aea424ac429bce62c9d7e6`

## Model

- **Features:** binary bag-of-words over a **per-source vocab union**
  (top 1,500 SMS tokens + top 2,500 email tokens = 3,108 word tokens,
  built ONLY from the training split; tokenizer in `ml/tokenizer.mjs`,
  shared verbatim by training and the browser — one code path, no
  drift) **plus character trigrams** (top 1,500 by document frequency,
  also train-split only, stored in the same vocab list with a `c:`
  prefix). Total vocab **4,601**. The char trigrams are the Hinglish
  transfer mechanism (Step 16): a Hinglish Roman word is
  out-of-vocabulary as a whole word, but its substrings overlap English
  training words — "account", "otp", "link", "click" appear verbatim
  inside Hinglish messages. No Hinglish rows were trained on: the char
  vocab comes only from the English training split, so this is transfer,
  not Hinglish training. A single merged frequency ranking was tried
  first (Step 15) and REJECTED: email docs dominate it, so SMS tokens
  like `ringtone`, `kyc`, `otp`, `upi`, `aadhaar` fell out of the vocab
  and SMS precision collapsed to 79%.
- **Architecture:** Dense(32, relu) → Dropout(0.2) → Dense(1, sigmoid).
  Binary scam/safe output. Adam (lr 0.003), **6 epochs** (Step 16;
  Steps 14–15 used 12 — both prior runs' validation accuracy was flat
  from epoch 2–3 on, so 6 reaches the same plateau at ~half the CPU
  time on 34k rows), batch 32, class weights from the train split
  (spam is the minority). Training reads batches from a generator
  (`tf.data.generator` + `fitDataset`) instead of one materialized
  train matrix — the full train split is ~34k × 4,601 floats (~630 MB
  as one tensor, too much for this VM). Decision **threshold 0.65,
  tuned on the VALIDATION split only** (grid 0.30–0.70, max accuracy);
  the test split was evaluated once, after tuning, and never re-rolled.
- **Artifact:** `public/ml/shield-model/model.json` (808 KB, single file).
  Standard TF.js `ModelArtifacts` serialization — modelTopology +
  weightSpecs + base64 weightData — saved via `model.save` with a
  `withSaveHandler` capture and loaded in the browser through the public
  `tf.io.fromMemory` API. No binary weight shard to upload separately;
  the whole model ships as one text file.
- **Retrain:** `npm run train` (Node, CPU; full data, 6 epochs, ~13 min).
  `EPOCHS` env overrides the epoch count (recorded in
  `ml/metrics.json`). It rewrites `public/ml/shield-model/model.json`,
  `ml/metrics.json` and `ml/fixtures.json`, then round-trip reloads the
  written file and re-evaluates — the script fails if the reloaded
  accuracy differs.

## Real metrics (Step 16 final model — full data + char trigrams, KEPT)

Train accuracy is recorded (Step 14 did not log it; Step 15 did).

| Split | n | Accuracy | Precision | Recall |
| --- | --- | --- | --- | --- |
| Train | 34,089 | **99.76%** (TP 13252, FP 47, TN 20756, FN 34) | 99.65% | 99.74% |
| Validation | 4,259 | **97.09%** (TP 1578, FP 73, TN 2557, FN 51) | 95.58% | 96.87% |
| **Held-out test** | **4,264** | **97.00%** (TP 1583, FP 67, TN 2553, FN 61) | **95.94%** | **96.29%** |

Per-source held-out test (same threshold 0.65) — the headline must not
hide a weak side:

| Source | n | Accuracy | Precision | Recall |
| --- | --- | --- | --- | --- |
| SMS | 514 | **97.08%** (TP 69, FP 10, TN 430, FN 5) | 87.34% | 93.24% |
| Enron email | 2,987 | **97.72%** (TP 1369, FP 18, TN 1550, FN 50) | 98.70% | 96.48% |
| Phishing email | 763 | **94.10%** (TP 145, FP 39, TN 573, FN 6) | 78.80% | 96.03% |

**Phishing precision is the weak side (78.8%, was 93.7% in Step 15).**
It is not a like-for-like regression: the Step 15 phishing test set
(n=500) came from a 5,000 sample deduped only against the 6,000 Enron
sample, so it still contained many easy Enron-duplicate safe rows; the
Step 16 test set (n=763) is deduped against the FULL Enron pool, so
those easy rows are gone and what remains is mostly Nazario phishing +
SpamAssassin — a harder set, and the 0.65 threshold (tuned on a val set
dominated by Enron) flags 39 of its safe rows. Recall on phishing is
96.0% (was 92.0%): the model misses fewer phishing mails and
over-flags safe ones. The rules still decide; a high model score alone
is not a verdict.

These are the numbers the Shield screen quotes. The vitest check
(`src/engines/shield/mlModel.test.ts`) re-derives the same seeded split
and re-evaluates the shipped model file, asserting overall accuracy
within ±0.02 and precision/recall within ±0.05 of `ml/metrics.json`,
plus the SMS-subset accuracy within ±0.05. Its 8-row fixture smoke
check allows 7/8: one fixture is the UCI ham JOKE sms ("WE REGRET TO
INFORM U THAT THE NHS HAS MADE A MISTAKE... TERMINATED") — labelled
ham, worded exactly like a scam threat, scored 86.6% spam by the
shipped model. The full-test check above is the rigorous one.

### Hinglish probe (Step 16 — hand-labelled, probe ONLY, never trained on)

`ml/hinglish-probe.json`: 48 hand-labelled Roman-Hinglish messages —
32 scam (one paraphrased from each of the 32 Situation Guides'
`recognize` lines, plus the Shield example texts) and 16 safe everyday
messages. Scored with `node ml/eval-probe.mjs`; per-item scores for the
shipped model are in `ml/hinglish-probe-results.txt`. This is a probe,
not a test split: n=48, hand-written, and it is NEVER mixed into
`ml/metrics.json` or the Shield screen's quoted accuracy.

| Model | Probe accuracy | Precision | Recall (scam caught) |
| --- | --- | --- | --- |
| Step 15 (word-only, 16k rows) | 52.1% (TP 13, FP 4, TN 12, FN 19) | 76.5% | 40.6% |
| Step 16 char trigrams, sampled 16k rows | 58.3% (TP 16, FP 4, TN 12, FN 16) | 80.0% | 50.0% |
| **Step 16 char trigrams, FULL 42,612 rows (shipped)** | **66.7% (TP 21, FP 5, TN 11, FN 11)** | **80.8%** | **65.6%** |

Char trigrams + full data moved Hinglish recall from 40.6% to 65.6% —
real transfer, still far from good: 11 of 32 Hinglish scam probes are
still missed, including the exact Shield danger example ("Turant OTP
batao, warna account band ho jayega" scores 52.5% — up from ~3%, but
still below the 0.65 threshold, so the rules still lead and the screen
still shows the low-coverage warning). What would actually fix
Hinglish: real labeled Hinglish/Roman-Hindi fraud messages as training
data — no such public dataset exists (see the rejected list below); the
probe set itself must never be trained on, or the probe stops measuring
anything.

### The 99% target: NOT reached — 97.00% on held-out test

The user asked for 99%. The honest result is 97.00% (up from 96.22%).
Why it stops there, and what would be needed:

- **Train 99.76% vs val 97.09%** — the tiny net still memorizes the
  training rows; the bag-of-words + char-trigram features do not
  generalize further on this noisy, cross-domain mix. Val accuracy was
  flat (~96.4–97.2%) from epoch 2 to 6, so more epochs do not help.
- **Cross-domain conflict, eased but not gone.** Email ham is corporate
  mail that uses spammy words ("free", "offer", "click") legitimately.
  Full data + char trigrams improved SMS over Step 15 (97.08% /
  precision 87.3% / recall 93.2% vs 96.50% / 85.9% / 90.5%), but SMS
  is still weaker than the Step 14 SMS-only model (98.26%, precision
  98.3%): breadth is still bought with SMS precision, just less than
  before. Phishing precision (78.8%) is now the weak side instead.
- **Email text is noisy.** Truncated 600-char heads of long emails with
  quoted threads; the phishing set mixes three corpora with heavy
  Enron overlap (deduped) and uneven label quality.
- What 99% would need: richer features (TF-IDF / a bigger model /
  subword embeddings), and — most of all — real labeled modern Indian
  fraud messages, which do not exist as a public dataset (see the
  rejected list below). None of that was faked: no split was
  re-rolled, no test row was trained on, no number was inflated.

### Training runs (all on the same seeded split protocol; selection by val only)

- **Run #1** (merged DF vocab 3,000, 20 epochs, no dropout): test
  95.85%, SMS precision 79.1% — vocab dilution diagnosed (SMS tokens
  missing from the vocab). Discarded.
- **Run #2** (per-source vocab union, 12 epochs, dropout 0.2): test
  **96.22%**, val 95.84% — **shipped in Step 15**.
- **Run #3** (run #2 + word bigrams, vocab 4,010): test 95.79%, val
  95.65% — bigrams helped phishing (97.2%) but sank SMS precision
  (85.9% → 71.6%). Reverted; run #2 artifacts restored byte-identical.
- **Run #4** (Step 16: run #2 + char trigrams, vocab 4,608, 12 epochs,
  sampled 16,128 rows): test **96.47%** (val 96.65%, threshold 0.35),
  SMS 96.30% / precision 85.7%; Hinglish probe 58.3% (recall 50.0%,
  up from 52.1% / 40.6%). Char trigrams helped both headline and
  probe — superseded by run #5, not shipped.
- **Run #5** (Step 16: run #4 + FULL data, 42,612 rows, 6 epochs —
  val flat after epoch 2, see above): test **97.00%** (val 97.09%,
  threshold 0.65), SMS 97.08% / precision 87.3% / recall 93.2%;
  Hinglish probe 66.7% (recall 65.6%). **KEPT and shipped.** 13 min
  on this VM. Note the test sets differ between runs #2/#4 (n=1,615)
  and #5 (n=4,264, same seeded protocol, more rows) — the comparison
  is held-out vs held-out, not the same rows.

## Per-situation coverage (keyword proxy — NOT labels)

The 32 Situation Guides are guides, not training classes. This table
counts **spam rows in the Step 15 merged training data (16,128 rows)
whose text contains keywords for that situation** — a rough coverage
proxy, not a label claim. It was NOT recomputed for the Step 16 full
set (42,612 rows): the absolute counts grow with the bigger pool, but
the pattern stands — most modern Indian fraud types have almost no
training signal; the rules remain the primary defence there.

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

- The merged model is broader than Step 14 but **still weaker on SMS
  precision** (87.3% vs 98.3% SMS-only). A pasted SMS is still judged by the
  rules first; the model is an extra signal only.
- **Hinglish coverage is partial, measured, and still weak.** Char
  trigrams + full data moved the hand-labelled 48-message Hinglish
  probe from 52.1% accuracy / 40.6% recall (Step 15) to 66.7% / 65.6%
  (Step 16) — but 11 of 32 Hinglish scam probes are still missed, and
  the "Turant OTP batao…" example scores 52.5%, below the 0.65
  threshold. The model only knows English training text; Hindi/Hinglish
  words are out-of-vocabulary as whole words and contribute only
  through shared substrings. A Hinglish scam message can still score
  low — the rules correctly say KHATRA, and the screen still warns.
- **Modern Indian fraud has ~0 training rows** (QR scams, UPI collect
  requests, delivery-fee scams, rental scams, remote-access scams —
  see the coverage table). The model is blind there by construction.
- **Recall is no longer the weak side on the held-out test (96.3%),
  but phishing precision is (78.8%):** 39 of 763 held-out phishing-test
  safe mails were over-flagged. A high model score is NOT proof a
  message is a scam, and a low model score is NOT proof it is safe.
- **The 32 Situation Guides are guides, NOT training classes.** The
  model was never trained on them and must never be described that way.
  (Their `recognize` lines were paraphrased into the Hinglish PROBE
  set only — probe, never training data.)
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
| `ml/data/enron-sample.csv` | Enron sample (6,000 real rows; Step 15 fallback) |
| `ml/data/phishing-sample.csv` | Phishing-email sample (5,000 real rows; Step 15 fallback) |
| `ml/data/enron-full.csv` | Enron FULL pool (29,865 real rows after dedupe; Step 16) |
| `ml/data/phishing-full.csv` | Phishing-email FULL pool (7,619 real rows after cross-dedupe; Step 16) |
| `ml/data/LICENSE.txt` | SMS Spam Collection v.1 license (verbatim) |
| `ml/data/LICENSE-lgpl-3.0.txt` | LGPL-3.0 (phishing dataset) |
| `ml/data/raw/` | Raw downloads (NOT committed, 150+ MB) |
| `ml/download-data.sh` | Reproducible re-download + SHA check |
| `ml/prepare-data.mjs` | Seeded sampling + dedupe + truncation (`FULL=1` = whole pools) |
| `ml/dataset.mjs` | Merged loading + global dedupe + seeded stratified split |
| `ml/tokenizer.mjs` | Shared tokenizer + word vocab + char-trigram vocab + vectorize |
| `ml/train.mjs` | Training script (`npm run train`; `EPOCHS` env overrides epochs) |
| `ml/eval-probe.mjs` | Scores the shipped model on the Hinglish probe set |
| `ml/hinglish-probe.json` | Hand-labelled Hinglish probe set (48 rows — PROBE ONLY, never training data) |
| `ml/hinglish-probe-results.txt` | Per-item probe scores for the shipped model |
| `ml/metrics.json` | Train/val/test + per-source test metrics |
| `ml/fixtures.json` | Real held-out rows used by vitest |
| `public/ml/shield-model/model.json` | Shipped model (808 KB) |
| `src/engines/shield/mlModel.ts` | Lazy browser loader + inference |
| `src/engines/shield/mlModel.test.ts` | Load + fixture + accuracy checks |
