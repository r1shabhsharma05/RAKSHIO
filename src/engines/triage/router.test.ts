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

// Step 19 (A5): title + steps follow the UI language; the default 'hg'
// is byte-identical to the old hardcoded strings.
describe('step 19: triage follows the UI language', () => {
  it('English title + steps in en', () => {
    const r = triageRoute({ amount: 20000, credentialShared: true, fraudType: 'otp-impersonation', lang: 'en' });
    expect(r.title).toBe('Money is gone — do these 3 steps now');
    expect(r.steps[0].text).toContain('Call 1930');
    expect(r.steps[0].text).not.toContain('call karein');
    const u = triageRoute({ amount: null, credentialShared: false, fraudType: null, lang: 'en' });
    expect(u.title).toBe('Not clear yet — take advice');
  });

  it('Hinglish is byte-identical to the old strings (default)', () => {
    const r = triageRoute({ amount: 20000, credentialShared: true, fraudType: 'otp-impersonation' });
    expect(r.title).toBe('Paisa gaya hai — turant ye 3 kadam');
    expect(r.steps[0].text).toBe('1930 par call karein — fund freeze ka chance sabse zyada pehle ghante me hota hai.');
    const a = triageRoute({ amount: null, credentialShared: false, fraudType: 'phishing-link' });
    expect(a.title).toBe('Paisa nahi gaya — koshish hui hai');
    const u = triageRoute({ amount: null, credentialShared: false, fraudType: null });
    expect(u.title).toBe('Abhi saaf nahi hai — salah lein');
  });
});
