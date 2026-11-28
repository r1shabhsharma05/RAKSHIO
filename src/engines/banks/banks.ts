import type { StoredIncident } from '../../state/store';
import { methodLabel, t, whenText, type Lang } from '../../i18n';

// Bank Alert Kit: helpline numbers verified 2026-11-27 against Google Pay's
// bank directory and 2026 helpline listings (multiple sources agree).
// HDFC re-verified 2026-11-28 (Step 16, E2E #3 bug 10): 1800 1600 /
// 1800 2600 are HDFC Bank's ONLY published customer-care numbers —
// https://www.hdfc.bank.in/contact-us/customer-care ("Phone numbers
// mentioned here are the only Customer Care numbers of HDFC Bank").
// The E2E suspicion that they were wrong was incorrect; numbers unchanged.
// Banks not listed here get no number — the UI tells the user to take it
// from the bank's own website or card, never from a search result.
// Last checked: 2026-11-28. Numbers change; verify before calling.
export interface BankInfo {
  name: string;
  numbers: string[];
  // Step 17: the fraud-line note follows the UI language. `hg` is the
  // old Hinglish text verbatim; `en` is its translation. Hindi shows the
  // Hinglish text, as it did before keying (no Devanagari version exists).
  blockSteps: { en: string; hg: string };
}

// The fraud-line note in the UI language ('hi' keeps the Hinglish text).
export function bankBlockSteps(bank: BankInfo, lang: Lang): string {
  return lang === 'en' ? bank.blockSteps.en : bank.blockSteps.hg;
}

export const BANKS: BankInfo[] = [
  { name: 'SBI', numbers: ['1800 11 2211', '1800 425 3800'], blockSteps: { en: 'SBI: fraud line 1800 11 1109. Or block your card from the YONO/SBI app.', hg: 'SBI: fraud line 1800 11 1109. Ya YONO/SBI app se card block karein.' } },
  { name: 'HDFC', numbers: ['1800 1600', '1800 2600'], blockSteps: { en: 'HDFC: block your card from the app, or SMS "Block CC".', hg: 'HDFC: app se card block karein, ya "Block CC" SMS karein.' } },
  { name: 'ICICI', numbers: ['1800 1080'], blockSteps: { en: 'ICICI: block your card from the iMobile app, or net banking.', hg: 'ICICI: iMobile app se card block karein, ya net banking se.' } },
  { name: 'Axis', numbers: ['1860 419 5555', '1860 500 5555'], blockSteps: { en: 'Axis: block your card from the app, or net banking.', hg: 'Axis: app se card block karein, ya net banking se.' } },
  { name: 'Kotak', numbers: ['1860 266 2666'], blockSteps: { en: 'Kotak: block your card from the app, or net banking.', hg: 'Kotak: app se card block karein, ya net banking se.' } },
  { name: 'PNB', numbers: ['1800 180 2222'], blockSteps: { en: 'PNB: block your card from the app, or net banking.', hg: 'PNB: app se card block karein, ya net banking se.' } },
  { name: 'Bank of Baroda', numbers: ['1800 102 4455', '1800 258 4455'], blockSteps: { en: 'Bank of Baroda: block your card from the app, or net banking.', hg: 'Bank of Baroda: app se card block karein, ya net banking se.' } },
  { name: 'Canara', numbers: ['1800 425 0018'], blockSteps: { en: 'Canara: block your card from the app, or net banking.', hg: 'Canara: app se card block karein, ya net banking se.' } },
  { name: 'Union Bank', numbers: ['1800 22 2244'], blockSteps: { en: 'Union Bank: block your card from the app, or net banking.', hg: 'Union Bank: app se card block karein, ya net banking se.' } },
  { name: 'Yes Bank', numbers: ['1800 1200'], blockSteps: { en: 'Yes Bank: block your card from the app, or net banking.', hg: 'Yes Bank: app se card block karein, ya net banking se.' } },
];

export function findBank(name: string | null): BankInfo | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return BANKS.find((b) => b.name.toLowerCase() === lower) ?? null;
}

// Pre-filled draft — the user reviews and edits it before sending anywhere.
// RAKSHIO never sends it; there is no send button.
// bankName overrides the incident's bank: when the user switches the bank
// in the picker, the draft must follow the selection (live bug: draft kept
// saying HDFC after switching to SBI).
// Step 17: the draft follows the UI language. The default 'hg' returns
// the exact old Hinglish text. The when-line is rebuilt from the stored
// Date (whenText) so no Hinglish display string leaks into English.
export function bankDraft(stored: StoredIncident, lang: Lang = 'hg', bankName?: string): string {
  const when = stored.fraudAt || stored.fraudAtDisplay ? whenText(stored.fraudAt, stored.fraudAtDisplay, lang) : null;
  const lines = [
    t(lang, 'bankDraftGreet'),
    t(lang, 'bankDraftAccount', { bank: bankName ?? stored.bank ?? t(lang, 'bankDraftMyBank') }),
    stored.amount != null
      ? t(lang, 'bankDraftAmount', { v: stored.amount.toLocaleString('en-IN') })
      : t(lang, 'bankDraftAmountUnknown'),
    when ? t(lang, 'coachScriptWhen', { v: when }) : '',
    stored.method ? t(lang, 'bankDraftMethod', { v: methodLabel(stored.method, lang) }) : '',
    stored.utr ? `UTR / Reference: ${stored.utr}.` : '',
    t(lang, 'bankDraftClose'),
    t(lang, 'bankDraftThanks'),
  ];
  return lines.filter(Boolean).join('\n');
}

const REF_KEY = 'rakshio.bankref.v1';

export function saveBankRef(incidentId: string, ref: string): void {
  try { localStorage.setItem(`${REF_KEY}.${incidentId}`, ref); } catch { /* ignore */ }
}

export function loadBankRef(incidentId: string): string {
  try { return localStorage.getItem(`${REF_KEY}.${incidentId}`) ?? ''; } catch { return ''; }
}
