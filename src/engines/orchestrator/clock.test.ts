// Step 16 (bug 2): durations and action plans follow the selected language.
// English gets proper units, Hindi gets Devanagari, Hinglish keeps the old text.
import { describe, expect, it } from 'vitest';
import { formatDurationLang, orderActions } from './clock';

describe('step 16: language-aware clock and action queue', () => {
  it('formatDurationLang renders English, Hindi and Hinglish', () => {
    const ms = (2 * 60 + 3) * 60_000 + 45_000; // 2h 3m 45s
    expect(formatDurationLang('en', ms)).toBe('2 hours 3 min');
    expect(formatDurationLang('hi', ms)).toBe('2 घंटे 3 मिनट');
    expect(formatDurationLang('hg', ms)).toBe('2 ghante 3 min');
    expect(formatDurationLang('en', 90_000)).toBe('1 min 30 sec');
    expect(formatDurationLang('en', 26 * 3600_000)).toBe('1 day 2 hours');
    expect(formatDurationLang('en', 48 * 3600_000)).toBe('2 days');
  });

  it('orderActions titles follow the language', () => {
    const fraudAt = new Date('2026-11-26T10:16:00+05:30');
    const now = new Date('2026-11-26T10:30:00+05:30');
    const en = orderActions(fraudAt, now, false, 'en');
    expect(en[0].title).toBe('Stop further loss');
    expect(en.find((a) => a.id === 'call1930')?.title).toBe('Call 1930');
    const hg = orderActions(fraudAt, now, false, 'hg');
    expect(hg[0].title).toBe('Aage ka nuksaan rokein');
    const hi = orderActions(fraudAt, now, false, 'hi');
    expect(hi[0].title).toBe('आगे का नुकसान रोकें');
  });
});
