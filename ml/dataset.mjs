// Dataset loading + seeded 80/10/10 split. Shared by ml/train.mjs and the
// vitest accuracy check so the test split is derived identically in both.
//
// Source: ml/data/sms-spam.csv — jngb-labs/sms-spam (UCI SMS Spam Collection,
// deduplicated), 5,159 rows: 4,517 ham / 642 spam, columns label,text.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SEED = 42;

/** Minimal CSV parser: handles quoted fields, embedded commas, "" escapes. */
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** mulberry32 — small deterministic PRNG, seeded so splits are stable. */
export function seededShuffle(arr, seed = SEED) {
  const a = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Normalized text for cross-source dedupe (lowercase, alnum+space only). */
export function normText(t) {
  return String(t ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Load the MERGED training set (Step 16): three real labeled sources,
 * FULL pools when ml/data/*-full.csv exist (ml/prepare-data.mjs FULL=1),
 * else the 6,000 / 5,000 samples.
 *   sms       ml/data/sms-spam.csv        — UCI SMS Spam, whole set (5,159)
 *   enron     ml/data/enron-full.csv      — Enron spam emails, full pool (29,865 after dedupe)
 *   phishing  ml/data/phishing-full.csv   — phishing/safe emails, full pool (7,619 after cross-dedupe vs full Enron)
 * Email texts were truncated to 600 chars by ml/prepare-data.mjs.
 *
 * Global dedupe by normalized text runs BEFORE the split, so no message
 * can leak from train into test through a different source (the phishing
 * set overlaps Enron by ~9%). Split is stratified per source, seeded
 * (42) 80/10/10. `dataDir` defaults to ml/data next to this file; the
 * old single-path call (loadSplit(csvPath)) is no longer supported.
 */
export function loadSplit(dataDir) {
  const dir = dataDir ?? new URL('./data', import.meta.url).pathname;
  const read = (f) => readFileSync(join(dir, f), 'utf8');
  // Step 16: when the FULL pools exist (ml/prepare-data.mjs FULL=1),
  // train on them instead of the 6k/5k samples — same seeded 80/10/10
  // protocol, same global dedupe before the split. The sample files
  // stay in the repo as the fallback when no full files are present.
  const sources = [
    { source: 'sms', file: 'sms-spam.csv', expected: 5159 },
    { source: 'enron', file: existsSync(join(dir, 'enron-full.csv')) ? 'enron-full.csv' : 'enron-sample.csv', expected: existsSync(join(dir, 'enron-full.csv')) ? 29865 : 6000 },
    { source: 'phishing', file: existsSync(join(dir, 'phishing-full.csv')) ? 'phishing-full.csv' : 'phishing-sample.csv', expected: existsSync(join(dir, 'phishing-full.csv')) ? 7619 : 5000 },
  ];
  const seen = new Set();
  const perSource = [];
  for (const { source, file, expected } of sources) {
    const rows = parseCsv(read(file));
    const header = rows[0];
    if (header[0] !== 'label' || header[1] !== 'text') {
      throw new Error(`unexpected CSV header in ${file}: ${header.join(',')}`);
    }
    const data = [];
    for (const [label, text] of rows.slice(1)) {
      if (!text || !text.trim()) continue;
      const n = normText(text);
      if (!n || seen.has(n)) continue; // cross-source duplicate — drop
      seen.add(n);
      data.push({ label, text, y: label === 'spam' ? 1 : 0, source });
    }
    // Normalized dedupe is stricter than the files' own dedupe (it also
    // collapses case/punctuation variants), so the counts land slightly
    // below the nominal file sizes — sanity-check a floor, not equality.
    if (data.length < expected - 200) {
      throw new Error(`expected ~${expected} rows in ${file} after dedupe, got ${data.length}`);
    }
    perSource.push({ source, rows: data });
  }
  const all = [];
  const train = [];
  const val = [];
  const test = [];
  const counts = [];
  for (const { source, rows } of perSource) {
    const shuffled = seededShuffle(rows);
    const nTrain = Math.floor(rows.length * 0.8);
    const nVal = Math.floor(rows.length * 0.1);
    const sTrain = shuffled.slice(0, nTrain);
    const sVal = shuffled.slice(nTrain, nTrain + nVal);
    const sTest = shuffled.slice(nTrain + nVal);
    all.push(...rows);
    train.push(...sTrain);
    val.push(...sVal);
    test.push(...sTest);
    counts.push({ source, total: rows.length, train: sTrain.length, val: sVal.length, test: sTest.length });
  }
  return { all, train, val, test, sources: counts };
}
