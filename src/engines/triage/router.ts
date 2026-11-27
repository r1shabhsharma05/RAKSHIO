// Smart Triage Router: one question decides the path — was money lost?
// Lost money -> 1930 / bank / portal. Attempted fraud, no loss -> Chakshu
// (Sanchar Saathi, 30 days). Nothing known yet -> 1930 for advice.
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
}): TriageResult {
  if (input.amount != null && input.amount > 0) {
    return {
      path: 'lost-money',
      title: 'Paisa gaya hai — turant ye 3 kadam',
      steps: [
        { text: '1930 par call karein — fund freeze ka chance sabse zyada pehle ghante me hota hai.' },
        { text: 'Bank ko suchit karein — dispute darj karein, reference number lein.' },
        {
          text: '24 ghante me cybercrime.gov.in par complaint poori karein.',
          link: { label: 'cybercrime.gov.in', href: 'https://cybercrime.gov.in' },
        },
      ],
    };
  }
  if (input.credentialShared || input.fraudType) {
    return {
      path: 'attempted-fraud',
      title: 'Paisa nahi gaya — koshish hui hai',
      steps: [
        {
          text: 'Chakshu (Sanchar Saathi) par report karein — 30 din ke andar.',
          link: { label: 'sancharsaathi.gov.in — Chakshu', href: 'https://sancharsaathi.gov.in' },
        },
        { text: 'Number/message ko block karein aur report karein.' },
        { text: 'Kisi ko OTP/PIN mat dijiye, aur card/UPI PIN badal lijiye.' },
      ],
    };
  }
  return {
    path: 'unknown',
    title: 'Abhi saaf nahi hai — salah lein',
    steps: [
      { text: '1930 par call karein aur jo hua woh batayein — woh sahi rasta batayenge.' },
      { text: 'Kisi ko paisa ya OTP mat dijiye jab tak saaf na ho.' },
    ],
  };
}
