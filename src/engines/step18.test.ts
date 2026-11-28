import { describe, expect, it, vi } from 'vitest';
import { t, whenText } from '../i18n';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../state/incidents';

// Step 18: the incident detail page + leftovers (E2E #5) — 40 new keys.
const STEP18_KEYS = [
  'incCardTitle', 'incCaregiverBadge', 'incAmount', 'incWhen', 'incHow', 'incBank',
  'incUtr', 'incFraudType', 'incUnknown', 'incNotFound', 'incOtpShared', 'incMaskedNote',
  'incGuideTitle', 'incGuideLink', 'incGuideFallback', 'incTimelineTitle', 'incTlFraud',
  'incTlTold', 'incTlCall', 'incTlCallDone', 'incTlPending', 'incTlPortal',
  'incTlWhenUnknown', 'incNextSteps', 'incToolsTitle', 'incToolVault', 'incToolShield',
  'incToolTriage', 'incToolBank', 'incToolCare', 'incToolProof', 'incToolAck',
  'incReset', 'reportStartNew', 'toastDismiss',
  'sosLine1', 'sosAmount', 'sosTime', 'sosLine2', 'sosSign',
];

describe('step 18 i18n', () => {
  it('every new key resolves in all three locales (no key fallback)', () => {
    for (const key of STEP18_KEYS) {
      for (const lang of ['en', 'hi', 'hg'] as const) {
        expect(t(lang, key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it('English values are English', () => {
    expect(t('en', 'incCardTitle')).toBe('Your incident card');
    expect(t('en', 'incTlPortal')).toBe('Within 24 hours after 1930 — cybercrime.gov.in');
    expect(t('en', 'sosAmount', { amount: '₹20,000' })).toBe('Amount: ₹20,000.');
    expect(t('en', 'reportStartNew')).toBe('Start a new report');
    expect(t('en', 'toastDismiss')).toBe('Dismiss notification');
  });

  it('Hinglish values are byte-identical to the old strings (default locale)', () => {
    expect(t('hg', 'incCardTitle')).toBe('Aapka incident card');
    expect(t('hg', 'reportStartNew')).toBe('Naya report shuru karein');
    expect(t('hg', 'toastDismiss')).toBe('Notification band karein');
    expect(t('hg', 'sosLine1')).toBe('Mujhe fraud hua hai — madad chahiye.');
    expect(t('hg', 'incOtpShared')).toBe(
      'Aapne OTP/PIN share kiya tha — turant card/UPI block karein, aur kisi ko OTP mat dijiye.',
    );
  });

  it('whenText rebuilds the when-line in English from the stored Date', () => {
    const now = new Date();
    const yesterday10 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0);
    expect(whenText(yesterday10, 'kal, 10 baje', 'en')).toBe('yesterday at 10 AM');
    expect(whenText(yesterday10, 'kal, 10 baje', 'hg')).toBe('kal, 10 baje');
  });
});

// Step 18: the Step 10 migration rewrote a stored 'en' to 'hg' on EVERY
// load — English could never survive a reload. Removed: a stored 'en'
// now stays English, as the picker says. (Vitest runs in node, so storage
// is stubbed in-memory here; the reload proof lives in tests/step18.spec.ts.)
describe('step 18 language persistence', () => {
  it('a stored English choice survives loadSettings', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    });
    saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    expect(loadSettings().language).toBe('en');
    saveSettings({ ...DEFAULT_SETTINGS, language: 'hg' });
    expect(loadSettings().language).toBe('hg');
    vi.unstubAllGlobals();
  });
});

describe('step 18 chunk fallback + crash screen keys', () => {
  const keys = ['chunkTitle', 'chunkBody', 'chunkReload', 'errTitle', 'errBody', 'errCall', 'errBack'];
  it('every key resolves in all three locales', () => {
    for (const key of keys) {
      for (const lang of ['en', 'hi', 'hg'] as const) {
        expect(t(lang, key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });
  it('English values are English, Hinglish values are the old strings', () => {
    expect(t('en', 'chunkTitle')).toBe('A new version is available');
    expect(t('en', 'errTitle')).toBe('Something went wrong');
    expect(t('hg', 'chunkTitle')).toBe('Naya version aaya hai');
    expect(t('hg', 'chunkReload')).toBe('Reload karein');
    expect(t('hg', 'errTitle')).toBe('Kuch gadbad ho gayi');
    expect(t('hg', 'errBack')).toBe('Pehle screen par wapas');
  });
});
