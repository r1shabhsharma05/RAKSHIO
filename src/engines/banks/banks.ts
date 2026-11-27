import type { StoredIncident } from '../../state/store';

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
  blockSteps: string;
}

export const BANKS: BankInfo[] = [
  { name: 'SBI', numbers: ['1800 11 2211', '1800 425 3800'], blockSteps: 'SBI: fraud line 1800 11 1109. Ya YONO/SBI app se card block karein.' },
  { name: 'HDFC', numbers: ['1800 1600', '1800 2600'], blockSteps: 'HDFC: app se card block karein, ya "Block CC" SMS karein.' },
  { name: 'ICICI', numbers: ['1800 1080'], blockSteps: 'ICICI: iMobile app se card block karein, ya net banking se.' },
  { name: 'Axis', numbers: ['1860 419 5555', '1860 500 5555'], blockSteps: 'Axis: app se card block karein, ya net banking se.' },
  { name: 'Kotak', numbers: ['1860 266 2666'], blockSteps: 'Kotak: app se card block karein, ya net banking se.' },
  { name: 'PNB', numbers: ['1800 180 2222'], blockSteps: 'PNB: app se card block karein, ya net banking se.' },
  { name: 'Bank of Baroda', numbers: ['1800 102 4455', '1800 258 4455'], blockSteps: 'Bank of Baroda: app se card block karein, ya net banking se.' },
  { name: 'Canara', numbers: ['1800 425 0018'], blockSteps: 'Canara: app se card block karein, ya net banking se.' },
  { name: 'Union Bank', numbers: ['1800 22 2244'], blockSteps: 'Union Bank: app se card block karein, ya net banking se.' },
  { name: 'Yes Bank', numbers: ['1800 1200'], blockSteps: 'Yes Bank: app se card block karein, ya net banking se.' },
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
export function bankDraft(stored: StoredIncident, bankName?: string): string {
  const lines = [
    'Namaste,',
    `Main ${bankName ?? stored.bank ?? 'apne bank'} ka khaata-dhaarak hoon.`,
    stored.amount != null
      ? `Mere account se ₹${stored.amount.toLocaleString('en-IN')} kat gaye.`
      : 'Mere account se bina permission ke paise kat gaye.',
    stored.fraudAtDisplay ? `Ye ${stored.fraudAtDisplay} hua.` : '',
    stored.method ? `Tareeka: ${stored.method}.` : '',
    stored.utr ? `UTR / Reference: ${stored.utr}.` : '',
    'Kripya dispute darj karein, mera card/UPI block karein, aur reference number dein.',
    'Dhanyavaad.',
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
