import type { StoredIncident } from '../../state/store';
import { formatINR } from '../../screens/shared';
import { fraudTypeLabel, t, whenText, type Lang } from '../../i18n';

// Step 21 (#2): the third text in the "one story, three official texts"
// pack. Chakshu (Sanchar Saathi) is the channel for the ATTEMPT itself —
// suspect number / message / category — even when no money went, so the
// draft is built from the same incident, never retyped. Pure function:
// no sending, no network, no storage. The screen labels it
// "review before sending" — RAKSHIO files nothing.
export function chakshuDraft(stored: StoredIncident, lang: Lang = 'hg'): string {
  const unknown = t(lang, 'unknown');
  const when = stored.fraudAt || stored.fraudAtDisplay
    ? whenText(stored.fraudAt, stored.fraudAtDisplay, lang)
    : null;
  const lines = [
    t(lang, 'chakshuLineChannel', { v: stored.contactChannel ?? unknown }),
    t(lang, 'chakshuLineWhat', {
      v: stored.fraudType ? fraudTypeLabel(stored.fraudType, lang) : unknown,
    }),
    t(lang, 'chakshuLineAmount', {
      v: stored.amount != null ? formatINR(stored.amount) : unknown,
    }),
    t(lang, 'chakshuLineWhen', { v: when ?? unknown }),
  ];
  if (stored.utr) lines.push(t(lang, 'chakshuLineUtr', { v: stored.utr }));
  lines.push(
    t(lang, 'chakshuLineCategory', {
      v: t(lang, stored.amount != null ? 'chakshuCatMoney' : 'chakshuCatAttempt'),
    }),
  );
  return lines.join('\n');
}
