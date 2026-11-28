// Second-Scam Shield 2.0: weighted red-flag rules over pasted text.
// No ML, no server — rules only, so every flag can explain itself on the
// Truth Card. A legit bank OTP warning ("do not share your OTP") must NOT
// fire the OTP-demand rule: the guard below excludes it.
// Step 17: rule explanations follow the UI language (explainKey into
// i18n); the default 'hg' returns the exact old Hinglish strings, so the
// 50-message test set and the Truth Card copy are unchanged there.
import { t, type Lang } from '../../i18n';

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
  explainKey: string;
  guard?: RegExp;
}

const RULES: Rule[] = [
  {
    id: 'otp-demand', weight: 5,
    patterns: [/\botp\b.{0,25}\b(batao|bataiye|bata|bhej|share|send|do|daalo|daal|manga|chahiye)\b/i, /\bpin\b.{0,25}\b(batao|bataiye|bata|bhej|share|send|do|daalo|daal|manga)\b/i],
    explainKey: 'shieldRuleOtpDemand',
    guard: /do not share|never share|kisi (ko|se) (mat|na) (bata|share)|share (na|mat) karein/i,
  },
  {
    id: 'digital-arrest', weight: 5,
    patterns: [/digital arrest/i],
    explainKey: 'shieldRuleDigitalArrest',
  },
  {
    id: 'advance-fee', weight: 5,
    patterns: [/refund ke liye.{0,20}(fee|charge|pay|jama)/i, /(pehle|advance).{0,15}(pay|fee|jama|bhejo)/i, /processing fee/i],
    explainKey: 'shieldRuleAdvanceFee',
  },
  {
    id: 'remote-access', weight: 4,
    patterns: [/anydesk/i, /teamviewer/i, /screen ?share/i, /quick ?support/i],
    explainKey: 'shieldRuleRemoteAccess',
  },
  {
    id: 'recovery-promise', weight: 4,
    patterns: [/paisa wapas/i, /refund.{0,15}(guarantee|pakka|100%)/i, /recovery agent/i, /fund recover/i, /money back.{0,10}guarantee/i],
    explainKey: 'shieldRuleRecoveryPromise',
  },
  {
    id: 'upi-collect', weight: 4,
    patterns: [/collect request/i, /request.{0,10}approve/i, /paise (lene|receive).{0,15}pin/i, /receive money.{0,15}pin/i],
    explainKey: 'shieldRuleUpiCollect',
  },
  {
    id: 'fake-authority', weight: 3,
    patterns: [/\bpolice\b/i, /\bcbi\b/i, /\brbi\b/i, /\bcourt\b/i, /cyber ?crime/i],
    explainKey: 'shieldRuleFakeAuthority',
  },
  {
    id: 'urgency', weight: 4,
    patterns: [/turant/i, /abhi.{0,10}(karo|bhejo|do|pay)/i, /account band/i, /block ho (jayega|gaya)/i, /block hone wala hai/i, /2 ghante/i, /24 ghante/i],
    explainKey: 'shieldRuleUrgency',
  },
  {
    id: 'kyc-threat', weight: 3,
    patterns: [/\bkyc\b.{0,20}(band|block|suspend|update)/i, /kyc.{0,10}link/i],
    explainKey: 'shieldRuleKycThreat',
  },
  {
    id: 'prize-lottery', weight: 3,
    patterns: [/lottery/i, /prize/i, /inaam/i, /jeet gaye/i, /cashback.{0,10}claim/i],
    explainKey: 'shieldRulePrizeLottery',
  },
  {
    id: 'suspicious-link', weight: 2,
    patterns: [/https?:\/\//i, /bit\.ly/i, /tinyurl/i, /link/i, /\.apk/i],
    explainKey: 'shieldRuleSuspiciousLink',
  },
  {
    id: 'courier', weight: 3,
    patterns: [/courier/i, /parcel/i, /delivery.{0,10}(ruk|failed|pending)/i],
    explainKey: 'shieldRuleCourier',
  },
  {
    id: 'job-offer', weight: 3,
    patterns: [/job offer/i, /work from home/i, /part time.{0,10}(earn|kamai)/i],
    explainKey: 'shieldRuleJobOffer',
  },
  {
    id: 'loan-approve', weight: 3,
    patterns: [/loan approve/i, /loan.{0,10}approved/i, /pre-approved loan/i],
    explainKey: 'shieldRuleLoanApprove',
  },
  {
    id: 'id-demand', weight: 3,
    patterns: [/aadhaar.{0,15}(number|bata|share|bhejo)/i, /pan.{0,15}(number|bata|share)/i],
    explainKey: 'shieldRuleIdDemand',
  },
  {
    id: 'upi-id-demand', weight: 3,
    patterns: [/upi id.{0,15}(bata|bhejo|share|do)/i],
    explainKey: 'shieldRuleUpiIdDemand',
  },
];

export function analyzeShield(text: string, lang: Lang = 'hg'): ShieldVerdict {
  const flags: ShieldFlag[] = [];
  for (const r of RULES) {
    if (r.guard && r.guard.test(text)) continue;
    if (r.patterns.some((p) => p.test(text))) flags.push({ rule: r.id, weight: r.weight, explain: t(lang, r.explainKey) });
  }
  const score = flags.reduce((s, f) => s + f.weight, 0);
  const level = score >= 8 ? 'danger' : score >= 4 ? 'suspicious' : 'safe';
  const truth =
    level === 'danger'
      ? t(lang, 'shieldTruthDanger')
      : level === 'suspicious'
        ? t(lang, 'shieldTruthSuspicious')
        : t(lang, 'shieldTruthSafe');
  const advice = level === 'safe' ? t(lang, 'shieldAdviceSafe') : t(lang, 'shieldAdviceDanger');
  // An OTP mention with digits is an info note only — it never adds to
  // the score, because a plain OTP notification is legitimate.
  const otpNote = /\botp\b/i.test(text) && /\d{4,6}/.test(text)
    ? t(lang, 'shieldOtpNote')
    : undefined;
  return { score, level, flags, truth, advice, otpNote };
}
