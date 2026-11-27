// Shield ML model checks — the model file must load, predict correctly on
// REAL held-out rows from the training dataset, and its real held-out test
// accuracy must match the reported number in ml/metrics.json.
// Fixtures: ml/fixtures.json (first 3 spam + 3 ham rows of the seeded test
// split of jngb-labs/sms-spam). No synthetic examples anywhere here.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { decodeWeightData, type ShieldModelJson } from './mlModel';
import { vectorize } from '../../../ml/tokenizer.mjs';
import { loadSplit } from '../../../ml/dataset.mjs';

const ROOT = process.cwd();
const modelJson = JSON.parse(
  readFileSync(`${ROOT}/public/ml/shield-model/model.json`, 'utf8'),
) as ShieldModelJson;
const metrics = JSON.parse(readFileSync(`${ROOT}/ml/metrics.json`, 'utf8'));
const fixtures = JSON.parse(readFileSync(`${ROOT}/ml/fixtures.json`, 'utf8')) as {
  label: string;
  text: string;
}[];

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
    expect(fixtures).toHaveLength(6);
    for (const f of fixtures) {
      const x = tf.tensor2d([Array.from(vectorize(f.text, modelJson.vocab))], [1, modelJson.vocab.length]);
      const p = (await (model.predict(x) as tf.Tensor).data())[0];
      x.dispose();
      if (f.label === 'spam') expect(p).toBeGreaterThan(0.5);
      else expect(p).toBeLessThan(0.5);
    }
  });

  it('held-out test accuracy matches the reported number (±0.02)', async () => {
    const model = await loadModel();
    const { test } = loadSplit(`${ROOT}/ml/data/sms-spam.csv`);
    let correct = 0;
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const row of test) {
      const x = tf.tensor2d([Array.from(vectorize(row.text, modelJson.vocab))], [1, modelJson.vocab.length]);
      const p = (await (model.predict(x) as tf.Tensor).data())[0];
      x.dispose();
      const pred = p >= 0.5 ? 1 : 0;
      if (pred === row.y) correct++;
      if (pred === 1 && row.y === 1) tp++;
      else if (pred === 1) fp++;
      else if (row.y === 1) fn++;
    }
    const accuracy = correct / test.length;
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    expect(test.length).toBe(metrics.n);
    expect(accuracy).toBeGreaterThanOrEqual(metrics.accuracy - 0.02);
    expect(accuracy).toBeLessThanOrEqual(metrics.accuracy + 0.02);
    expect(precision).toBeGreaterThanOrEqual(metrics.precision - 0.05);
    expect(recall).toBeGreaterThanOrEqual(metrics.recall - 0.05);
  });
});
