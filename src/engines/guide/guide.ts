// Situation Guide engine — deterministic, on-device, rule-based guidance.
// No model, no AI, no server, no data leaves the device: every guide is a
// fixed, reviewed list of steps for one fraud situation. The extractor and
// the Shield map onto these guides; nothing here is generated or guessed.
//
// Numbers used are only the established official windows (1930 ≤48h,
// portal ≤24h, bank ≤3 working days) — never recovery promises.
export interface SituationGuide {
  id: string;
  title: string;
  recognize: string[];
  firstFiveMinutes: string[];
  reportSteps: string[];
  dontDo: string[];
  evidence: string[];
}

const REPORT_1930 = '1930 par call karein — 48 ghante ke andar, jitni jaldi ho sake';
const REPORT_PORTAL = 'cybercrime.gov.in par 24 ghante me complaint likhein';
const REPORT_BANK = 'Bank me likhit dispute dein — 3 working days ke andar';
const REPORT_ACK = 'Ack number sambhal kar rakhein — har jagah wahi kaam aayega';

export const GUIDES: SituationGuide[] = [
  {
    id: 'upi-fraud',
    title: 'UPI fraud / bina permission debit',
    recognize: [
      'Account se paisa kata, aapne kuch nahi kiya',
      'UPI app me aisi transaction dikhe jo aapne nahi ki',
      'Bank SMS aaya — paisa gaya, wajah pata nahi',
    ],
    firstFiveMinutes: [
      'Turant UPI app kholein — UPI PIN badlein, card block karein',
      'Bank ko call karke transaction rokne ko kahein',
      'Phone me koi anjaan app install hui ho to turant uninstall karein',
      'Kisi ko OTP/PIN mat dijiye — bank kabhi nahi mangta',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Paise wapas karne wale "agent" ko fee mat dijiye',
      'Kisi link par click karke dobara login mat karein',
      'Scammer ko call back mat karein',
    ],
    evidence: [
      'Transaction ka screenshot (amount, date, UTR)',
      'Bank SMS ka screenshot',
      'UPI app ki transaction history',
    ],
  },
  {
    id: 'otp-scam',
    title: 'OTP dhokha (customer care)',
    recognize: [
      "Kisi ne OTP manga — 'verification' ya 'refund' ke naam par",
      'Khud ko bank/customer care bataya, par number anjaan tha',
      'OTP batate hi paisa kat gaya',
    ],
    firstFiveMinutes: [
      'Turant card/UPI block karein — OTP share hote hi scammer ke paas access hai',
      'Bank helpline par call karke batayein OTP share hua hai',
      'UPI PIN aur net-banking password badlein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Dobara OTP kisi ko mat dijiye — asli bank kabhi OTP nahi mangta',
      "'Account band ho jayega' ki dhamki par ghabra kar kuch mat karein",
    ],
    evidence: [
      'Call ka number + time',
      'OTP wala SMS (number chhupakar)',
      'Kati hui rashi ka screenshot',
    ],
  },
  {
    id: 'fake-customer-care',
    title: 'Nakli customer care call',
    recognize: [
      'Google se mila number par call ki — woh nakli nikla',
      "Call par 'support' ne screen-share app install karwaya",
      'Refund ke naam par OTP ya payment manga',
    ],
    firstFiveMinutes: [
      'Screen-share app turant uninstall karein',
      'Phone ko flight mode me daal kar net band karein',
      'Bank app se card/UPI block karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Customer care' ke kahe par koi app install mat karein",
      'Refund ke liye pehle paisa mat dijiye',
    ],
    evidence: [
      'Woh number jis par call ki',
      'Install ki gayi app ka naam',
      'Transaction ke screenshots',
    ],
  },
  {
    id: 'phishing-link',
    title: 'Fake link / SMS',
    recognize: [
      "SMS me link aaya — 'KYC update', 'refund', 'parcel' jaisa",
      'Link kholte hi bank jaisi site khuli, login manga',
      'Login karte hi paisa kat gaya',
    ],
    firstFiveMinutes: [
      'Turant UPI PIN aur net-banking password badlein',
      'Bank ko batayein — card block karwayein',
      'Browser history se woh link delete karein, dobara mat kholein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'SMS wale link par dobara login mat karein',
      'Link kisi aur ko forward mat karein',
    ],
    evidence: [
      'SMS ka screenshot (link ke saath)',
      'Site ka naam/URL',
      'Transaction ka screenshot',
    ],
  },
  {
    id: 'kyc-scam',
    title: 'KYC / account-block dhamki',
    recognize: [
      "SMS/call: 'KYC nahi hua to account band ho jayega'",
      "Link bheja — 'KYC update karein'",
      'Dhamki dekar turant action karwaya',
    ],
    firstFiveMinutes: [
      'Link par click mat karein — bank SMS se KYC nahi mangta',
      'Bank ke official number par khud call karke poochein',
      'Agar OTP de diya ho to turant card block karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Account band' ki dhamki par ghabra kar login mat karein",
      'KYC ke naam par Aadhaar/PAN number mat dijiye',
    ],
    evidence: [
      'SMS ka screenshot',
      'Call ka number',
      'Kati hui rashi ka proof',
    ],
  },
  {
    id: 'refund-scam',
    title: 'Refund / recovery agent dhokha',
    recognize: [
      "Koi kehta hai 'aapka paisa wapas karwa dunga' — pehle fee mangta hai",
      "'Recovery agent' bank/police ka naam leta hai",
      'Refund ke liye UPI PIN ya OTP manga',
    ],
    firstFiveMinutes: [
      'Ek bhi rupaya mat dijiye — asli recovery me pehle fee nahi lagti',
      'Number ko block karein, message delete karein',
      "Dobara koi 'agent' contact kare to 1930 par poochein",
    ],
    reportSteps: [
      '1930 par is dusre scam ki bhi report karein',
      'Pehle wale fraud ki portal complaint me ye bhi likhein',
      'Bank ko batayein — dono transactions ki list dein',
      REPORT_ACK,
    ],
    dontDo: [
      "'Processing fee' ya 'advance' kabhi mat dijiye",
      'Recovery ke naam par screen share mat karein',
    ],
    evidence: [
      'Agent ka number + chat ka screenshot',
      'Mangi gayi fee ki details',
      'Pehle fraud ka ack number',
    ],
  },
  {
    id: 'investment-scam',
    title: 'Investment / double-money dhokha',
    recognize: [
      "'Double paisa' ya 'guaranteed profit' ka vaada",
      'Telegram/WhatsApp group me trading tips',
      'Pehle chhota profit diya, phir bada deposit manga',
    ],
    firstFiveMinutes: [
      "Aur paisa mat dijiye — 'profit nikaalne' ke liye fee mangi jayegi, wohi scam hai",
      'App/website se logout karein, linked bank account par nazar rakhein',
      'Bank ko batayein — account freeze karwayein agar paisa gaya ho',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Withdrawal fee' ya 'tax' ke naam par aur paisa mat dijiye",
      "Group ke 'profit screenshot' par bharosa mat karein",
    ],
    evidence: [
      'Chat ke screenshots',
      'Payment ke screenshots (UTR ke saath)',
      'App/website ka naam + link',
    ],
  },
  {
    id: 'sim-swap',
    title: 'SIM swap',
    recognize: [
      "Achanak network gayab — 'No service' dikhne laga",
      'OTP aana band ho gaya, par paisa katne laga',
      'Kisi ne aapki SIM ka duplicate nikalwaya',
    ],
    firstFiveMinutes: [
      'Turant telecom operator ko call karke SIM block karwayein',
      'Bank ko batayein — OTP band karwayein, account freeze karwayein',
      'Email password badlein — scammer email bhi access kar sakta hai',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Nayi SIM milte hi purane passwords se login mat karein — pehle sab badlein',
      'OTP aane ka intezaar mat karein — SIM block hi pehla kadam hai',
    ],
    evidence: [
      'Network gayab hone ka time',
      'Bank transactions ke screenshots',
      'Operator se mili complaint number',
    ],
  },
  {
    id: 'qr-scam',
    title: 'QR-code scam',
    recognize: [
      'Paise lene ke liye QR scan + PIN manga — paise aane par PIN nahi lagta',
      'QR scan karte hi paisa kat gaya',
      "Seller ne 'payment receive karne' ke bahane QR bheja",
    ],
    firstFiveMinutes: [
      'Turant UPI PIN badlein aur card block karein',
      'Bank ko batayein — transaction rokne ko kahein',
      'Woh QR dobara scan mat karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Paise lene ke liye kabhi PIN mat dijiye — UPI me paise aane par PIN nahi lagta',
      'Anjaan QR scan mat karein',
    ],
    evidence: [
      'QR ka screenshot',
      'Chat jisme QR bheja gaya',
      'Transaction ka screenshot (UTR)',
    ],
  },
  {
    id: 'job-scam',
    title: 'Nakli naukri / job offer',
    recognize: [
      "Job ke liye 'registration fee' ya 'training fee' mangi",
      'Work-from-home offer — pehle paisa, phir kaam',
      'Offer letter bheja, par company ka koi record nahi',
    ],
    firstFiveMinutes: [
      'Ek bhi rupaya mat dijiye — asli naukri me fee nahi lagti',
      'Company ka naam official site par verify karein',
      'Agar paisa de diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Joining fee' ke naam par payment mat karein",
      'Aadhaar/PAN/bank details job ke liye mat dijiye',
    ],
    evidence: [
      'Offer letter/message ka screenshot',
      'Payment ka proof',
      'Company ka naam + number',
    ],
  },
  {
    id: 'loan-app-scam',
    title: 'Loan-app dhokha',
    recognize: [
      'Loan app ne contacts/photos access karke dhamkana shuru kiya',
      "'Pre-approved loan' ke naam par processing fee mangi",
      'Loan liya hi nahi, phir bhi repayment ki dhamki',
    ],
    firstFiveMinutes: [
      'App ko turant uninstall karein, permissions wapas lein',
      'Dhamki wale messages ka screenshot lein — reply mat karein',
      'Bank ko batayein agar paisa kata ho',
    ],
    reportSteps: [
      '1930 par report karein — harassment bhi likhein',
      'cybercrime.gov.in par complaint karein',
      'RBI ke Sachet portal par bhi report kar sakte hain',
      REPORT_ACK,
    ],
    dontDo: [
      'Dhamki se darr kar paisa mat dijiye',
      'App ko contacts/photos ka access mat dijiye',
    ],
    evidence: [
      'Dhamki wale messages ke screenshots',
      'App ka naam + payment proof',
      'Call recordings agar hon',
    ],
  },
  {
    id: 'attempted-fraud',
    title: 'Dhokha hua nahi, koshish hui',
    recognize: [
      'Call/SMS aaya — OTP, link ya paisa manga, par aapne kuch nahi diya',
      'Koi anjaan link ya QR bheja gaya',
      'Aapne time par pehchan liya',
    ],
    firstFiveMinutes: [
      'Kuch share nahi kiya — sabse bada kaam ho gaya',
      'Number ko block karein, message delete karein',
      'Parivar ko batayein — scammer dobara try kar sakta hai',
    ],
    reportSteps: [
      '1930 par koshish ki report karein — dusron ko bachata hai',
      'Chakshu portal (sancharsaathi.gov.in) par number report karein',
      'Bank ko inform karein agar account ki baat hui ho',
    ],
    dontDo: [
      "'Bas ek baar dekh lo' — link mat kholein",
      'Scammer se behes mat karein',
    ],
    evidence: [
      'Message/call ka screenshot',
      'Number',
      'Time aur tareeka',
    ],
  },
  {
    id: 'digital-arrest',
    title: 'Digital arrest dhamki',
    recognize: [
      "Video call par 'police/CBI' — 'aap giraftar honge'",
      "'Digital arrest' ka naam lekar paisa manga",
      'Call par hi rehne ko kaha — phone kaatne nahi diya',
    ],
    firstFiveMinutes: [
      "Call turant kaatein — 'digital arrest' jaisa koi kaanoon nahi hai",
      'Kisi ko paisa mat dijiye — asli police video call par giraftari nahi karti',
      'Parivar ke kisi bharosemand ko turant batayein',
    ],
    reportSteps: [
      '1930 par report karein',
      'cybercrime.gov.in par complaint karein',
      'Nazdeeki police station me bhi likhit shikayat de sakte hain',
      REPORT_ACK,
    ],
    dontDo: [
      "Darr kar 'bail' ya 'fine' ke naam par paisa mat dijiye",
      'Call par hi rehkar unke kahe par koi app install mat karein',
    ],
    evidence: [
      'Caller ka number + naam',
      'Call ka time aur duration',
      'Mangi gayi rashi + account details',
    ],
  },
  {
    id: 'remote-access',
    title: 'Screen-share (AnyDesk) dhokha',
    recognize: [
      "'Support' ne AnyDesk/TeamViewer install karwaya",
      'Screen share karte hi OTP/password dikh gaya',
      'Phone remote se control hone laga',
    ],
    firstFiveMinutes: [
      'Screen-share app turant uninstall karein',
      'Phone ko flight mode me daalein — net band karein',
      'Bank app se card/UPI block karein, passwords badlein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Kisi ke kahe par screen-share app kabhi install mat karein',
      'Screen share ke dauraan OTP/password type mat karein',
    ],
    evidence: [
      'App ka naam (AnyDesk/TeamViewer)',
      'Call ka number',
      'Transactions ke screenshots',
    ],
  },
];

// Extractor fraud types (src/engines/understanding/extract.ts) → guide.
// Every extractor output must map; null (no type detected) maps to null
// and the caller shows the full guide list instead.
const FRAUD_TYPE_TO_GUIDE: Record<string, string> = {
  'digital-arrest': 'digital-arrest',
  'remote-access': 'remote-access',
  'otp-impersonation': 'otp-scam',
  'qr-scam': 'qr-scam',
  'investment-scam': 'investment-scam',
  'job-scam': 'job-scam',
  'phishing-link': 'phishing-link',
  'unauthorised-debit': 'upi-fraud',
};

// Shield rule ids (src/engines/shield/shield.ts) → guide. Rules with no
// specific guide (prize-lottery, urgency, id-demand) map to null; the
// caller then links to the full guide list.
const SHIELD_RULE_TO_GUIDE: Record<string, string> = {
  'otp-demand': 'otp-scam',
  'digital-arrest': 'digital-arrest',
  'advance-fee': 'refund-scam',
  'recovery-promise': 'refund-scam',
  'remote-access': 'remote-access',
  'upi-collect': 'upi-fraud',
  'fake-authority': 'digital-arrest',
  'kyc-threat': 'kyc-scam',
  'suspicious-link': 'phishing-link',
  'courier': 'phishing-link',
  'job-offer': 'job-scam',
  'loan-approve': 'loan-app-scam',
  'upi-id-demand': 'upi-fraud',
};

export function guideById(id: string | null | undefined): SituationGuide | null {
  if (!id) return null;
  return GUIDES.find((g) => g.id === id) ?? null;
}

export function guideForFraudType(fraudType: string | null | undefined): SituationGuide | null {
  if (!fraudType) return null;
  return guideById(FRAUD_TYPE_TO_GUIDE[fraudType] ?? null);
}

export function guideForShieldRule(ruleId: string | null | undefined): SituationGuide | null {
  if (!ruleId) return null;
  return guideById(SHIELD_RULE_TO_GUIDE[ruleId] ?? null);
}

