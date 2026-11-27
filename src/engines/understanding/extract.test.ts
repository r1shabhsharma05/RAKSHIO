import { describe, it, expect } from 'vitest';
import { extractIncident, maskCredentials } from './extract';

// Fixed "now" so relative dates are deterministic: Friday 27 Nov 2026, 14:00.
const NOW = new Date(2026, 10, 27, 14, 0, 0);

describe('extractIncident — required cases', () => {
  it('bees hazaar -> 20000', () => {
    const { incident } = extractIncident('mere account se bees hazaar kat gaye', NOW);
    expect(incident.amount.value).toBe(20000);
  });

  it('UTR 432109876543', () => {
    const { incident } = extractIncident('UTR 432109876543 hai', NOW);
    expect(incident.utr.value).toBe('432109876543');
  });

  it('kal subah das baje HDFC se UPI -> bank HDFC, method UPI, yesterday 10:00', () => {
    const { incident } = extractIncident('kal subah das baje HDFC se UPI se gaye', NOW);
    expect(incident.bank.value).toBe('HDFC');
    expect(incident.method.value).toBe('UPI');
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(10);
  });

  it('customer care ne OTP manga -> OTP impersonation + credentialShared', () => {
    const { incident } = extractIncident('customer care ne OTP manga', NOW);
    expect(incident.fraudType.value).toBe('otp-impersonation');
    expect(incident.credentialShared).toBe(true);
  });

  it('dedh lakh rupaye -> 150000', () => {
    const { incident } = extractIncident('dedh lakh rupaye kat gaye', NOW);
    expect(incident.amount.value).toBe(150000);
  });

  it('live bug: "kal shaam 7 baje bees hazaar" -> 20000, not 7', () => {
    const { incident } = extractIncident('Mere SBI account se kal shaam 7 baje bees hazaar rupaye kat gaye', NOW);
    expect(incident.amount.value).toBe(20000);
    expect(incident.bank.value).toBe('SBI');
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(19);
  });

  it('live bug: "7 baje" with money but no amount gives no amount', () => {
    const { incident } = extractIncident('Mere SBI account se kal shaam 7 baje paise kat gaye', NOW);
    expect(incident.amount.value).toBeNull();
  });
});

describe('extractIncident — no-guess rules', () => {
  it('never guesses a missing amount', () => {
    const { incident } = extractIncident('mujhe ek call aaya tha', NOW);
    expect(incident.amount.value).toBeNull();
  });

  it('a bare time is not money: "das baje" alone gives no amount', () => {
    const { incident } = extractIncident('das baje call aaya', NOW);
    expect(incident.amount.value).toBeNull();
  });

  it('spaced UTR groups join into 12 digits and are not read as money', () => {
    const { incident } = extractIncident('UTR 4321 0987 6543', NOW);
    expect(incident.utr.value).toBe('432109876543');
    expect(incident.amount.value).toBeNull();
  });

  it('Devanagari digits parse: "बीस हज़ार" -> 20000', () => {
    const { incident } = extractIncident('मेरे account से बीस हज़ार कट गए', NOW);
    expect(incident.amount.value).toBe(20000);
  });

  it('full demo sentence extracts every field', () => {
    const { incident } = extractIncident(
      'Mere account se bees hazaar kat gaye. Mujhe ek customer-care number se call aaya tha, OTP manga, phir paise nikal gaye. Kal subah das baje HDFC se UPI se gaye. UTR 432109876543.',
      NOW,
    );
    expect(incident.amount.value).toBe(20000);
    expect(incident.bank.value).toBe('HDFC');
    expect(incident.method.value).toBe('UPI');
    expect(incident.utr.value).toBe('432109876543');
    expect(incident.fraudType.value).toBe('otp-impersonation');
    expect(incident.credentialShared).toBe(true);
  });
});

describe('maskCredentials', () => {
  it('masks digits spoken next to OTP', () => {
    const { text, masked } = maskCredentials('mera OTP 482913 hai');
    expect(masked).toBe(true);
    expect(text).not.toContain('482913');
    expect(text).toContain('••••••');
  });

  it('leaves unrelated numbers alone', () => {
    const { text, masked } = maskCredentials('bees hazaar kat gaye');
    expect(masked).toBe(false);
    expect(text).toBe('bees hazaar kat gaye');
  });
});
