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
//
// Step 16 (char n-grams): word unigrams alone leave Hinglish Roman text
// almost entirely out-of-vocabulary (the old model scored the Hinglish
// probe at 52.1% accuracy, 40.6% recall). Character trigrams are the
// transfer mechanism: an unseen Hinglish word still shares substrings
// with English training words ("account", "otp", "link", "click" appear
// verbatim inside Hinglish messages; "batao" shares "bat"/"ata" with
// "battery"/"attack"). Char features are stored in the SAME vocab list
// with a "c:" prefix so word tokens and char grams can never collide,
// and vectorize() emits both from one vocab — one code path for training
// and the browser, no drift. No Hinglish training rows exist: the char
// vocab is built ONLY from the English training split, so this is
// transfer, not Hinglish training — and the probe set is never trained on.

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

/** Character trigrams of a text, with word-boundary padding.
 *  Each word token (len >= 2) becomes "#<word>#" and contributes all
 *  its 3-char substrings, each prefixed "c:" so they never collide with
 *  word tokens in the shared vocab list. Pure function, no state. */
export function charTrigrams(text) {
  const grams = [];
  for (const t of tokenize(text)) {
    const padded = `#${t}#`;
    for (let i = 0; i + 3 <= padded.length; i++) grams.push(`c:${padded.slice(i, i + 3)}`);
  }
  return grams;
}

/**
 * Build a char-trigram vocab from training texts only.
 * Returns the top `size` trigrams by document frequency; ties broken
 * alphabetically so the vocab is deterministic for a fixed training split.
 */
export function buildCharVocab(texts, size = 1500) {
  const counts = new Map();
  for (const text of texts) {
    for (const g of new Set(charTrigrams(text))) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, size)
    .map(([gram]) => gram);
}

/** Binary bag-of-words presence vector over `vocab` (index = vocab order).
 *  Emits word unigrams AND char trigrams (entries prefixed "c:") — a
 *  vocab with no "c:" entries behaves exactly like the old word-only
 *  vectorizer, so old model.json files still load and score. */
export function vectorize(text, vocab) {
  const vec = new Float32Array(vocab.length);
  const index = new Map(vocab.map((t, i) => [t, i]));
  for (const t of new Set(tokenize(text))) {
    const i = index.get(t);
    if (i !== undefined) vec[i] = 1;
  }
  for (const g of new Set(charTrigrams(text))) {
    const i = index.get(g);
    if (i !== undefined) vec[i] = 1;
  }
  return vec;
}
