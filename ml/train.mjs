// Train the Shield ML model on the REAL labeled SMS Spam dataset.
//   node ml/train.mjs
// Writes:
//   public/ml/shield-model/model.json — single-file TF.js artifact
//     (standard ModelArtifacts serialization: modelTopology + weightSpecs +
//     base64 weightData, loadable via tf.io.fromMemory; verified by a
//     round-trip reload + re-evaluation in this same script)
//   ml/metrics.json — held-out test metrics (the numbers the UI quotes)
//   ml/fixtures.json — real held-out test rows used by the vitest check
//
// Model: binary bag-of-words (vocab built ONLY from the training split,
// top 1500 tokens) -> Dense(32, relu) -> Dense(1, sigmoid). CPU, Node.
// Split: seeded (42) 80/10/10 of the 5,159 real rows. No synthetic data,
// no training on the 32 Situation Guides — those are guides, not classes.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { loadSplit } from './dataset.mjs';
import { buildVocab, vectorize } from './tokenizer.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EPOCHS = 15;

const { train, val, test } = loadSplit(join(ROOT, 'ml/data/sms-spam.csv'));
const vocab = buildVocab(train.map((r) => r.text));
console.log(`split train=${train.length} val=${val.length} test=${test.length} vocab=${vocab.length}`);

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

const tr = toXY(train);
const va = toXY(val);
const te = toXY(test);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [vocab.length] }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
model.compile({ optimizer: tf.train.adam(0.003), loss: 'binaryCrossentropy', metrics: ['accuracy'] });
await model.fit(tr.x, tr.y, { epochs: EPOCHS, batchSize: 32, validationData: [va.x, va.y], verbose: 0 });

function metrics(rows, probs) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  rows.forEach((r, i) => {
    const p = probs[i] >= 0.5 ? 1 : 0;
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

const probs = [...(await model.predict(te.x).data())];
const m = metrics(test, probs);
console.log('HELD-OUT TEST', JSON.stringify(m, null, 2));

// Save as a single-file standard TF.js artifact (ModelArtifacts JSON).
let artifacts;
await model.save(tf.io.withSaveHandler(async (a) => { artifacts = a; return { modelArtifactsInfo: {} }; }));
const weightB64 = Buffer.from(artifacts.weightData).toString('base64');
const out = {
  format: 'tfjs-layers-model-inline-v1',
  dataset: 'jngb-labs/sms-spam (UCI SMS Spam Collection, deduplicated)',
  datasetUrl: 'https://huggingface.co/datasets/jngb-labs/sms-spam',
  rows: 5159, ham: 4517, spam: 642,
  split: { seed: 42, train: train.length, val: val.length, test: test.length },
  vocabSize: vocab.length, vocab,
  metrics: m,
  modelTopology: artifacts.modelTopology,
  weightSpecs: artifacts.weightSpecs,
  weightData: weightB64,
};
const outPath = join(ROOT, 'public/ml/shield-model/model.json');
writeFileSync(outPath, JSON.stringify(out));
const metricsPath = join(ROOT, 'ml/metrics.json');
writeFileSync(metricsPath, JSON.stringify({ ...m, dataset: out.dataset, rows: out.rows, split: out.split, vocabSize: vocab.length, epochs: EPOCHS }, null, 2));

// Real held-out fixtures for the vitest check (source: test split).
const spamFix = test.filter((r) => r.y === 1).slice(0, 3);
const hamFix = test.filter((r) => r.y === 0).slice(0, 3);
writeFileSync(join(ROOT, 'ml/fixtures.json'), JSON.stringify(
  [...spamFix, ...hamFix].map((r) => ({ label: r.label, text: r.text })),
  null, 2,
));

// Round-trip verify: reload the written file exactly as the browser does.
const { readFileSync } = await import('node:fs');
const saved = JSON.parse(readFileSync(outPath, 'utf8'));
const b64buf = Buffer.from(saved.weightData, 'base64');
const weightData = b64buf.buffer.slice(b64buf.byteOffset, b64buf.byteOffset + b64buf.byteLength);
const reloaded = await tf.loadLayersModel(tf.io.fromMemory({
  modelTopology: saved.modelTopology, weightSpecs: saved.weightSpecs, weightData,
}));
const probs2 = [...(await reloaded.predict(te.x).data())];
const m2 = metrics(test, probs2);
console.log('ROUND-TRIP TEST', JSON.stringify(m2));
if (Math.abs(m2.accuracy - m.accuracy) > 1e-6) throw new Error('round-trip accuracy mismatch');
const sizeKb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(1);
console.log(`saved ${outPath} (${sizeKb} KB), metrics -> ${metricsPath}`);
