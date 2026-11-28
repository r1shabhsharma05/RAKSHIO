import { describe, it, expect } from 'vitest';
import { extractIncident } from './understanding/extract';
import { guideForFraudType } from './guide/guide';
import { addWorkingDays } from './orchestrator/clock';
import { t } from '../i18n';

// Step 21: fraud-type parsers (#11), working-days helper (#1/#5),
// and the 45 new i18n keys in all three locales.
const NOW = new Date(2026, 10, 27, 14, 0, 0);

const STEP21_KEYS = [
  'coachClockTitle', 'coachGoldenLeft', 'coachGoldenOver', 'coachBankDue', 'coachBankNote',
  'chakshuTitle', 'chakshuIntro', 'chakshuNote', 'chakshuLineChannel', 'chakshuLineWhat',
  'chakshuLineAmount', 'chakshuLineWhen', 'chakshuLineUtr', 'chakshuLineCategory',
  'chakshuCatMoney', 'chakshuCatAttempt',
  'rem30dLabel', 'rem30dDetail', 'rem90dLabel', 'rem90dDetail',
  'vaultKeepTitle', 'vaultKeep1', 'vaultKeep2', 'vaultKeep3', 'vaultKeep4',
  'navDoNotPay', 'dnpTitle', 'dnpRule1', 'dnpRule2', 'dnpRule3', 'dnpNote',
  'dnpChakshuLink', 'dnpNumberLabel', 'dnpNumberPlaceholder', 'dnpCopyBtn',
  'judgeTourTitle', 'judgeTourCap1', 'judgeTourCap2', 'judgeTourCap3', 'judgeTourCap4',
  'judgeDemoBanner', 'judgeClearLink',
  'settingsLargeType', 'settingsLargeTypeHint', 'settingsLargeTypeSwitch',
  'qaDnp', 'qaDnpSub',
  'ftCourier', 'ftTask', 'ftCrypto', 'ftLoanApp',
];

describe('step 21 i18n', () => {
  it('every new key resolves in all three locales (no key fallback)', () => {
    for (const key of STEP21_KEYS) {
      for (const lang of ['en', 'hi', 'hg'] as const) {
        expect(t(lang, key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it('English values are English', () => {
    expect(t('en', 'dnpTitle')).toBe('Do not pay anyone to get your money back');
    expect(t('en', 'rem30dLabel')).toBe('30 days later');
    expect(t('en', 'ftCourier')).toBe('Courier / parcel scam');
  });
});

describe('step 21 fraud-type parsers', () => {
  const cases: [string, string, string][] = [
    ['Mere parcel me drugs hai bolkar customs fee mangi, 50000 rupaye kat gaye', 'courier-scam', 'courier-scam'],
    ['Telegram par like task karke premium deposit manga, 20000 rupaye gaye', 'task-scam', 'task-scam'],
    ['Crypto trading app me profit dikhakar withdrawal fee mangi', 'crypto-scam', 'crypto-scam'],
    ['Instant loan app ne processing fee ke naam par paise liye', 'loan-app-scam', 'loan-app-scam'],
    ['Police ne video call par digital arrest karke paise mange', 'digital-arrest', 'digital-arrest'],
  ];
  for (const [text, type, guideId] of cases) {
    it(`${JSON.stringify(text.slice(0, 40))} -> ${type}`, () => {
      const got = extractIncident(text, NOW).incident.fraudType.value;
      expect(got).toBe(type);
      // Every new type maps to its own Situation Guide — never a null link.
      expect(guideForFraudType(got)?.id).toBe(guideId);
    });
  }

  it('the old types still map (no regression)', () => {
    expect(guideForFraudType('investment-scam')?.id).toBe('investment-scam');
    expect(guideForFraudType('otp-impersonation')?.id).toBe('otp-scam');
    expect(guideForFraudType('unauthorised-debit')?.id).toBe('upi-fraud');
  });
});

describe('step 21 addWorkingDays', () => {
  it('skips Sundays: Friday + 3 working days is Tuesday', () => {
    // 2026-11-27 is a Friday.
    const from = new Date(2026, 10, 27, 10, 0, 0);
    expect(from.getDay()).toBe(5);
    const due = addWorkingDays(from, 3);
    expect(due.getDay()).toBe(2); // Tuesday
    expect(due.getDate()).toBe(1); // 1 Dec 2026
  });

  it('does not mutate the input date', () => {
    const from = new Date(2026, 10, 27, 10, 0, 0);
    addWorkingDays(from, 3);
    expect(from.getDate()).toBe(27);
  });
});
