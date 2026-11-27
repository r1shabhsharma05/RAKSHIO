// Deterministic, rule-based extraction from a Hindi/Hinglish transcript.
// No LLM, no guessing: a field stays null until a rule matches it, and every
// field carries a confidence score. Amounts, dates and banks come from the
// master plan's Appendix A rules.

export interface Field<T> {
  value: T | null;
  confidence: number;
}

export interface ExtractedIncident {
  amount: Field<number>;
  fraudAt: Field<Date>;
  fraudAtDisplay: Field<string>;
  method: Field<'UPI' | 'card' | 'netbanking' | 'wallet'>;
  bank: Field<string>;
  utr: Field<string>;
  fraudType: Field<string>;
  credentialShared: boolean;
  contactChannel: Field<string>;
}

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const ONES: Record<string, number> = {
  ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5,
  chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20, beez: 20,
  tees: 30, chalis: 40, pachaas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
};

const SCALES: Record<string, number> = {
  sau: 100, hazaar: 1000, hazar: 1000, lakh: 100000, crore: 10000000,
};

const BANKS: { name: string; aliases: string[] }[] = [
  { name: 'HDFC', aliases: ['hdfc'] },
  { name: 'SBI', aliases: ['sbi', 'state bank'] },
  { name: 'ICICI', aliases: ['icici'] },
  { name: 'Axis', aliases: ['axis'] },
  { name: 'Kotak', aliases: ['kotak'] },
  { name: 'PNB', aliases: ['pnb', 'punjab national bank'] },
  { name: 'Bank of Baroda', aliases: ['bank of baroda', 'bob'] },
  { name: 'Canara', aliases: ['canara'] },
  { name: 'Union Bank', aliases: ['union bank'] },
  { name: 'Yes Bank', aliases: ['yes bank'] },
  { name: 'IDFC First', aliases: ['idfc'] },
  { name: 'Paytm', aliases: ['paytm'] },
  { name: 'PhonePe', aliases: ['phonepe'] },
  { name: 'Google Pay', aliases: ['google pay', 'gpay'] },
  { name: 'BHIM', aliases: ['bhim'] },
  { name: 'Amazon Pay', aliases: ['amazon pay'] },
];

// Weighted keyword rules; highest score wins. Weights are the plan's Appendix A.
const FRAUD_RULES: { type: string; keywords: [RegExp, number][] }[] = [
  { type: 'digital-arrest', keywords: [[/digital arrest/, 4], [/police/, 2], [/\bcbi\b/, 2], [/court/, 1]] },
  { type: 'remote-access', keywords: [[/anydesk/, 4], [/screen ?share/, 3], [/teamviewer/, 3]] },
  { type: 'otp-impersonation', keywords: [[/customer ?care/, 3], [/\botp\b/, 3], [/\bkyc\b/, 2]] },
  { type: 'qr-scam', keywords: [[/\bqr\b/, 3], [/scan/, 2]] },
  { type: 'investment-scam', keywords: [[/investment/, 3], [/trading/, 2], [/profit/, 2]] },
  { type: 'job-scam', keywords: [[/\bjob\b/, 3], [/naukri/, 2]] },
  { type: 'phishing-link', keywords: [[/link/, 2], [/click/, 2], [/\bsms\b/, 1], [/message/, 1]] },
  { type: 'unauthorised-debit', keywords: [[/kat gaye/, 2], [/debit/, 2], [/bina permission/, 2], [/kuch nahi kiya/, 2]] },
];

// Devanagari number/time words -> Latin, so "बीस हज़ार" parses like "bees hazaar".
const DEVANAGARI_WORDS: Record<string, string> = {
  'बीस': 'bees', 'हज़ार': 'hazaar', 'हजार': 'hazaar', 'लाख': 'lakh', 'सौ': 'sau',
  'एक': 'ek', 'दो': 'do', 'तीन': 'teen', 'चार': 'chaar', 'पाँच': 'paanch',
  'छह': 'chhe', 'सात': 'saat', 'आठ': 'aath', 'नौ': 'nau', 'दस': 'das',
  'ग्यारह': 'gyarah', 'बारह': 'barah', 'तेरह': 'terah', 'चौदह': 'chaudah',
  'पंद्रह': 'pandrah', 'सोलह': 'solah', 'सत्रह': 'satrah', 'अठारह': 'atharah',
  'उन्नीस': 'unnees', 'तीस': 'tees', 'चालीस': 'chalis', 'पचास': 'pachaas',
  'साठ': 'saath', 'सत्तर': 'sattar', 'अस्सी': 'assi', 'नब्बे': 'nabbe',
  'डेढ़': 'dedh', 'आधा': 'aadha', 'रुपये': 'rupaye', 'रुपए': 'rupaye',
  'कल': 'kal', 'आज': 'aaj', 'परसों': 'parson', 'सुबह': 'subah',
  'दोपहर': 'dopahar', 'शाम': 'shaam', 'रात': 'raat', 'बजे': 'baje',
  'कट': 'kat', 'गए': 'gaye',
};

function normalize(text: string): string {
  let out = text;
  for (const [dev, lat] of Object.entries(DEVANAGARI_WORDS)) {
    out = out.split(dev).join(` ${lat} `);
  }
  const digits = out.replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d]);
  return digits.toLowerCase().replace(/[₹,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(text: string): string[] {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

// Parses a run of Hindi number words / digits, e.g. "bees hazaar" -> 20000,
// "dedh lakh" -> 150000, "ek lakh bees hazaar" -> 120000.
function parseNumberWords(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (w === 'dedh') { current = 1.5; seen = true; continue; }
    if (w === 'aadha') { current = 0.5; seen = true; continue; }
    if (w in ONES) { current += ONES[w]; seen = true; continue; }
    if (w in SCALES) {
      const scale = SCALES[w];
      total += (current || 1) * scale;
      current = 0;
      seen = true;
      continue;
    }
    if (/^\d+$/.test(w)) { current += Number(w); seen = true; continue; }
    if (seen) break; // run ended
  }
  total += current;
  return seen ? total : null;
}

function parseAmount(_text: string, stripped: string): Field<number> {
  const moneyCue = /(rupaye|rupee|rs|paisa|kat gaye|debit|amount|paise)/.test(stripped);
  if (!moneyCue) return { value: null, confidence: 0 };
  // Latin digits first ("20,000" / "20000"), UTR already stripped out.
  const digitMatch = stripped.match(/\b(\d[\d ]{2,})\b/);
  if (digitMatch) {
    const value = Number(digitMatch[1].replace(/\s/g, ''));
    if (value > 0 && value < 100000000) return { value, confidence: 0.95 };
  }
  const words = tokens(stripped);
  for (let i = 0; i < words.length; i++) {
    const value = parseNumberWords(words.slice(i));
    if (value !== null && value > 0) {
      // A bare "das" (10) with no scale is a time, not money; need a scale
      // word or a money word right after the number run.
      const run = words.slice(i, i + 4).join(' ');
      if (/(sau|hazaar|hazar|lakh|crore)/.test(run) || /(rupaye|rupee|rs|paisa)/.test(words.slice(i, i + 5).join(' '))) {
        return { value, confidence: 0.85 };
      }
    }
  }
  return { value: null, confidence: 0 };
}

function parseUtr(text: string): Field<string> {
  // 12 digits, optionally spaced in groups: "432109876543" or "4321 0987 6543".
  const m = text.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{12})\b/);
  if (!m) return { value: null, confidence: 0 };
  const digits = m[1].replace(/[\s-]/g, '');
  const nearUtrWord = /(utr|reference|transaction ?id|txn)/.test(text.slice(Math.max(0, m.index! - 20), m.index! + m[0].length));
  return { value: digits, confidence: nearUtrWord ? 0.95 : 0.8 };
}

function parseBank(text: string): Field<string> {
  for (const b of BANKS) {
    if (b.aliases.some((a) => text.includes(a))) return { value: b.name, confidence: 0.9 };
  }
  return { value: null, confidence: 0 };
}

function parseMethod(text: string): Field<'UPI' | 'card' | 'netbanking' | 'wallet'> {
  if (/(upi|phonepe|gpay|google pay|paytm|bhim)/.test(text)) return { value: 'UPI', confidence: 0.85 };
  if (/(debit card|credit card|\bcard\b)/.test(text)) return { value: 'card', confidence: 0.85 };
  if (/net ?banking/.test(text)) return { value: 'netbanking', confidence: 0.85 };
  if (/wallet/.test(text)) return { value: 'wallet', confidence: 0.8 };
  return { value: null, confidence: 0 };
}

function parseFraudType(text: string): Field<string> {
  let best: { type: string; score: number } | null = null;
  for (const rule of FRAUD_RULES) {
    const score = rule.keywords.reduce((s, [re, w]) => (re.test(text) ? s + w : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { type: rule.type, score };
  }
  if (!best) return { value: null, confidence: 0 };
  return { value: best.type, confidence: Math.min(0.95, 0.4 + 0.1 * best.score) };
}

function parseFraudAt(text: string, now: Date): { at: Field<Date>; display: Field<string> } {
  const dayOffset = /parson/.test(text) ? -2 : /kal/.test(text) ? -1 : /aaj/.test(text) ? 0 : null;
  // Hour: digits or Hindi words before "baje".
  let hour: number | null = null;
  const hm = text.match(/(?:(\d{1,2})|([a-z]+))\s*baje/);
  if (hm) {
    hour = hm[1] ? Number(hm[1]) : (ONES[hm[2]] ?? null);
  }
  if (dayOffset === null && hour === null) {
    return { at: { value: null, confidence: 0 }, display: { value: null, confidence: 0 } };
  }
  const date = new Date(now);
  if (dayOffset !== null) date.setDate(date.getDate() + dayOffset);
  if (hour !== null) {
    let h = hour % 12;
    if (/(dopahar|shaam|raat)/.test(text)) h += 12;
    if (/(subah)/.test(text) && hour === 12) h = 0;
    date.setHours(h, 0, 0, 0);
  } else {
    date.setHours(12, 0, 0, 0);
  }
  const dayWord = dayOffset === 0 ? 'aaj' : dayOffset === -1 ? 'kal' : dayOffset === -2 ? 'parson' : '';
  const display = `${dayWord}${hour !== null ? `, ${hour} baje` : ''}`.trim();
  const confidence = dayOffset !== null && hour !== null ? 0.85 : 0.6;
  return { at: { value: date, confidence }, display: { value: display || null, confidence } };
}

// Masks 4-6 digit numbers spoken next to OTP/PIN/CVV/password before storage.
export function maskCredentials(text: string): { text: string; masked: boolean } {
  let masked = false;
  const out = text.replace(/((?:otp|pin|cvv|password)[^\d]{0,15})(\d{4,6})/gi, (_m, pre: string, digits: string) => {
    masked = true;
    return pre + '•'.repeat(digits.length);
  });
  return { text: out, masked };
}

export function extractIncident(rawTranscript: string, now = new Date()): { incident: ExtractedIncident; maskedTranscript: string; masked: boolean } {
  const { text: maskedTranscript, masked } = maskCredentials(rawTranscript);
  const text = normalize(maskedTranscript);
  // Strip the UTR before amount parsing so its digits are never read as money.
  const utr = parseUtr(text);
  const stripped = utr.value ? text.replace(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{12})\b/, ' ') : text;

  const fraudAt = parseFraudAt(text, now);
  const credentialShared = /(otp|pin|cvv|password)/.test(text) && /(manga|maanga|bata|diya|bheja|share|install)/.test(text);
  const contact = /customer ?care/.test(text)
    ? { value: 'customer-care call', confidence: 0.85 }
    : /whatsapp/.test(text)
      ? { value: 'WhatsApp', confidence: 0.85 }
      : /link/.test(text)
        ? { value: 'link/message', confidence: 0.7 }
        : { value: null, confidence: 0 };

  return {
    incident: {
      amount: parseAmount(text, stripped),
      fraudAt: fraudAt.at,
      fraudAtDisplay: fraudAt.display,
      method: parseMethod(text),
      bank: parseBank(text),
      utr,
      fraudType: parseFraudType(text),
      credentialShared,
      contactChannel: contact,
    },
    maskedTranscript,
    masked,
  };
}
