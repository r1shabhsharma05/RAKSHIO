// Shared tokenizer for the Shield ML model — ONE code path for training
// (ml/train.mjs) and browser inference (src/engines/shield/mlModel.ts).
// Any change here retrains the model; never edit one side only.
//
// Tokenization: lowercase, non-alphanumeric -> space, split on whitespace,
// drop tokens shorter than 2 chars. No stemming, no stopword list — the
// vocab is built ONLY from the training split (see ml/dataset.mjs), so
// there is no leakage from val/test into the features. Per-source vocab
// union in ml/train.mjs (top SMS tokens + top email tokens) so neither
// domain crowds the other out. Word bigrams were tried in run #3 and
// REVERTED — they helped phishing (+1.8%) but sank SMS precision
// (85.9% -> 71.6%); unigrams only.

export const VOCAB_SIZE = 3000;

/** Split raw text into tokens. Pure function, no state. */
export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2);
}

/**
 * Build a vocab from training texts only.
 * Returns the top `size` tokens by frequency; ties broken alphabetically
 * so the vocab is deterministic for a fixed training split.
 */
export function buildVocab(texts, size = VOCAB_SIZE) {
  const counts = new Map();
  for (const text of texts) {
    for (const t of new Set(tokenize(text))) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, size)
    .map(([token]) => token);
}

/** Binary bag-of-words presence vector over `vocab` (index = vocab order). */
export function vectorize(text, vocab) {
  const vec = new Float32Array(vocab.length);
  const index = new Map(vocab.map((t, i) => [t, i]));
  for (const t of new Set(tokenize(text))) {
    const i = index.get(t);
    if (i !== undefined) vec[i] = 1;
  }
  return vec;
}
