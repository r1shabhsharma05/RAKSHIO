// Deadlines are data, not code: each entry carries its source so a changed
// official rule is a one-line edit. Last checked 27 Nov 2026.
export interface Deadline {
  id: string;
  label: string;
  hours: number;
  source: string;
  checked: string;
}

export const DEADLINES: Deadline[] = [
  {
    id: '1930',
    label: '1930 par report karein',
    hours: 48,
    source: 'https://cyberpolice.nic.in/Download/CFCFRMS_FAQ.pdf',
    checked: '2026-11-27',
  },
  {
    id: 'portal',
    label: 'cybercrime.gov.in par complaint poori karein',
    hours: 24,
    source: 'https://cybercrime.gov.in/UploadMedia/instructions_citizenreportingcyberfrauds.pdf',
    checked: '2026-11-27',
  },
  {
    id: 'bank',
    label: 'Bank ko suchit karein (zero liability: 3 working days)',
    hours: 72,
    source: 'https://rbi.org.in/Scripts/NotificationUser.aspx?Id=11040',
    checked: '2026-11-27',
  },
];
