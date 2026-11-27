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

import { tokenize, vectorize } from '../../../ml/tokenizer.mjs';

/** Fraction of the message's tokens that exist in the model vocab (0..1).
 *  The tokenizer lowercases and drops non-alphanumeric runs, so Devanagari
 *  and most Hinglish words are invisible to the model by construction —
 *  a low coverage means the score is built on almost none of the words
 *  the user actually wrote. Pure function, no tfjs needed. */
export function vocabCoverage(text: string, vocab: string[]): number {
  const tokens = [...new Set(tokenize(text))];
  if (tokens.length === 0) return 0;
  const known = new Set(vocab);
  return tokens.filter((t) => known.has(t)).length / tokens.length;
}

export type ModelWarning = 'disagree' | 'low-coverage' | null;

/** When the model score cannot be trusted next to the rules verdict.
 *  'disagree': rules say danger but the model says safe (or vice versa)
 *  — showing the bare score would reassure a victim the rules just
 *  warned. 'low-coverage': most of the message's words are outside the
 *  model's English training vocab, so the score is near-meaningless.
 *  Pure function, unit-tested on the exact E2E danger sentence. */
export function modelWarning(
  level: 'safe' | 'suspicious' | 'danger',
  score: number | null,
  coverage: number,
): ModelWarning {
  if (score === null) return null;
  if ((level === 'danger' && score < 0.5) || (level === 'safe' && score >= 0.5)) return 'disagree';
  if (coverage < 0.5) return 'low-coverage';
  return null;
}

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
  /** Fraction of the text's tokens the model vocab actually knows (0..1). */
  coverage: (text: string) => number;
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
          coverage: (text: string) => vocabCoverage(text, vocab),
        };
      } catch {
        return null;
      }
    })();
  }
  return cached;
}
