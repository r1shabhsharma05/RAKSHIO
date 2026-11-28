import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { extractIncident } from './understanding/extract';
import { bankDraft } from './banks/banks';
import type { StoredIncident } from '../state/store';

// Step 19: the full hunt list (A1–A15) in one pass — 20 new i18n keys,
// English time parsing, first-mentioned bank, OTP phrasings, bank-draft
// fallback through i18n.
const STEP19_KEYS = [
  'triageLostTitle', 'triageLostStep1', 'triageLostStep2', 'triageLostStep3',
  'triageAttemptTitle', 'triageAttemptStep1', 'triageAttemptStep2', 'triageAttemptStep3',
  'triageUnknownTitle', 'triageUnknownStep1', 'triageUnknownStep2',
  'guideHRecognize', 'guideHFirst5', 'guideHReport', 'guideHDont', 'guideHEvidence',
  'gapQOtp', 'gapHintOtp', 'gapOtpYes', 'gapOtpNo',
  'bankDraftMyBank',
];

describe('step 19 i18n', () => {
  it('every new key resolves in all three locales (no key fallback)', () => {
    for (const key of STEP19_KEYS) {
      for (const lang of ['en', 'hi', 'hg'] as const) {
        expect(t(lang, key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it('English values are English', () => {
    expect(t('en', 'triageLostTitle')).toBe('Money is gone — do these 3 steps now');
    expect(t('en', 'triageLostStep1')).toContain('Call 1930');
    expect(t('en', 'guideHRecognize')).toBe('How to recognise it');
    expect(t('en', 'guideHFirst5')).toBe('First 5 minutes');
    expect(t('en', 'gapQOtp')).toBe('Did you share your OTP or PIN with anyone?');
    expect(t('en', 'bankDraftMyBank')).toBe('my bank');
  });

  it('Hinglish values are byte-identical to the old strings (default locale)', () => {
    expect(t('hg', 'triageLostTitle')).toBe('Paisa gaya hai — turant ye 3 kadam');
    expect(t('hg', 'triageLostStep1')).toBe('1930 par call karein — fund freeze ka chance sabse zyada pehle ghante me hota hai.');
    expect(t('hg', 'triageAttemptTitle')).toBe('Paisa nahi gaya — koshish hui hai');
    expect(t('hg', 'triageUnknownTitle')).toBe('Abhi saaf nahi hai — salah lein');
    expect(t('hg', 'guideHRecognize')).toBe('Kaise pehchanein');
    expect(t('hg', 'guideHFirst5')).toBe('Pehle 5 minute');
    expect(t('hg', 'guideHReport')).toBe('Report kaise karein');
    expect(t('hg', 'guideHDont')).toBe('Ye mat karein');
    expect(t('hg', 'guideHEvidence')).toBe('Kya saboot rakhein');
    expect(t('hg', 'gapQOtp')).toBe('Kya aapne kisi ko apna OTP ya PIN bataya tha?');
    expect(t('hg', 'bankDraftMyBank')).toBe('apne bank');
  });
});

// Fixed "now" so relative dates are deterministic: Friday 27 Nov 2026, 14:00.
const NOW = new Date(2026, 10, 27, 14, 0, 0);

describe('step 19 — English time expressions (A3)', () => {
  it('"yesterday evening" parses to yesterday 19:00, amount intact', () => {
    const { incident } = extractIncident('Mere account se yesterday evening bees hazaar rupaye kat gaye', NOW);
    expect(incident.amount.value).toBe(20000);
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(19);
    expect(incident.fraudAtDisplay.value).toBe('kal, shaam');
  });

  it('"yesterday 7 pm" parses to yesterday 19:00', () => {
    const { incident } = extractIncident('Mere account se yesterday 7 pm bees hazaar rupaye kat gaye', NOW);
    expect(incident.amount.value).toBe(20000);
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(19);
    expect(incident.fraudAtDisplay.value).toBe('kal, 7 baje');
  });

  it('"today morning" parses to today 09:00', () => {
    const { incident } = extractIncident('today morning bees hazaar rupaye kat gaye', NOW);
    expect(incident.fraudAt.value?.getDate()).toBe(27);
    expect(incident.fraudAt.value?.getHours()).toBe(9);
  });

  it('"last night" parses to yesterday 22:00', () => {
    const { incident } = extractIncident('last night bees hazaar rupaye kat gaye', NOW);
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(22);
  });

  it('Hindi still parses: "kal shaam 7 baje" -> yesterday 19:00', () => {
    const { incident } = extractIncident('Mere SBI account se kal shaam 7 baje bees hazaar rupaye kat gaye', NOW);
    expect(incident.amount.value).toBe(20000);
    expect(incident.fraudAt.value?.getDate()).toBe(26);
    expect(incident.fraudAt.value?.getHours()).toBe(19);
  });

  it('an English time is never money: "yesterday 7 pm" with no amount gives none', () => {
    const { incident } = extractIncident('Mere account se yesterday 7 pm paise kat gaye', NOW);
    expect(incident.amount.value).toBeNull();
  });
});

describe('step 19 — first-mentioned bank, OTP phrasings (A7, A4)', () => {
  it('multi-bank sentence picks the first mentioned bank, not array order', () => {
    const { incident } = extractIncident('SBI se HDFC account me bees hazaar rupaye gaye', NOW);
    expect(incident.bank.value).toBe('SBI');
  });

  it('"Usne mera OTP le liya" counts as credential sharing', () => {
    const { incident } = extractIncident('Usne mera OTP le liya', NOW);
    expect(incident.credentialShared).toBe(true);
  });
});

describe('step 19 — bank draft fallback through i18n (A12)', () => {
  function noBankIncident(): StoredIncident {
    return {
      id: 'rk-test',
      createdAt: new Date().toISOString(),
      fraudAt: null,
      fraudAtDisplay: 'kal, 7 baje',
      amount: 20000,
      method: 'UPI',
      bank: null,
      utr: null,
      fraudType: 'unauthorised-debit',
      credentialShared: false,
      contactChannel: null,
      confirmed: { amount: true, fraudAt: true, method: true, bank: true },
      transcript: 'test',
      maskedCredentials: false,
      callTappedAt: null,
      coachDoneAt: null,
      caregiverMode: false,
    };
  }

  it('no bank: the draft names "my bank" in the UI language', () => {
    expect(bankDraft(noBankIncident(), 'en')).toContain('my bank');
    expect(bankDraft(noBankIncident(), 'hi')).toContain('अपने बैंक');
    expect(bankDraft(noBankIncident(), 'hg')).toContain('apne bank');
  });
});
