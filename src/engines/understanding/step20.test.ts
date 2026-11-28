import { describe, it, expect } from 'vitest';
import { extractIncident } from './extract';

// Step 20 (B1+B5): the Hunt 2 matrix — every failing probe from the hunt
// doc must pass, and the 52 OK cases must stay OK (representative pins
// below). Fixed "now" matches the existing extract tests.
const NOW = new Date(2026, 10, 27, 14, 0, 0);

function amount(text: string): number | null {
  return extractIncident(text, NOW).incident.amount.value;
}

describe('step 20 B1: English number words in free text', () => {
  const cases: [string, number][] = [
    // Hunt 2 FAILs (were null or wrong).
    ['Yesterday evening, twenty thousand rupees were debited from my SBI account via UPI', 20000],
    ['twenty thousand rupees debited from my SBI account', 20000],
    ['twenty thousand five hundred rupees debited', 20500],
    ['two thousand rupees debited', 2000],
    ['fifty thousand rupees debited', 50000],
    ['ten thousand rupees debited', 10000],
    ['one thousand five hundred rupees debited', 1500],
    ['five hundred rupees debited', 500],
    ['one lakh twenty thousand rupees debited', 120000],
    ['twenty thousand rupees debited yesterday evening', 20000],
    ['1.5 lakh rupees debited', 150000],
    ['2.5 lakh rupees debited', 250000],
    ['20k rupees debited', 20000],
    ['20K rupees debited from my account', 20000],
    ['Rs. twenty thousand debited', 20000],
    ['twenty thousand and five hundred rupees debited', 20500],
    ['2 lakh 50 thousand rupees debited', 250000],
    ['half a lakh rupees debited', 50000],
    ['one and a half lakh rupees debited', 150000],
    // Hunt 2 OKs (must stay OK).
    ['one lakh rupees gone from my account', 100000],
    ['Rs 20,000 debited from my account', 20000],
    ['20000 rupees debited from my account', 20000],
    ['bees hazaar rupaye kat gaye', 20000],
    ['Mere SBI account se bees hazaar rupaye kat gaye', 20000],
    ['बीस हज़ार रुपये कट गए', 20000],
    ['dedh lakh rupaye kat gaye', 150000],
    ['do lakh pachaas hazaar rupaye kat gaye', 250000],
    ['20,000/- debited', 20000],
    ['Rs 20,000/- debited from my SBI account', 20000],
  ];
  for (const [text, want] of cases) {
    it(`${JSON.stringify(text)} -> ${want}`, () => {
      expect(amount(text)).toBe(want);
    });
  }
});

describe('step 20 B1: English number words as gap answers', () => {
  // mergeField appends " rupaye" to amount gap answers — same extractor.
  const cases: [string, number][] = [
    ['twenty thousand rupaye', 20000],
    ['twenty thousand five hundred rupaye', 20500],
    ['two thousand rupaye', 2000],
    ['fifty thousand rupaye', 50000],
    ['ten thousand rupaye', 10000],
    ['one lakh rupaye', 100000],
    ['bees hazaar rupaye', 20000],
    ['20000 rupaye', 20000],
    ['half a lakh rupaye', 50000],
    ['20k rupaye', 20000],
  ];
  for (const [text, want] of cases) {
    it(`${JSON.stringify(text)} -> ${want}`, () => {
      expect(amount(text)).toBe(want);
    });
  }
});

describe('step 20 B1: no-guess rules still hold', () => {
  it('a bare time is still not money', () => {
    expect(amount('das baje call aaya')).toBeNull();
  });
  it('"7 baje" with money but no amount still gives no amount', () => {
    expect(amount('Mere SBI account se kal shaam 7 baje paise kat gaye')).toBeNull();
  });
  it('a bare "half" with no scale is not money', () => {
    expect(amount('half my money is gone, rupees debited')).toBeNull();
  });
});

describe('step 20 B5: OTP denial is not OTP sharing', () => {
  const cases: [string, boolean][] = [
    // Hunt 2 FAILs (were true).
    ['I did not share any OTP', false],
    ['OTP nahi diya', false],
    ['maine OTP nahi bataya', false],
    // Positive controls (must stay true).
    ['Maine apna OTP share kar diya', true],
    ['Usne mera OTP le liya', true],
    ['I shared my OTP with him', true],
    ['customer care ne OTP manga', true],
    ['OTP manga aur maine de diya', true],
    // Already-false control.
    ['he asked for my PIN and I told him', false],
  ];
  for (const [text, want] of cases) {
    it(`${JSON.stringify(text)} -> ${want}`, () => {
      expect(extractIncident(text, NOW).incident.credentialShared).toBe(want);
    });
  }
});
