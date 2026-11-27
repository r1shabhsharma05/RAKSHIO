// Shield ML model — on-device TF.js inference, loaded LAZILY (only when
// the user runs a Shield check, never on first load, never blocking 1930).
//
// The model was trained in ml/train.mjs on the REAL labeled merged
// dataset (UCI SMS Spam + Enron spam + phishing emails, 16,128 rows;
// full provenance in ml/README.md). It is an EXTRA signal only: the 16
// rules are still the explanation, and the model score never overrides
// the rules' flags. The model was NOT trained on the 32 Situation
// Guides — those are guides, not training classes.
// Inference is fully on-device; no text leaves the device.

import { vectorize } from '../../../ml/tokenizer.mjs';

export interface ShieldModelMeta {
  dataset: string;
  datasetUrl: string;
  rows: number;
  testN: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface ShieldModel {
  /** Scam probability 0..1 for the pasted text. */
  predict: (text: string) => Promise<number>;
  meta: ShieldModelMeta;
}

export interface ShieldModelJson {
  modelTopology: unknown;
  weightSpecs: { name: string; shape: number[]; dtype: string }[];
  weightData: string; // base64
  vocab: string[];
  dataset: string;
  datasetUrl: string;
  rows: number;
  threshold: number; // tuned on VALIDATION only, never on test
  metrics: { n: number; accuracy: number; precision: number; recall: number };
}

/** Decode the base64 weightData of a saved model.json into an ArrayBuffer. */
export function decodeWeightData(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

let cached: Promise<ShieldModel | null> | null = null;

/** Lazy-load the model + tfjs. Resolves null (never throws) if it fails. */
export function loadShieldModel(): Promise<ShieldModel | null> {
  if (!cached) {
    cached = (async (): Promise<ShieldModel | null> => {
      try {
        const tf = await import('@tensorflow/tfjs');
        const res = await fetch('/ml/shield-model/model.json');
        if (!res.ok) return null;
        const json = (await res.json()) as ShieldModelJson;
        const model = await tf.loadLayersModel(
          tf.io.fromMemory({
            modelTopology: json.modelTopology,
            weightSpecs: json.weightSpecs,
            weightData: decodeWeightData(json.weightData),
          }),
        );
        const vocab = json.vocab;
        return {
          meta: {
            dataset: json.dataset,
            datasetUrl: json.datasetUrl,
            rows: json.rows,
            testN: json.metrics.n,
            accuracy: json.metrics.accuracy,
            precision: json.metrics.precision,
            recall: json.metrics.recall,
          },
          predict: async (text: string) => {
            const x = tf.tensor2d([Array.from(vectorize(text, vocab))], [1, vocab.length]);
            const out = model.predict(x) as ReturnType<typeof tf.tensor>;
            const p = (await out.data())[0];
            x.dispose();
            out.dispose();
            return p;
          },
        };
      } catch {
        return null;
      }
    })();
  }
  return cached;
}
