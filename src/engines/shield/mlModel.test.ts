// Shield ML model checks — the model file must load, predict correctly on
// REAL held-out rows from the merged training set, and its real held-out
// test accuracy must match the reported number in ml/metrics.json.
// Fixtures: ml/fixtures.json (3 spam + 3 ham SMS + 1 phishing + 1 safe
// email rows of the seeded test split). No synthetic examples anywhere.
// The decision threshold comes from the shipped model.json itself
// (tuned on VALIDATION only); the test split is never used for tuning.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { decodeWeightData, type ShieldModelJson } from './mlModel';
import { vectorize } from '../../../ml/tokenizer.mjs';
import { loadSplit } from '../../../ml/dataset.mjs';

const ROOT = process.cwd();
const modelJson = JSON.parse(
  readFileSync(`${ROOT}/public/ml/shield-model/model.json`, 'utf8'),
) as ShieldModelJson & { threshold: number };
const metrics = JSON.parse(readFileSync(`${ROOT}/ml/metrics.json`, 'utf8'));
const fixtures = JSON.parse(readFileSync(`${ROOT}/ml/fixtures.json`, 'utf8')) as {
  label: string;
  text: string;
  source: string;
}[];
const THRESHOLD = modelJson.threshold ?? 0.5;

async function loadModel() {
  return tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightSpecs,
      weightData: decodeWeightData(modelJson.weightData),
    }),
  );
}

describe('shield ML model', () => {
  it('loads and predicts the right side on real held-out fixtures', async () => {
    const model = await loadModel();
    expect(fixtures).toHaveLength(8);
    for (const f of fixtures) {
      const x = tf.tensor2d([Array.from(vectorize(f.text, modelJson.vocab))], [1, modelJson.vocab.length]);
      const p = (await (model.predict(x) as tf.Tensor).data())[0];
      x.dispose();
      if (f.label === 'spam') expect(p).toBeGreaterThanOrEqual(THRESHOLD);
      else expect(p).toBeLessThan(THRESHOLD);
    }
  });

  it('held-out test accuracy matches the reported number (±0.02)', async () => {
    const model = await loadModel();
    const { test } = loadSplit(`${ROOT}/ml/data`);
    let correct = 0;
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let smsCorrect = 0;
    let smsN = 0;
    for (const row of test) {
      const x = tf.tensor2d([Array.from(vectorize(row.text, modelJson.vocab))], [1, modelJson.vocab.length]);
      const p = (await (model.predict(x) as tf.Tensor).data())[0];
      x.dispose();
      const pred = p >= THRESHOLD ? 1 : 0;
      if (pred === row.y) correct++;
      if (pred === 1 && row.y === 1) tp++;
      else if (pred === 1) fp++;
      else if (row.y === 1) fn++;
      if (row.source === 'sms') {
        smsN++;
        if (pred === row.y) smsCorrect++;
      }
    }
    const accuracy = correct / test.length;
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    expect(test.length).toBe(metrics.n);
    expect(accuracy).toBeGreaterThanOrEqual(metrics.accuracy - 0.02);
    expect(accuracy).toBeLessThanOrEqual(metrics.accuracy + 0.02);
    expect(precision).toBeGreaterThanOrEqual(metrics.precision - 0.05);
    expect(recall).toBeGreaterThanOrEqual(metrics.recall - 0.05);
    // SMS-only subset must also match its reported number — the merged
    // headline must not hide a weak SMS side.
    expect(smsCorrect / smsN).toBeGreaterThanOrEqual(metrics.bySource.sms.accuracy - 0.05);
    expect(smsCorrect / smsN).toBeLessThanOrEqual(metrics.bySource.sms.accuracy + 0.05);
  });
});
