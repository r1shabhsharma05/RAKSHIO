// Deadlines are data, not code: each entry carries its source so a changed
// official rule is a one-line edit. Last checked 28 Nov 2026.
// Step 21 (H2/P2/P3): the old 48-hour 1930 window was unverified — no
// official source states it, and the CFCFRMS FAQ link that claimed to back
// it no longer resolves. Every source found says "immediately" / "first
// hour" / "within four hours" (Moneylife, quoting a retired ACP). The app
// therefore frames 1930 as "right away, best in the first 4 hours" and
// uses a 4-hour window — an honest urgency window, not a legal claim.
// - Portal: 24 hours runs from the 1930 call (when the ack is issued), NOT
//   from the fraud. The engine anchors it to calledAt once an ack is saved.
// - Bank: RBI's 2017 circular — zero liability if the bank is told within
//   3 WORKING DAYS of the bank's communication to the customer (not 72h
//   from the fraud). The app counts from the fraud as the earliest date the
//   communication could exist and says the bank's own notice governs.
//   From 1 Jan 2027 the rule changes to five calendar days from the
//   transaction itself — bankDueDate switches over on that date.
export interface Deadline {
  id: string;
  label: string;
  /** Step 16 (bug 2): i18n key for the label — the raw `label` stays as the
   *  Hinglish fallback so nothing breaks if a key is missing. */
  labelKey?: 'dl1930' | 'dlPortal' | 'dlBank';
  /** Official window length, shown next to every countdown so the
   *  different windows (4h / 24h / 3 working days) are never confusing. */
  windowLabel: string;
  /** Fixed-hour window from the anchor (1930, portal). */
  hours?: number;
  /** Working-day window from the anchor (bank, until 31 Dec 2026). */
  workingDays?: number;
  /** Last date after which the 2027 rule applies instead. */
  reviewBy?: string;
  source: string;
  checked: string;
}

export const DEADLINES: Deadline[] = [
  {
    id: '1930',
    label: '1930 par report karein',
    labelKey: 'dl1930',
    windowLabel: '≤4 hours',
    hours: 4,
    source: 'https://www.moneylife.in/article/fraud-alert-use-golden-hour-to-report-scam-and-increase-your-chances-to-get-money-back/74091.html',
    checked: '2026-11-28',
  },
  {
    id: 'portal',
    label: 'cybercrime.gov.in par complaint poori karein',
    labelKey: 'dlPortal',
    windowLabel: '≤24 hours',
    hours: 24,
    source: 'https://www.moneylife.in/article/fraud-alert-use-golden-hour-to-report-scam-and-increase-your-chances-to-get-money-back/74091.html',
    checked: '2026-11-28',
  },
  {
    id: 'bank',
    label: 'Bank ko suchit karein (zero liability: 3 working days)',
    labelKey: 'dlBank',
    windowLabel: '≤3 working days',
    workingDays: 3,
    reviewBy: '2026-12-31',
    source: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11036&Mode=0',
    checked: '2026-11-28',
  },
];
