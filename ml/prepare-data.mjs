// Prepare the Step 15 merged training set from the three REAL labeled
// sources (downloaded by ml/download-data.sh into ml/data/raw/, NOT
// committed — the raw files are 100+ MB). Writes the sampled CSVs that
// ARE committed and that ml/train.mjs reads:
//
//   ml/data/enron-sample.csv     — 6,000 Enron emails (3,000 spam / 3,000 ham)
//   ml/data/phishing-sample.csv  — 5,000 phishing/safe emails (seeded)
//
// Rules: no synthetic or hand-written rows, ever. UCI SMS Spam is used
// whole (ml/data/sms-spam.csv, already in the repo). Email text is
// truncated to the first 600 chars (subject + opening carry the signal;
// the app's inputs are short messages). Global dedupe by normalized
// text across all three sources happens here AND in the loader, so no
// message can appear in both train and test via different sources.
// Everything is seeded (42) so the output is reproducible.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, seededShuffle } from './dataset.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'ml/data/raw');
const MAX_CHARS = 600;
const SEED = 42;

const norm = (t) =>
  String(t ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
const csvEscape = (s) => `"${String(s).replace(/"/g, '""')}"`;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function writeCsv(path, rows) {
  const out = ['label,text', ...rows.map((r) => `${r.label},${csvEscape(r.text)}`)].join('\n') + '\n';
  writeFileSync(path, out);
  console.log(`${path.split('/').slice(-2).join('/')}: ${rows.length} rows, sha256 ${sha(out).slice(0, 12)}…`);
}

// --- Enron (SetFit/enron_spam train.jsonl + test.jsonl) ---
const enron = [];
for (const f of ['train.jsonl', 'test.jsonl']) {
  for (const line of readFileSync(join(RAW, `enron-${f}`), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    const text = clean(j.text);
    if (text.length < 10) continue;
    enron.push({ label: j.label === 1 ? 'spam' : 'ham', text, source: 'enron' });
  }
}
const enronSpam = seededShuffle(enron.filter((r) => r.label === 'spam'), SEED);
const enronHam = seededShuffle(enron.filter((r) => r.label === 'ham'), SEED);
// Dedupe internally by normalized text (Enron has near-duplicate forwards
// and quoted replies), then take 3,000 + 3,000 distinct rows.
const dedup = (rows) => {
  const seen = new Set();
  return rows.filter((r) => {
    const n = norm(r.text);
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
};
const enronSample = seededShuffle(
  [...dedup(enronSpam).slice(0, 3000), ...dedup(enronHam).slice(0, 3000)],
  SEED,
);
writeCsv(join(ROOT, 'ml/data/enron-sample.csv'), enronSample);

// --- Zefang phishing emails (Phishing_Email.csv) ---
const phishRows = parseCsv(readFileSync(join(RAW, 'Phishing_Email.csv'), 'utf8'));
const header = phishRows[0];
const textCol = header.indexOf('Email Text');
const typeCol = header.indexOf('Email Type');
if (textCol < 0 || typeCol < 0) throw new Error(`unexpected phishing header: ${header.join(',')}`);
const uciNorm = new Set(
  parseCsv(readFileSync(join(ROOT, 'ml/data/sms-spam.csv'), 'utf8')).slice(1).map(([, t]) => norm(t)),
);
const enronNorm = new Set(enronSample.map((r) => norm(r.text)));
const phish = [];
for (const row of phishRows.slice(1)) {
  const type = (row[typeCol] ?? '').trim();
  if (type !== 'Phishing Email' && type !== 'Safe Email') continue;
  const text = clean(row[textCol]);
  if (text.length < 10) continue;
  const n = norm(text);
  if (uciNorm.has(n) || enronNorm.has(n)) continue; // cross-source duplicate
  phish.push({ label: type === 'Phishing Email' ? 'spam' : 'ham', text, source: 'phishing', _n: n });
}
const seen = new Set();
const phishDedup = phish.filter((r) => (seen.has(r._n) ? false : (seen.add(r._n), true)));
const phishSample = seededShuffle(phishDedup, SEED).slice(0, 5000).map(({ _n, ...r }) => r);
writeCsv(join(ROOT, 'ml/data/phishing-sample.csv'), phishSample);

console.log(`enron pool=${enron.length} (spam ${enron.filter((r) => r.label === 'spam').length})`);
console.log(`phishing pool after dedupe=${phishDedup.length}, sampled=${phishSample.length}`);
