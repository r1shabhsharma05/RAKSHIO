import { describe, expect, it } from 'vitest';
import { analyzeShield } from './shield/shield';
import { bankBlockSteps, bankDraft, BANKS } from './banks/banks';
import { portalCopyDeck } from './ack/ack';
import { whenText } from '../i18n';
import type { StoredIncident } from '../state/store';

// Step 17: the Report flow, Shield rule text, Coach script, bank draft
// and Portal Copy Deck follow the UI language. The default 'hg' must
// return the exact old Hinglish strings (pinned copy); 'en' must contain
// no Hinglish. The 32 Situation Guides are out of scope — still Hinglish.

function demoIncident(): StoredIncident {
  const fraudAt = new Date();
  fraudAt.setDate(fraudAt.getDate() - 1);
  fraudAt.setHours(10, 0, 0, 0);
  return {
    id: 'rk-test',
    createdAt: new Date().toISOString(),
    fraudAt: fraudAt.toISOString(),
    fraudAtDisplay: 'kal, 7 baje',
    amount: 20000,
    method: 'UPI',
    bank: 'HDFC',
    utr: '432109876543',
    fraudType: 'unauthorised-debit',
    credentialShared: true,
    contactChannel: 'customer-care call',
    confirmed: { amount: true, fraudAt: true, method: true, bank: true },
    transcript: 'test',
    maskedCredentials: false,
    callTappedAt: null,
    caregiverMode: false,
  };
}

describe('Step 17 — full English', () => {
  it('whenText rebuilds the when-line from the Date in en/hi, keeps the display in hg', () => {
    const fraudAt = new Date();
    fraudAt.setDate(fraudAt.getDate() - 1);
    fraudAt.setHours(10, 0, 0, 0);
    expect(whenText(fraudAt.toISOString(), 'kal, 7 baje', 'en')).toBe('yesterday at 10 AM');
    expect(whenText(fraudAt.toISOString(), 'kal, 7 baje', 'hi')).toBe('कल सुबह 10 बजे');
    expect(whenText(fraudAt.toISOString(), 'kal, 7 baje', 'hg')).toBe('kal, 7 baje');
    expect(whenText(null, null, 'en')).toBeNull();
  });

  it('Shield truth/flags/advice switch language; hg is byte-identical', () => {
    const v = analyzeShield('Turant OTP batao, warna account band ho jayega', 'en');
    expect(v.level).toBe('danger');
    expect(v.truth).toContain('very dangerous');
    expect(v.flags[0].explain).toContain('OTP/PIN');
    expect(v.advice).toContain('delete the message');
    const hg = analyzeShield('Turant OTP batao, warna account band ho jayega');
    expect(hg.truth).toBe('Ye message bahut khatarnak lagta hai. Isme ek se zyada scam sign hain — is par bharosa mat karein.');
    expect(hg.otpNote).toBeUndefined();
    const safe = analyzeShield('Your OTP is 482913. Do not share it with anyone.', 'en');
    expect(safe.otpNote).toBe('An OTP is visible here — do not share it with anyone.');
  });

  it('bank draft is English in en, byte-identical in hg', () => {
    const stored = demoIncident();
    const en = bankDraft(stored, 'en');
    expect(en).toContain('Hello,');
    expect(en).toContain('yesterday at 10 AM');
    expect(en).toContain('Method: UPI.');
    expect(en).toContain('Please register a dispute');
    expect(en).not.toContain('Namaste');
    expect(en).not.toContain('Tareeka');
    const hg = bankDraft(stored);
    expect(hg).toBe(
      'Namaste,\n' +
        'Main HDFC ka khaata-dhaarak hoon.\n' +
        'Mere account se ₹20,000 kat gaye.\n' +
        'Ye kal, 7 baje hua.\n' +
        'Tareeka: UPI.\n' +
        'UTR / Reference: 432109876543.\n' +
        'Kripya dispute darj karein, mera card/UPI block karein, aur reference number dein.\n' +
        'Dhanyavaad.',
    );
  });

  it('bank fraud-line note switches language; hg is the old text', () => {
    const hdfc = BANKS.find((b) => b.name === 'HDFC')!;
    expect(bankBlockSteps(hdfc, 'en')).toContain('block your card from the app');
    expect(bankBlockSteps(hdfc, 'hg')).toBe('HDFC: app se card block karein, ya "Block CC" SMS karein.');
  });

  it('Portal Copy Deck labels switch language; hg keeps Rashi/Tareeka', () => {
    const stored = demoIncident();
    const en = portalCopyDeck(stored, null, 'en');
    const labels = en.map((r) => r.label);
    expect(labels).toContain('Amount');
    expect(labels).toContain('Method');
    expect(labels).toContain('OTP/PIN shared?');
    expect(labels).not.toContain('Rashi');
    expect(labels).not.toContain('Tareeka');
    expect(en.find((r) => r.label === 'Date / Time')?.value).toBe('yesterday at 10 AM');
    const hg = portalCopyDeck(stored, null);
    const hgLabels = hg.map((r) => r.label);
    expect(hgLabels).toContain('Rashi');
    expect(hgLabels).toContain('Tareeka');
    expect(hg.find((r) => r.label === 'UTR / Reference')?.value).toBe('432109876543');
  });
});
