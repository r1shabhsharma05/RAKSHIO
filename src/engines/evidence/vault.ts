import Dexie, { type Table } from 'dexie';
import { sha256Hex, canonical } from './hash';
import { maskCredentials } from '../understanding/extract';

// Evidence Vault: IndexedDB, append-only, hash-chained. Each record's hash
// covers the previous record's hash, so editing any record breaks every
// hash after it — the Verify screen turns red and names the broken record.
export interface EvidenceRecord {
  id?: number;
  incidentId: string;
  kind: 'screenshot' | 'sms' | 'note' | 'file';
  label: string;
  text: string;
  data?: string;
  capturedAt: string;
  prevHash: string;
  hash: string;
  byCaregiver: boolean;
  redacted: boolean;
}

class RakshioDb extends Dexie {
  evidence!: Table<EvidenceRecord, number>;
  constructor() {
    super('rakshio-vault');
    this.version(1).stores({ evidence: '++id, incidentId, capturedAt' });
  }
}

export const db = new RakshioDb();

export async function addEvidence(
  rec: Omit<EvidenceRecord, 'id' | 'prevHash' | 'hash' | 'redacted'> & { text: string },
): Promise<EvidenceRecord> {
  // Step 20 (B2+B3): the prevHash comes from THIS incident's last row,
  // inside one transaction — the old code read the GLOBAL last row
  // (a second incident's evidence broke both chains) and read-then-added
  // with no transaction (a double-tap stored two rows on the same
  // prevHash). Dexie serializes transactions on this table, so two
  // concurrent adds chain correctly instead of forking.
  return db.transaction('rw', db.evidence, async () => {
    const rows = await db.evidence.where('incidentId').equals(rec.incidentId).sortBy('id');
    const prevHash = rows.length ? rows[rows.length - 1].hash : '';
    const { text, redacted } = redactText(rec.text);
    const base = { ...rec, text, redacted, prevHash };
    // crypto.subtle is a non-Dexie promise: a plain await inside a
    // transaction lets IndexedDB auto-commit before add() runs
    // (PrematureCommitError). Dexie.waitFor keeps the transaction alive.
    const hash = await Dexie.waitFor(sha256Hex(canonical(base)));
    const id = await db.evidence.add({ ...base, hash });
    return { ...base, hash, id };
  });
}

export async function listEvidence(incidentId: string): Promise<EvidenceRecord[]> {
  return db.evidence.where('incidentId').equals(incidentId).sortBy('capturedAt');
}

// Step 20 (B4): evidence saved under OTHER incidents, so the Vault/Proof
// screens can say where it is instead of showing a bare "0".
export async function countOtherEvidence(incidentId: string): Promise<{ count: number; incidentId: string | null }> {
  const others = await db.evidence.where('incidentId').notEqual(incidentId).toArray();
  return { count: others.length, incidentId: others.length ? others[0].incidentId : null };
}

export async function verifyChain(incidentId: string): Promise<{ ok: boolean; brokenAt?: number; count: number }> {
  const rows = await listEvidence(incidentId);
  let prev = '';
  for (const r of rows) {
    const { id, hash, ...rest } = r;
    const recomputed = await sha256Hex(canonical(rest));
    if (recomputed !== hash || r.prevHash !== prev) return { ok: false, brokenAt: id, count: rows.length };
    prev = hash;
  }
  return { ok: true, count: rows.length };
}

export async function rootHash(incidentId: string): Promise<string | null> {
  const rows = await listEvidence(incidentId);
  return rows.length ? rows[rows.length - 1].hash : null;
}

// Test/demo aid only: edits a record without re-hashing, so Verify must fail.
export async function tamperRecord(id: number, text: string): Promise<void> {
  await db.evidence.update(id, { text });
}

// Tamper test on a COPY: clones the rows in memory, corrupts the clone,
// and reports what verification WOULD say — the real Dexie rows are never
// touched, so the real chain always stays intact (master prompt rule).
export async function tamperTestCopy(rows: EvidenceRecord[]): Promise<{ ok: boolean; brokenAt?: number; count: number } | null> {
  if (rows.length === 0) return null;
  const copy = rows.map((r) => ({ ...r }));
  copy[0] = { ...copy[0], text: 'BADLA HUA — tamper test' };
  let prev = '';
  for (const r of copy) {
    const { id, hash, ...rest } = r;
    const recomputed = await sha256Hex(canonical(rest));
    if (recomputed !== hash || r.prevHash !== prev) return { ok: false, brokenAt: id, count: copy.length };
    prev = hash;
  }
  return { ok: true, count: copy.length };
}

// OTP/PIN digits are masked by the extractor; card and Aadhaar numbers are
// masked here (keep last 4). Masking happens before storage, never after.
export function redactText(text: string): { text: string; redacted: boolean } {
  const masked = maskCredentials(text);
  let out = masked.text;
  let redacted = masked.masked;
  // Step 21 (H1): the old branch kept the FIRST 4 digits of a card
  // ("1234 •••• •••• 5678") — the privacy claim is last-4-only, and the
  // masker above already reduces cards to last 4 before this runs. This
  // branch is defence-in-depth for anything the masker missed.
  out = out.replace(/\b(\d{4})[\s-]?\d{4}[\s-]?\d{4}[\s-]?(\d{4})\b/g, (_m, _a: string, b: string) => {
    redacted = true;
    return `•••• •••• •••• ${b}`;
  });
  out = out.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (m) => {
    redacted = true;
    return `•••• •••• ${m.slice(-4)}`;
  });
  return { text: out, redacted };
}
