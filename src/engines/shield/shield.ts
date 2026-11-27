// Second-Scam Shield 2.0: weighted red-flag rules over pasted text.
// No ML, no server — rules only, so every flag can explain itself on the
// Truth Card. A legit bank OTP warning ("do not share your OTP") must NOT
// fire the OTP-demand rule: the guard below excludes it.
export interface ShieldFlag {
  rule: string;
  weight: number;
  explain: string;
}

export interface ShieldVerdict {
  score: number;
  level: 'safe' | 'suspicious' | 'danger';
  flags: ShieldFlag[];
  truth: string;
  advice: string;
  // An OTP in the text is NOT itself a scam — a plain OTP notification
  // with no share-request scores 0 — but the user should see the rule
  // noticed it, so the check reads as working, not blind.
  otpNote?: string;
}

interface Rule {
  id: string;
  weight: number;
  patterns: RegExp[];
  explain: string;
  guard?: RegExp;
}

const RULES: Rule[] = [
  {
    id: 'otp-demand', weight: 5,
    patterns: [/\botp\b.{0,25}\b(batao|bataiye|bata|bhej|share|send|do|daalo|daal|manga|chahiye)\b/i, /\bpin\b.{0,25}\b(batao|bataiye|bata|bhej|share|send|do|daalo|daal|manga)\b/i],
    explain: 'OTP/PIN mangna — asli bank ya police kabhi OTP/PIN nahi mangta.',
    guard: /do not share|never share|kisi (ko|se) (mat|na) (bata|share)|share (na|mat) karein/i,
  },
  {
    id: 'digital-arrest', weight: 5,
    patterns: [/digital arrest/i],
    explain: '"Digital arrest" jaisa koi kaanoon nahi hai — ye dhamki hi scam hai.',
  },
  {
    id: 'advance-fee', weight: 5,
    patterns: [/refund ke liye.{0,20}(fee|charge|pay|jama)/i, /(pehle|advance).{0,15}(pay|fee|jama|bhejo)/i, /processing fee/i],
    explain: 'Refund ke liye pehle paisa mangna — recovery scam ka sabse bada sign.',
  },
  {
    id: 'remote-access', weight: 4,
    patterns: [/anydesk/i, /teamviewer/i, /screen ?share/i, /quick ?support/i],
    explain: 'Screen-share app install karwana — scammer aapka phone control karna chahta hai.',
  },
  {
    id: 'recovery-promise', weight: 4,
    patterns: [/paisa wapas/i, /refund.{0,15}(guarantee|pakka|100%)/i, /recovery agent/i, /fund recover/i, /money back.{0,10}guarantee/i],
    explain: 'Paisa wapas ka vaada — "recovery agent" aksar dusra scam hota hai.',
  },
  {
    id: 'upi-collect', weight: 4,
    patterns: [/collect request/i, /request.{0,10}approve/i, /paise (lene|receive).{0,15}pin/i, /receive money.{0,15}pin/i],
    explain: 'Paise lene ke liye PIN — UPI me paise aane par PIN kabhi nahi lagta.',
  },
  {
    id: 'fake-authority', weight: 3,
    patterns: [/\bpolice\b/i, /\bcbi\b/i, /\brbi\b/i, /\bcourt\b/i, /cyber ?crime/i],
    explain: 'Police/RBI/Court ka naam — dara kar jaldi faisla karwana.',
  },
  {
    id: 'urgency', weight: 4,
    patterns: [/turant/i, /abhi.{0,10}(karo|bhejo|do|pay)/i, /account band/i, /block ho (jayega|gaya)/i, /block hone wala hai/i, /2 ghante/i, /24 ghante/i],
    explain: 'Jaldi ka dabav — sochne ka time na dena.',
  },
  {
    id: 'kyc-threat', weight: 3,
    patterns: [/\bkyc\b.{0,20}(band|block|suspend|update)/i, /kyc.{0,10}link/i],
    explain: 'KYC ke naam par dhamki ya link — bank SMS se KYC nahi mangta.',
  },
  {
    id: 'prize-lottery', weight: 3,
    patterns: [/lottery/i, /prize/i, /inaam/i, /jeet gaye/i, /cashback.{0,10}claim/i],
    explain: 'Inaam/lottery — pehle fee mangi jayegi, inaam kabhi nahi milega.',
  },
  {
    id: 'suspicious-link', weight: 2,
    patterns: [/https?:\/\//i, /bit\.ly/i, /tinyurl/i, /link/i, /\.apk/i],
    explain: 'Anjaan link — click karne se pehle verify karein, ya bilkul na karein.',
  },
  {
    id: 'courier', weight: 3,
    patterns: [/courier/i, /parcel/i, /delivery.{0,10}(ruk|failed|pending)/i],
    explain: 'Courier/parcel ka bahana — aksar fake delivery link ke saath aata hai.',
  },
  {
    id: 'job-offer', weight: 3,
    patterns: [/job offer/i, /work from home/i, /part time.{0,10}(earn|kamai)/i],
    explain: 'Job offer ka lalach — joining fee mangi jayegi.',
  },
  {
    id: 'loan-approve', weight: 3,
    patterns: [/loan approve/i, /loan.{0,10}approved/i, /pre-approved loan/i],
    explain: 'Loan approve ka lalach — processing fee mangi jayegi.',
  },
  {
    id: 'id-demand', weight: 3,
    patterns: [/aadhaar.{0,15}(number|bata|share|bhejo)/i, /pan.{0,15}(number|bata|share)/i],
    explain: 'Aadhaar/PAN number mangna — asli bank aise nahi mangta.',
  },
  {
    id: 'upi-id-demand', weight: 3,
    patterns: [/upi id.{0,15}(bata|bhejo|share|do)/i],
    explain: 'UPI ID mangna — paise bhejne ke bahane aapki ID lena.',
  },
];

export function analyzeShield(text: string): ShieldVerdict {
  const flags: ShieldFlag[] = [];
  for (const r of RULES) {
    if (r.guard && r.guard.test(text)) continue;
    if (r.patterns.some((p) => p.test(text))) flags.push({ rule: r.id, weight: r.weight, explain: r.explain });
  }
  const score = flags.reduce((s, f) => s + f.weight, 0);
  const level = score >= 8 ? 'danger' : score >= 4 ? 'suspicious' : 'safe';
  const truth =
    level === 'danger'
      ? 'Ye message bahut khatarnak lagta hai. Isme ek se zyada scam sign hain — is par bharosa mat karein.'
      : level === 'suspicious'
        ? 'Is message me kuch signs galat lagte hain. Bina verify kiye koi kadam mat uthaiye.'
        : 'Is message me koi bada red flag nahi mila. Phir bhi, kisi bhi link ya OTP request par hamesha savdhaan rahein.';
  const advice =
    level === 'safe'
      ? 'Phir bhi: OTP/PIN kisi ko mat dijiye, aur anjaan link par click mat karein.'
      : 'Kya karein: message ko delete karein, number ko block karein, aur 1930 par report karein. Koi paisa mat bhejein, koi OTP mat dijiye.';
  // An OTP mention with digits is an info note only — it never adds to
  // the score, because a plain OTP notification is legitimate.
  const otpNote = /\botp\b/i.test(text) && /\d{4,6}/.test(text)
    ? 'OTP dikh raha hai — kisi se share mat karein.'
    : undefined;
  return { score, level, flags, truth, advice, otpNote };
}
