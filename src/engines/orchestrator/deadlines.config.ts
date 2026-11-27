// Deadlines are data, not code: each entry carries its source so a changed
// official rule is a one-line edit. Last checked 27 Nov 2026.
export interface Deadline {
  id: string;
  label: string;
  /** Step 16 (bug 2): i18n key for the label — the raw `label` stays as the
   *  Hinglish fallback so nothing breaks if a key is missing. */
  labelKey?: 'dl1930' | 'dlPortal' | 'dlBank';
  /** Official window length, shown next to every countdown so the
   *  different windows (48h / 24h / 3 working days) are never confusing. */
  windowLabel: string;
  hours: number;
  source: string;
  checked: string;
}

export const DEADLINES: Deadline[] = [
  {
    id: '1930',
    label: '1930 par report karein',
    labelKey: 'dl1930',
    windowLabel: '≤48 hours',
    hours: 48,
    source: 'https://cyberpolice.nic.in/Download/CFCFRMS_FAQ.pdf',
    checked: '2026-11-27',
  },
  {
    id: 'portal',
    label: 'cybercrime.gov.in par complaint poori karein',
    labelKey: 'dlPortal',
    windowLabel: '≤24 hours',
    hours: 24,
    source: 'https://cybercrime.gov.in/UploadMedia/instructions_citizenreportingcyberfrauds.pdf',
    checked: '2026-11-27',
  },
  {
    id: 'bank',
    label: 'Bank ko suchit karein (zero liability: 3 working days)',
    labelKey: 'dlBank',
    windowLabel: '≤3 working days',
    hours: 72,
    source: 'https://rbi.org.in/Scripts/NotificationUser.aspx?Id=11040',
    checked: '2026-11-27',
  },
];
