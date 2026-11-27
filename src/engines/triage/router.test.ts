import { describe, expect, it } from 'vitest';
import { triageRoute } from './router';

describe('Smart Triage Router', () => {
  it('lost money goes to 1930 / bank / portal', () => {
    const r = triageRoute({ amount: 20000, credentialShared: true, fraudType: 'otp-impersonation' });
    expect(r.path).toBe('lost-money');
    expect(r.steps.length).toBe(3);
  });

  it('attempted fraud with no loss goes to Chakshu', () => {
    const r = triageRoute({ amount: null, credentialShared: false, fraudType: 'phishing-link' });
    expect(r.path).toBe('attempted-fraud');
    expect(r.steps[0].link?.href).toContain('sancharsaathi.gov.in');
  });

  it('credential shared but no money lost still goes to Chakshu', () => {
    const r = triageRoute({ amount: null, credentialShared: true, fraudType: null });
    expect(r.path).toBe('attempted-fraud');
  });

  it('nothing known goes to 1930 for advice', () => {
    const r = triageRoute({ amount: null, credentialShared: false, fraudType: null });
    expect(r.path).toBe('unknown');
  });
});
