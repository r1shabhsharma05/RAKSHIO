import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { addEvidence, db, listEvidence, rootHash, tamperRecord, verifyChain } from './vault';

describe('Evidence Vault — hash chain', () => {
  it('chains hashes and verifies clean', async () => {
    await db.evidence.clear();
    const a = await addEvidence({
      incidentId: 'test-1', kind: 'sms', label: 'Fraud SMS',
      text: 'Aapka OTP 482913 hai', capturedAt: new Date().toISOString(), byCaregiver: false,
    });
    const b = await addEvidence({
      incidentId: 'test-1', kind: 'note', label: 'Note',
      text: 'Call aaya tha', capturedAt: new Date().toISOString(), byCaregiver: false,
    });
    expect(b.prevHash).toBe(a.hash);
    const v = await verifyChain('test-1');
    expect(v.ok).toBe(true);
    expect(v.count).toBe(2);
    expect(await rootHash('test-1')).toBe(b.hash);
    expect((await listEvidence('test-1')).length).toBe(2);
  });

  it('tampering turns the chain red and names the record', async () => {
    await db.evidence.clear();
    const a = await addEvidence({
      incidentId: 'test-2', kind: 'sms', label: 'SMS',
      text: 'Pehla', capturedAt: new Date().toISOString(), byCaregiver: false,
    });
    await addEvidence({
      incidentId: 'test-2', kind: 'note', label: 'Note',
      text: 'Dusra', capturedAt: new Date().toISOString(), byCaregiver: false,
    });
    await tamperRecord(a.id!, 'Badla hua text');
    const v = await verifyChain('test-2');
    expect(v.ok).toBe(false);
    expect(v.brokenAt).toBe(a.id);
  });

  it('masks OTP digits and card numbers before storage', async () => {
    await db.evidence.clear();
    const r = await addEvidence({
      incidentId: 'test-3', kind: 'sms', label: 'SMS',
      text: 'OTP 482913 bhejo, card 4111 1111 1111 1111',
      capturedAt: new Date().toISOString(), byCaregiver: false,
    });
    expect(r.redacted).toBe(true);
    expect(r.text).not.toContain('482913');
    expect(r.text).not.toContain('4111 1111 1111 1111');
  });
});
