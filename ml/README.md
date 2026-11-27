# Shield ML model — trained TF.js spam classifier (Step 14)

A genuinely trained model, not a rules wrapper: a small TF.js neural net
trained on a real labeled dataset, running fully on-device in the browser.
It is an **extra signal only** — the 16 rules are still the Shield
verdict and the explanation. The model score never overrides the rules.

## Dataset

- **Source:** `jngb-labs/sms-spam` — https://huggingface.co/datasets/jngb-labs/sms-spam
- **What it is:** the UCI SMS Spam Collection (Almeida & Gómez Hidalgo,
  2011), deduplicated — 5,574 original rows minus exact duplicates.
- **Rows:** 5,159 (4,517 ham / 642 spam). Columns: `label`, `text`.
  Labels are "ham" (legitimate) / "spam".
- **File in repo:** `ml/data/sms-spam.csv`
  (SHA-256 `7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff`,
  verified 2026-11-27 against a fresh download).
- **Re-download:** `ml/download-data.sh` (public, no auth, no key).
- **License:** the repo's `LICENSE` file (`ml/data/LICENSE.txt`) is the
  SMS Spam Collection v.1 license, reproduced verbatim below. It is free
  with no limitations except copyright attribution — redistribution,
  modification and derivative works are explicitly allowed ("You are
  solely responsible for your use, distribution, modification,
  reproduction and publication of the corpus"). No warranty; the user
  bears all risk and indemnifies the copyright holders. (The cleaning
  script in that repo is separate MIT code by Jakob Neugebauer; we do
  not ship it.)

> SMS Spam Collection v.1: License (original, preserved verbatim)
>
> The text below is reproduced from the original SMS Spam Collection v.1
> readme distributed by Tiago Agostinho de Almeida and Jose Maria Gomez
> Hidalgo. The deduplicated release published here makes no modifications
> to these terms.
>
> We would appreciate if:
>
> - In case you find this corpus useful, please make a reference to
>   previous paper and the web page:
>   http://www.dt.fee.unicamp.br/~tiago/smsspamcollection/ in your papers,
>   research, etc.
> - Send a message to tiago@dt.fee.unicamp.br in case you make use of
>   the corpus.
>
> The SMS Spam Collection v.1 is provided for free and with no limitations
> excepting:
>
> 1. Tiago Agostinho de Almeida and Jose Maria Gomez Hidalgo hold the
>    copyright (c) for the SMS Spam Collection v.1.
>
> 2. No Warranty / Use At Your Risk. THE CORPUS IS MADE AT NO CHARGE.
>    ACCORDINGLY, THE CORPUS IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY
>    KIND, INCLUDING WITHOUT LIMITATION THE WARRANTIES THAT THEY ARE
>    MERCHANTABLE, FIT FOR A PARTICULAR PURPOSE OR NON-INFRINGING. YOU ARE
>    SOLELY RESPONSIBLE FOR YOUR USE, DISTRIBUTION, MODIFICATION,
>    REPRODUCTION AND PUBLICATION OF THE CORPUS AND ANY DERIVATIVE WORKS
>    THEREOF BY YOU AND ANY OF YOUR SUBLICENSEES (COLLECTIVELY, "YOUR
>    CORPUS USE"). THE ENTIRE RISK AS TO YOUR CORPUS USE IS BORNE BY YOU.
>    YOU AGREE TO INDEMNIFY AND HOLD THE COPYRIGHT HOLDERS, AND THEIR
>    AFFILIATES HARMLESS FROM ANY CLAIMS ARISING FROM OR RELATING TO YOUR
>    CORPUS USE.
>
> 3. Limitation of Liability. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR
>    THEIR AFFILIATES, OR THE CORPUS CONTRIBUTING EDITORS, BE LIABLE FOR ANY
>    INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES, INCLUDING,
>    WITHOUT LIMITATION, DAMAGES FOR LOSS OF GOODWILL OR ANY AND ALL OTHER
>    COMMERCIAL DAMAGES OR LOSSES, EVEN IF ADVISED OF THE POSSIBILITY
>    THEREOF, AND REGARDLESS OF WHETHER ANY CLAIM IS BASED UPON ANY
>    CONTRACT, TORT OR OTHER LEGAL OR EQUITABLE THEORY, RELATING OR
>    ARISING FROM THE CORPUS, YOUR CORPUS USE OR THIS LICENSE AGREEMENT.

## Model

- **Features:** binary bag-of-words over a 1,500-token vocab built ONLY
  from the training split (top tokens by document frequency; tokenizer
  in `ml/tokenizer.mjs`, shared verbatim by training and the browser —
  one code path, no drift).
- **Architecture:** Dense(32, relu) → Dense(1, sigmoid). Binary
  scam/safe output, threshold 0.5. Adam (lr 0.003), 15 epochs, batch 32.
- **Split:** seeded (seed 42) 80/10/10 of the real rows —
  train 4,127 / val 515 / test 517.
- **Artifact:** `public/ml/shield-model/model.json` (264 KB, single file).
  Standard TF.js `ModelArtifacts` serialization — modelTopology +
  weightSpecs + base64 weightData — saved via `model.save` with a
  `withSaveHandler` capture and loaded in the browser through the public
  `tf.io.fromMemory` API. No binary weight shard to upload separately;
  the whole model ships as one text file.
- **Retrain:** `npm run train` (Node, CPU, ~1 min). It rewrites
  `public/ml/shield-model/model.json`, `ml/metrics.json` and
  `ml/fixtures.json`, then round-trip reloads the written file and
  re-evaluates — the script fails if the reloaded accuracy differs.

## Real held-out test metrics (test split, n = 517, never training data)

| Metric | Value |
| --- | --- |
| Accuracy | **98.26%** (508/517) |
| Precision | **98.31%** (58/59 flagged) |
| Recall | **87.88%** (58/66 spam caught) |
| Confusion | TP 58, FP 1, TN 450, FN 8 |

These are the numbers the Shield screen quotes. The vitest check
(`src/engines/shield/mlModel.test.ts`) re-derives the same seeded split
and re-evaluates the shipped model file, asserting accuracy within
±0.02 and precision/recall within ±0.05 of `ml/metrics.json`.

## Honest coverage and limits

- The dataset is **English SMS spam from 2011** (prizes, ringtones,
  premium-rate numbers). It does **NOT** cover modern Indian fraud:
  digital arrest, UPI collect requests, crypto / task scams, fake
  customer-care calls, courier-fee scams, job-offer fraud — none of
  these appear in the training data, and the model will be weak or
  blind on them. The rules remain the primary defence there.
- **Hinglish coverage is none.** The model only knows Latin-script
  English tokens; Hindi/Hinglish words are out-of-vocabulary and
  contribute nothing. A Hinglish scam message can score low.
- **Recall is the weak side (87.9%):** 8 of 66 held-out spam messages
  were missed. A low model score is NOT proof a message is safe.
- **The 32 Situation Guides are guides, NOT training classes.** The
  model was never trained on them and must never be described that way.
- No data leaves the device: inference runs in the browser with
  @tensorflow/tfjs, loaded lazily only when a Shield check runs.

## Datasets considered and rejected

- `bolewara/hinglish-scam-text-dataset` (3,787 rows) — NOT used. Mostly
  UCI-derived English; only 35 hand-written Hinglish scam + 28
  hand-written Hinglish benign rows, i.e. author-written curated
  examples, not real collected messages. Adding 63 hand-written rows
  to 5,159 real ones would not fix Hinglish coverage and would muddy
  the "real labeled data" claim. Left out deliberately.
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
| `ml/data/sms-spam.csv` | Training data (5,159 real rows) |
| `ml/data/LICENSE.txt` | Dataset license (verbatim) |
| `ml/download-data.sh` | Reproducible re-download + SHA check |
| `ml/dataset.mjs` | CSV parse + seeded 80/10/10 split |
| `ml/tokenizer.mjs` | Shared tokenizer + vocab + vectorize |
| `ml/train.mjs` | Training script (`npm run train`) |
| `ml/metrics.json` | Held-out test metrics |
| `ml/fixtures.json` | Real held-out rows used by vitest |
| `public/ml/shield-model/model.json` | Shipped model (264 KB) |
| `src/engines/shield/mlModel.ts` | Lazy browser loader + inference |
| `src/engines/shield/mlModel.test.ts` | Load + fixture + accuracy checks |
