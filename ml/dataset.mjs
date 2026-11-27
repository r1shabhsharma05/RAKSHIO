// Dataset loading + seeded 80/10/10 split. Shared by ml/train.mjs and the
// vitest accuracy check so the test split is derived identically in both.
//
// Source: ml/data/sms-spam.csv — jngb-labs/sms-spam (UCI SMS Spam Collection,
// deduplicated), 5,159 rows: 4,517 ham / 642 spam, columns label,text.

import { readFileSync } from 'node:fs';

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

/** Load the CSV and return the seeded 80/10/10 train/val/test split. */
export function loadSplit(csvPath) {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const header = rows[0];
  if (header[0] !== 'label' || header[1] !== 'text') {
    throw new Error(`unexpected CSV header: ${header.join(',')}`);
  }
  const data = rows.slice(1).map(([label, text]) => ({ label, text, y: label === 'spam' ? 1 : 0 }));
  if (data.length !== 5159) throw new Error(`expected 5159 rows, got ${data.length}`);
  const shuffled = seededShuffle(data);
  const nTrain = Math.floor(data.length * 0.8);
  const nVal = Math.floor(data.length * 0.1);
  return {
    all: data,
    train: shuffled.slice(0, nTrain),
    val: shuffled.slice(nTrain, nTrain + nVal),
    test: shuffled.slice(nTrain + nVal),
  };
}
