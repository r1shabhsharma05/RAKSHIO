// Train the Shield ML model on the REAL labeled merged dataset (Step 16).
//   npm run train        (node ml/train.mjs, CPU, ~13 min full data at EPOCHS=6)
//   EPOCHS=12 npm run train   (sampled-data recipe; ~22 min on full data — over the practical bound)
// Writes:
//   public/ml/shield-model/model.json — single-file TF.js artifact
//     (standard ModelArtifacts serialization: modelTopology + weightSpecs +
//     base64 weightData, loadable via tf.io.fromMemory; verified by a
//     round-trip reload + re-evaluation in this same script)
//   ml/metrics.json — train/val/test metrics + per-source test metrics
//     (the numbers the UI quotes come from the TEST split only)
//   ml/fixtures.json — real held-out test rows used by the vitest check
//
// Data (ml/dataset.mjs): UCI SMS Spam (5,159) + Enron FULL pool
// (29,865 after dedupe) + phishing-email FULL pool (7,619 after
// cross-dedupe vs full Enron) = ~42.5k real rows when the *-full.csv
// files exist (Step 16), else the 6,000 / 5,000 samples (~16k rows).
// dedupe BEFORE the seeded (42) stratified 80/10/10 split — no message
// can leak from train into test via another source. No synthetic data,
// no training on the 32 Situation Guides — those are guides, not classes.
//
// Model: binary bag-of-words (per-source vocab union: top 1,500 SMS
// tokens + top 2,500 email tokens, unigrams only, built ONLY from the
// training split) + char trigrams (top 1,500, Step 16 — the Hinglish
// transfer mechanism; see ml/tokenizer.mjs) -> Dense(32, relu) ->
// Dropout(0.2) -> Dense(1, sigmoid). Class weights from the train split
// (spam is the minority). Threshold tuned on the
// VALIDATION split only (grid 0.30-0.70, max accuracy); the test split
// is evaluated exactly once, after tuning, and never re-rolled.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { loadSplit } from './dataset.mjs';
import { buildVocab, buildCharVocab, vectorize } from './tokenizer.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Epochs: 12 by default (Steps 14–15 recipe). The full-data run uses
// EPOCHS=6: both prior runs' val accuracy was flat from epoch 2–3 on
// (95.5% → 96.5% by epoch 2, then 96.3–97.0% through epoch 12), so 6
// epochs reaches the same plateau at ~half the CPU time on 34k rows.
const EPOCHS = Number(process.env.EPOCHS ?? 12);
const HIDDEN = 32;
const CHAR_VOCAB = 1500;
const BATCH = 32;

const { train, val, test, sources } = loadSplit(join(ROOT, 'ml/data'));
// Per-source vocab union: top 1,500 SMS tokens + top 2,500 email tokens.
// A single merged DF ranking drops SMS-specific tokens (ringtone, kyc,
// otp, upi, aadhaar all fell out of the first 3,000) because email docs
// dominate the corpus — that collapse is what sank SMS precision in the
// first merged run. The union guarantees SMS tokens survive.
const smsVocab = buildVocab(train.filter((r) => r.source === 'sms').map((r) => r.text), 1500);
const mailVocab = buildVocab(train.filter((r) => r.source !== 'sms').map((r) => r.text), 2500);
// Char trigrams (Step 16): built ONLY from the training split, like the
// word vocab — the transfer mechanism for Hinglish Roman text, where
// whole words are out-of-vocabulary but substrings are shared.
const charVocab = buildCharVocab(train.map((r) => r.text), CHAR_VOCAB);
const vocab = [...new Set([...smsVocab, ...mailVocab, ...charVocab])];
console.log(`split train=${train.length} val=${val.length} test=${test.length} vocab=${vocab.length} (sms ${smsVocab.length} + mail ${mailVocab.length} + char ${charVocab.length})`);
console.log('sources:', JSON.stringify(sources));

const toXY = (rows) => {
  const xs = new Float32Array(rows.length * vocab.length);
  const ys = new Float32Array(rows.length);
  rows.forEach((r, i) => {
    xs.set(vectorize(r.text, vocab), i * vocab.length);
    ys[i] = r.y;
  });
  return {
    x: tf.tensor2d(xs, [rows.length, vocab.length]),
    y: tf.tensor2d(ys, [rows.length, 1]),
  };
};

const va = toXY(val);
const te = toXY(test);

// Batched prediction (avoids materializing a full train-size matrix
// twice): used for the train/test metric passes on the full dataset.
async function predictProbs(model, rows, batchSize = 2048) {
  const out = new Float32Array(rows.length);
  for (let s = 0; s < rows.length; s += batchSize) {
    const chunk = rows.slice(s, s + batchSize);
    const x = toXY(chunk).x;
    const p = await model.predict(x).data();
    out.set(p, s);
    x.dispose();
  }
  return [...out];
}

const nSpam = train.filter((r) => r.y === 1).length;
const classWeight = { 0: train.length / (2 * (train.length - nSpam)), 1: train.length / (2 * nSpam) };
console.log('classWeight:', JSON.stringify(classWeight));

const model = tf.sequential();
model.add(tf.layers.dense({ units: HIDDEN, activation: 'relu', inputShape: [vocab.length] }));
model.add(tf.layers.dropout({ rate: 0.2 }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
model.compile({ optimizer: tf.train.adam(0.003), loss: 'binaryCrossentropy', metrics: ['accuracy'] });
// Train from a batched generator, not one materialized train matrix:
// the full-data train split is ~34k rows × ~4,600 features (~630 MB
// as one Float32 tensor — too much next to the val/test tensors on
// this VM). The generator reshuffles every epoch; classWeight still
// applies per batch via fitDataset.
function* trainBatches() {
  const order = [...train.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let s = 0; s < order.length; s += BATCH) {
    const { x, y } = toXY(order.slice(s, s + BATCH).map((i) => train[i]));
    yield { xs: x, ys: y };
  }
}
const history = await model.fitDataset(tf.data.generator(trainBatches), {
  epochs: EPOCHS, validationData: [va.x, va.y], verbose: 0, classWeight,
});
console.log('val acc by epoch:', history.history.val_acc.map((v) => +v.toFixed(4)).join(' '));

function metrics(rows, probs, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  rows.forEach((r, i) => {
    const p = probs[i] >= threshold ? 1 : 0;
    if (p === 1 && r.y === 1) tp++;
    else if (p === 1) fp++;
    else if (r.y === 1) fn++;
    else tn++;
  });
  const n = rows.length;
  return {
    n, tp, fp, tn, fn,
    accuracy: (tp + tn) / n,
    precision: tp + fp === 0 ? 0 : tp / (tp + fp),
    recall: tp + fn === 0 ? 0 : tp / (tp + fn),
  };
}

// Threshold tuned on VALIDATION only (never on test).
const valProbs = [...(await model.predict(va.x).data())];
let threshold = 0.5;
let bestValAcc = -1;
for (let t = 0.3; t <= 0.7001; t += 0.05) {
  const a = metrics(val, valProbs, +t.toFixed(2)).accuracy;
  if (a > bestValAcc) { bestValAcc = a; threshold = +t.toFixed(2); }
}
console.log(`tuned threshold=${threshold} (val acc ${(bestValAcc * 100).toFixed(2)}%)`);

const trainProbs = await predictProbs(model, train);
const testProbs = await predictProbs(model, test);
const mTrain = metrics(train, trainProbs, threshold);
const mVal = metrics(val, valProbs, threshold);
const mTest = metrics(test, testProbs, threshold);
console.log('TRAIN', JSON.stringify(mTrain));
console.log('VAL', JSON.stringify(mVal));
console.log('HELD-OUT TEST', JSON.stringify(mTest));

// Per-source test metrics (same threshold) — the honest breakdown.
const bySource = {};
for (const s of ['sms', 'enron', 'phishing']) {
  const idx = test.map((r, i) => (r.source === s ? i : -1)).filter((i) => i >= 0);
  bySource[s] = metrics(idx.map((i) => test[i]), idx.map((i) => testProbs[i]), threshold);
}
console.log('BY SOURCE (test)', JSON.stringify(bySource));

// Save as a single-file standard TF.js artifact (ModelArtifacts JSON).
let artifacts;
await model.save(tf.io.withSaveHandler(async (a) => { artifacts = a; return { modelArtifactsInfo: {} }; }));
const weightB64 = Buffer.from(artifacts.weightData).toString('base64');
const out = {
  format: 'tfjs-layers-model-inline-v1',
  dataset: 'SMS Spam (UCI) + Enron spam + Phishing Email (merged, real labeled rows)',
  datasetUrl: 'https://huggingface.co/datasets/jngb-labs/sms-spam',
  sources: sources.map((s) => ({ source: s.source, total: s.total, train: s.train, val: s.val, test: s.test })),
  rows: train.length + val.length + test.length,
  split: { seed: 42, train: train.length, val: val.length, test: test.length },
  vocabSize: vocab.length, vocab,
  features: 'word unigrams (per-source union) + char trigrams (top 1500, c: prefix)',
  charVocabSize: charVocab.length,
  threshold,
  metrics: mTest,
  bySource,
  modelTopology: artifacts.modelTopology,
  weightSpecs: artifacts.weightSpecs,
  weightData: weightB64,
};
const outPath = join(ROOT, 'public/ml/shield-model/model.json');
writeFileSync(outPath, JSON.stringify(out));
const metricsPath = join(ROOT, 'ml/metrics.json');
writeFileSync(metricsPath, JSON.stringify({
  ...mTest,
  dataset: out.dataset,
  sources: out.sources,
  rows: out.rows,
  split: out.split,
  vocabSize: vocab.length,
  features: out.features,
  charVocabSize: charVocab.length,
  epochs: EPOCHS,
  hiddenUnits: HIDDEN,
  threshold,
  train: mTrain,
  val: mVal,
  bySource,
}, null, 2));

// Real held-out fixtures for the vitest check (source: test split).
const smsSpam = test.filter((r) => r.source === 'sms' && r.y === 1).slice(0, 3);
const smsHam = test.filter((r) => r.source === 'sms' && r.y === 0).slice(0, 3);
const mailSpam = test.filter((r) => r.source !== 'sms' && r.y === 1).slice(0, 1);
const mailHam = test.filter((r) => r.source !== 'sms' && r.y === 0).slice(0, 1);
writeFileSync(join(ROOT, 'ml/fixtures.json'), JSON.stringify(
  [...smsSpam, ...smsHam, ...mailSpam, ...mailHam].map((r) => ({ label: r.label, text: r.text, source: r.source })),
  null, 2,
));

// Round-trip verify: reload the written file exactly as the browser does.
const saved = JSON.parse(readFileSync(outPath, 'utf8'));
const b64buf = Buffer.from(saved.weightData, 'base64');
const weightData = b64buf.buffer.slice(b64buf.byteOffset, b64buf.byteOffset + b64buf.byteLength);
const reloaded = await tf.loadLayersModel(tf.io.fromMemory({
  modelTopology: saved.modelTopology, weightSpecs: saved.weightSpecs, weightData,
}));
const probs2 = [...(await reloaded.predict(te.x).data())];
const m2 = metrics(test, probs2, threshold);
console.log('ROUND-TRIP TEST', JSON.stringify(m2));
if (Math.abs(m2.accuracy - mTest.accuracy) > 1e-6) throw new Error('round-trip accuracy mismatch');
const sizeKb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(1);
console.log(`saved ${outPath} (${sizeKb} KB), metrics -> ${metricsPath}`);
