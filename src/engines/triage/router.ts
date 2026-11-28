// Smart Triage Router: one question decides the path — was money lost?
// Lost money -> 1930 / bank / portal. Attempted fraud, no loss -> Chakshu
// (Sanchar Saathi, 30 days). Nothing known yet -> 1930 for advice.
// Step 19 (A5): title + steps follow the UI language (they were hardcoded
// Hinglish while the note below them was already keyed). Default 'hg'
// keeps the old strings verbatim.
import { t, type Lang } from '../../i18n';

export type TriagePath = 'lost-money' | 'attempted-fraud' | 'unknown';

export interface TriageResult {
  path: TriagePath;
  title: string;
  steps: { text: string; link?: { label: string; href: string } }[];
}

export function triageRoute(input: {
  amount: number | null;
  credentialShared: boolean;
  fraudType: string | null;
  lang?: Lang;
}): TriageResult {
  const lang = input.lang ?? 'hg';
  if (input.amount != null && input.amount > 0) {
    return {
      path: 'lost-money',
      title: t(lang, 'triageLostTitle'),
      steps: [
        { text: t(lang, 'triageLostStep1') },
        { text: t(lang, 'triageLostStep2') },
        {
          text: t(lang, 'triageLostStep3'),
          link: { label: 'cybercrime.gov.in', href: 'https://cybercrime.gov.in' },
        },
      ],
    };
  }
  if (input.credentialShared || input.fraudType) {
    return {
      path: 'attempted-fraud',
      title: t(lang, 'triageAttemptTitle'),
      steps: [
        {
          text: t(lang, 'triageAttemptStep1'),
          link: { label: 'sancharsaathi.gov.in — Chakshu', href: 'https://sancharsaathi.gov.in' },
        },
        { text: t(lang, 'triageAttemptStep2') },
        { text: t(lang, 'triageAttemptStep3') },
      ],
    };
  }
  return {
    path: 'unknown',
    title: t(lang, 'triageUnknownTitle'),
    steps: [
      { text: t(lang, 'triageUnknownStep1') },
      { text: t(lang, 'triageUnknownStep2') },
    ],
  };
}
