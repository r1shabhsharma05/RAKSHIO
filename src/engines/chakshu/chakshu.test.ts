import { describe, it, expect } from 'vitest';
import { chakshuDraft } from './chakshu';
import type { StoredIncident } from '../../state/store';

function stored(over: Partial<StoredIncident> = {}): StoredIncident {
  return {
    id: 'rk-test123',
    createdAt: '2026-11-27T10:00:00.000Z',
    fraudAt: '2026-11-27T10:00:00.000Z',
    fraudAtDisplay: 'kal, 10 baje',
    amount: 20000,
    method: 'UPI',
    bank: 'SBI',
    utr: '432109876543',
    fraudType: 'courier-scam',
    credentialShared: false,
    contactChannel: 'WhatsApp',
    confirmed: { amount: true, fraudAt: true, method: true, bank: true },
    transcript: 'test',
    maskedCredentials: false,
    callTappedAt: null,
    coachDoneAt: null,
    caregiverMode: false,
    ...over,
  };
}

describe('step 21 chakshu draft', () => {
  it('builds the Chakshu text from the incident, in English', () => {
    const draft = chakshuDraft(stored(), 'en');
    expect(draft).toContain('Where it came from: WhatsApp');
    expect(draft).toContain('Courier / parcel scam');
    expect(draft).toContain('₹20,000');
    expect(draft).toContain('Transaction / UTR: 432109876543');
    expect(draft).toContain('Category: Financial fraud (money lost)');
  });

  it('no money lost -> attempt category, no UTR line without a UTR', () => {
    const draft = chakshuDraft(stored({ amount: null, utr: null, fraudType: 'phishing-link' }), 'en');
    expect(draft).toContain('Money lost: Unknown');
    expect(draft).toContain('Category: Suspected fraud communication (no money lost)');
    expect(draft).not.toContain('UTR');
  });

  it('Hinglish default keeps the old voice', () => {
    const draft = chakshuDraft(stored(), 'hg');
    expect(draft).toContain('Kahan se aaya: WhatsApp');
    expect(draft).toContain('Category: Financial fraud (paisa gaya)');
  });
});
