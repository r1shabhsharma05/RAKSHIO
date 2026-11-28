import { describe, it, expect } from 'vitest';
import { maskCredentials, extractIncident } from './understanding/extract';
import { redactText } from './evidence/vault';
import { addWorkingDays, bankDueDate, deadlineStatuses, orderActions } from './orchestrator/clock';
import { ackFormatWarning } from './ack/ack';
import { pickVoice } from '../voice/VoiceAdapter';
import { confirmedMark } from './proof/proofpack';
import { t, type Lang } from '../i18n';

// Step 21 gap-fix pins (gap-analysis-2026-11-28): H1, H2/P2/P3, H4, H7,
// T5, H8. i18n parity for the 14 new gap keys is pinned here too — the
// Step 21 file pins the feature keys, this file pins the gap keys.

const NOW = new Date(2026, 10, 27, 14, 0, 0); // Friday 27 Nov 2026, 14:00
const LANGS: Lang[] = ['en', 'hi', 'hg'];
const GAP_KEYS = [
  'chipPortalPending', 'clockUnknownTitle', 'clockUnknownBody', 'portalAckWarn',
  'vaultFileTooBig', 'vaultSaveFail', 'bankChargeNote', 'proofCheckNote',
  'careAloneTitle', 'careAloneBody', 'listenUnsupported', 'voiceInputUnsupported',
  'tileShieldDisagree', 'storageErrorBanner',
] as const;

describe('gap i18n parity', () => {
  it('every gap key exists in all 3 locales with a non-empty value', () => {
    for (const key of GAP_KEYS) {
      for (const lang of LANGS) {
        const v = t(lang, key);
        expect(v, `${key} in ${lang}`).not.toBe(key);
        expect(v.trim().length, `${key} in ${lang}`).toBeGreaterThan(0);
      }
    }
  });
  it('no 48-hour claim survives in any locale', () => {
    for (const lang of LANGS) {
      for (const key of ['guideCallSub', 'overdueExplainer', 'emptyActionsTip3', 'clockOverBodyBoth', 'clockOverBodyPortal', 'clockOverBodyOpen', 'clockOverBodyHelpline'] as const) {
        expect(t(lang, key)).not.toMatch(/48/);
      }
    }
  });
  it('the safe Shield verdict no longer claims "looks fine"', () => {
    expect(t('en', 'shieldSafe')).toBe('No red flags found');
    expect(t('hg', 'shieldSafe')).toBe('Koi red flag nahi mila');
    expect(t('en', 'shieldTitleSafe')).toBe('No red flags found');
  });
});

describe('H1 masking', () => {
  it('16-digit card keeps only the last 4', () => {
    const { text, masked } = maskCredentials('mera card 4111 1111 1111 1234 hai');
    expect(masked).toBe(true);
    expect(text).toContain('1234');
    expect(text).not.toContain('4111');
  });
  it('12-digit Aadhaar keeps only the last 4', () => {
    const { text, masked } = maskCredentials('aadhaar 2345 6789 0123 hai');
    expect(masked).toBe(true);
    expect(text).toContain('0123');
    expect(text).not.toContain('2345');
    expect(text).not.toContain('6789');
  });
  it('bare 6-digit OTP is masked with no keyword', () => {
    const { text, masked } = maskCredentials('usne 482913 bola');
    expect(masked).toBe(true);
    expect(text).not.toContain('482913');
  });
  it('a 6-digit amount next to a money word is NOT masked', () => {
    const { text, masked } = maskCredentials('250000 rupaye kat gaye');
    expect(masked).toBe(false);
    expect(text).toContain('250000');
  });
  it('UTR next to the word UTR still extracts', () => {
    const { incident, maskedTranscript } = extractIncident('UTR 432109876543 hai', NOW);
    expect(incident.utr.value).toBe('432109876543');
    expect(maskedTranscript).toContain('432109876543');
  });
  it('a 12-digit number with no UTR word does NOT become a UTR', () => {
    const { incident } = extractIncident('mera aadhaar 234567890123 hai', NOW);
    expect(incident.utr.value).toBeNull();
  });
  it('redactText keeps only the last 4 of a card (PRIVACY.md claim)', () => {
    const { text, redacted } = redactText('card 4111111111111234');
    expect(redacted).toBe(true);
    expect(text).toContain('1234');
    expect(text).not.toContain('4111');
  });
});

describe('deadlines: 1930 4h, portal from the call, bank working days', () => {
  it('1930 window is 4 hours, not 48', () => {
    const s = deadlineStatuses(new Date(2026, 10, 27, 10, 0, 0), new Date(2026, 10, 27, 11, 0, 0));
    const h = s.find((x) => x.id === '1930')!;
    expect(h.remainingMs).toBe(3 * 3600_000);
    expect(h.state).toBe('safe');
    // 3h in, 1h left = the last quarter -> 'soon', and past 4h -> overdue.
    const soon = deadlineStatuses(new Date(2026, 10, 27, 10, 0, 0), new Date(2026, 10, 27, 13, 30, 0));
    expect(soon.find((x) => x.id === '1930')!.state).toBe('soon');
    const over = deadlineStatuses(new Date(2026, 10, 27, 10, 0, 0), new Date(2026, 10, 27, 14, 30, 0));
    expect(over.find((x) => x.id === '1930')!.state).toBe('overdue');
  });
  it('portal is pending with no 1930 call, anchored once called', () => {
    const fraudAt = new Date(2026, 10, 27, 10, 0, 0);
    const now = new Date(2026, 10, 27, 12, 0, 0);
    const before = deadlineStatuses(fraudAt, now);
    expect(before.find((x) => x.id === 'portal')!.state).toBe('pending');
    const calledAt = new Date(2026, 10, 27, 11, 0, 0);
    const after = deadlineStatuses(fraudAt, now, calledAt);
    const p = after.find((x) => x.id === 'portal')!;
    expect(p.state).toBe('safe');
    expect(p.remainingMs).toBe(23 * 3600_000);
    // 25h after the CALL the portal is overdue even though the fraud was 26h ago.
    const late = deadlineStatuses(fraudAt, new Date(2026, 10, 28, 12, 0, 0), calledAt);
    expect(late.find((x) => x.id === 'portal')!.state).toBe('overdue');
  });
  it('orderActions does not rush the portal while it is pending', () => {
    const fraudAt = new Date(2026, 10, 27, 10, 0, 0);
    const items = orderActions(fraudAt, new Date(2026, 10, 27, 12, 0, 0), false, 'hg');
    expect(items.find((i) => i.id === 'portal')!.urgent).toBe(false);
    expect(items[1].id).not.toBe('portal');
  });
  it('bankDueDate: Friday + 3 working days skips Sunday', () => {
    // Friday 27 Nov 2026 + 3 working days = Tuesday 1 Dec 2026.
    expect(bankDueDate(new Date(2026, 10, 27, 10, 0, 0)).getDate()).toBe(1);
    expect(addWorkingDays(new Date(2026, 10, 27, 10, 0, 0), 3).getDate()).toBe(1);
  });
  it('bankDueDate: from 1 Jan 2027 it is five calendar days', () => {
    const due = bankDueDate(new Date(2027, 0, 2, 10, 0, 0)); // Saturday
    expect(due.getDate()).toBe(7); // +5 days, Sunday included
  });
});

describe('H4 ack format warning', () => {
  it('accepts real 1930 and portal acks', () => {
    expect(ackFormatWarning('32912345678901')).toBe(false);
    expect(ackFormatWarning('22912345678901')).toBe(false);
    expect(ackFormatWarning('329 1234 5678 901')).toBe(false);
  });
  it('warns on anything else', () => {
    expect(ackFormatWarning('12345')).toBe(true);
    expect(ackFormatWarning('12345678901234')).toBe(true);
    expect(ackFormatWarning('329123')).toBe(true);
    expect(ackFormatWarning('')).toBe(true);
  });
});

describe('T5 pickVoice', () => {
  const voices = [
    { lang: 'en-US', default: true },
    { lang: 'en-IN' },
    { lang: 'hi-IN' },
  ] as const;
  it('exact match wins', () => {
    expect(pickVoice(voices, 'hi-IN')?.lang).toBe('hi-IN');
    expect(pickVoice(voices, 'en-IN')?.lang).toBe('en-IN');
  });
  it('same family is the fallback, then the default', () => {
    expect(pickVoice(voices, 'hi-Latn')?.lang).toBe('hi-IN');
    expect(pickVoice(voices, 'mr-IN')?.lang).toBe('en-US');
  });
  it('empty list gives null', () => {
    expect(pickVoice([], 'hi-IN')).toBeNull();
  });
});

describe('H8 confirmedMark', () => {
  it('confirmed vs as-reported', () => {
    expect(confirmedMark(true)).toBe('(aapne confirm kiya)');
    expect(confirmedMark(false)).toBe('(aapke bataye anusaar)');
    expect(confirmedMark(undefined)).toBe('(aapke bataye anusaar)');
  });
});
