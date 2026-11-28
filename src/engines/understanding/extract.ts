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
  // Step 20 (B1): English number words — the parser was Hindi-only, so
  // "twenty thousand" parsed to null on every entry path.
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

const SCALES: Record<string, number> = {
  sau: 100, hazaar: 1000, hazar: 1000, lakh: 100000, crore: 10000000,
  hundred: 100, thousand: 1000,
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
  // Step 21 (#11): the two biggest 2025 loss categories were investment
  // (77%) and digital arrest (8%) — plus the courier/task/crypto/loan
  // patterns victims actually narrate. Each new type maps to a real
  // Situation Guide (guide.ts FRAUD_TYPE_TO_GUIDE), never to a guess.
  { type: 'digital-arrest', keywords: [[/digital arrest/, 4], [/arrest/, 2], [/video ?call/, 2], [/police/, 2], [/\bcbi\b/, 2], [/court/, 1]] },
  { type: 'remote-access', keywords: [[/anydesk/, 4], [/screen ?share/, 3], [/teamviewer/, 3]] },
  { type: 'otp-impersonation', keywords: [[/customer ?care/, 3], [/\botp\b/, 3], [/\bkyc\b/, 2]] },
  { type: 'qr-scam', keywords: [[/\bqr\b/, 3], [/scan/, 2]] },
  { type: 'investment-scam', keywords: [[/investment/, 3], [/trading/, 2], [/profit/, 2]] },
  { type: 'job-scam', keywords: [[/\bjob\b/, 3], [/naukri/, 2]] },
  { type: 'courier-scam', keywords: [[/courier/, 4], [/parcel/, 3], [/customs/, 3], [/drugs in parcel/, 4]] },
  { type: 'task-scam', keywords: [[/task/, 2], [/like.*(task|rating)/, 3], [/telegram.*task/, 3], [/premium deposit/, 3]] },
  { type: 'crypto-scam', keywords: [[/crypto/, 4], [/bitcoin/, 4], [/\busdt\b/, 3], [/crypto trading/, 4]] },
  { type: 'loan-app-scam', keywords: [[/loan app/, 4], [/instant loan/, 3], [/\bloan\b/, 1]] },
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

// Parses a run of Hindi/Hinglish/English number words / digits STARTING
// at words[0], e.g. "bees hazaar" -> { value: 20000, consumed: 2 },
// "dedh lakh" -> 150000, "ek lakh bees hazaar" -> 120000,
// "twenty thousand five hundred" -> 20500, "one and a half lakh" -> 150000.
// Strict start: a run never skips ahead to a later number — the caller
// walks each position, so a time ("7 baje") can never borrow the scale
// of the next phrase ("bees hazaar").
function parseNumberWords(words: string[]): { value: number; consumed: number } | null {
  let total = 0;
  let current = 0;
  let seen = false;
  let consumed = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === 'dedh') { current = 1.5; seen = true; consumed++; continue; }
    if (w === 'aadha') { current = 0.5; seen = true; consumed++; continue; }
    // "half a lakh" -> 50000, "one and a half lakh" -> 150000: half adds
    // 0.5 to what is already there instead of overwriting it.
    if (w === 'half') { current = current > 0 ? current + 0.5 : 0.5; seen = true; consumed++; continue; }
    // "and" joins two parts of one amount ("twenty thousand and five
    // hundred") — transparent mid-run, never starts a run.
    if (w === 'and') { if (seen) { consumed++; continue; } break; }
    // "a lakh" / "a hundred": the article counts as 1, but only right
    // before a scale — "a 20000" must not become 20001.
    if (w === 'a' || w === 'an') {
      const next = words[i + 1];
      if (next && next in SCALES && current === 0) { current = 1; seen = true; }
      consumed++;
      continue;
    }
    if (w in ONES) { current += ONES[w]; seen = true; consumed++; continue; }
    if (w in SCALES) {
      const scale = SCALES[w];
      total += (current || 1) * scale;
      current = 0;
      seen = true;
      consumed++;
      continue;
    }
    if (/^\d+$/.test(w)) { current += Number(w); seen = true; consumed++; continue; }
    break; // run ended
  }
  total += current;
  return seen ? { value: total, consumed } : null;
}

function parseAmount(_text: string, stripped: string): Field<number> {
  const moneyCue = /(rupaye|rupee|rs|paisa|kat gaye|debit|amount|paise)/.test(stripped);
  if (!moneyCue) return { value: null, confidence: 0 };
  // Time expressions are never money: strip "7 baje" / "saat baje" before
  // any digit or word scan, so a clock time can't be read as an amount.
  // (Live bug: "kal shaam 7 baje bees hazaar" extracted ₹7 — the "7" from
  // the time borrowed "hazaar" from the real amount via a lookahead window.)
  const noTime = stripped.replace(/\b(?:\d{1,2}|[a-z]+)\s+baje\b/g, ' ');
  // Step 20 (B1): decimals split into digits by tokens() ("1.5 lakh" ->
  // "1"+"5" -> 600000), so catch decimal+scale on the raw string first.
  const decScale = noTime.match(/\b(\d+\.\d+)\s*(lakh|crore|thousand|hazaar|hazar|hundred|sau)\b/);
  if (decScale) {
    const value = parseFloat(decScale[1]) * SCALES[decScale[2]];
    if (value > 0 && value < 100000000) return { value, confidence: 0.9 };
  }
  // "20k" / "20K" shorthand.
  const kMatch = noTime.match(/\b(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    const value = parseFloat(kMatch[1]) * 1000;
    if (value > 0 && value < 100000000) return { value, confidence: 0.9 };
  }
  // Latin digits first ("20,000" / "20000"), UTR already stripped out.
  // Step 20 (B1): the old /(\d[\d ]{2,})/ matched "50 " in
  // "2 lakh 50 thousand" — the trailing space counted as the 3rd char —
  // and returned ₹50 before any word scan. The run must end in a digit
  // and hold at least 3 digits, so a 2-digit fragment never steals it.
  const digitMatch = noTime.match(/\b(\d(?:[ ]?\d){2,})\b/);
  if (digitMatch) {
    const value = Number(digitMatch[1].replace(/\s/g, ''));
    if (value > 0 && value < 100000000) return { value, confidence: 0.95 };
  }
  const words = tokens(noTime);
  for (let i = 0; i < words.length; i++) {
    const run = parseNumberWords(words.slice(i));
    // A bare fraction ("half" alone -> 0.5) is not money.
    if (!run || run.value < 1) continue;
    // The guard reads ONLY the run's own words plus the word right after
    // it — never a window reaching into the next phrase. A bare number
    // ("das") with no scale and no money word next to it is not money.
    const runWords = words.slice(i, i + run.consumed);
    const after = words[i + run.consumed];
    const hasScale = runWords.some((w) => w in SCALES);
    const moneyAfter = after !== undefined && /(rupaye|rupee|rs|paisa)/.test(after);
    if (hasScale || moneyAfter) return { value: run.value, confidence: 0.85 };
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
  // First mention in the TEXT wins, not array order (live bug: "SBI se
  // HDFC account me..." picked HDFC because HDFC is first in BANKS).
  let best: { name: string; index: number } | null = null;
  for (const b of BANKS) {
    for (const a of b.aliases) {
      const idx = text.indexOf(a);
      if (idx !== -1 && (!best || idx < best.index)) best = { name: b.name, index: idx };
    }
  }
  return best ? { value: best.name, confidence: 0.9 } : { value: null, confidence: 0 };
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
  // Day: Hindi (parson/kal/aaj) or English (day before yesterday/yesterday/
  // today, last night, tonight, this morning/afternoon/evening).
  const dayOffset = /day before yesterday/.test(text) ? -2
    : /last night/.test(text) ? -1
    : /yesterday/.test(text) ? -1
    : /today|tonight|this (morning|afternoon|evening|night)/.test(text) ? 0
    : /parson/.test(text) ? -2 : /kal/.test(text) ? -1 : /aaj/.test(text) ? 0 : null;
  // Hour: digits or Hindi words before "baje", or English "7 pm" / "7 o'clock".
  let hour: number | null = null;
  let pm = false;
  const hm = text.match(/(?:(\d{1,2})|([a-z]+))\s*baje/);
  if (hm) {
    hour = hm[1] ? Number(hm[1]) : (ONES[hm[2]] ?? null);
  } else {
    const em = text.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)\b/);
    if (em) {
      hour = Number(em[1]);
      pm = em[2] === 'pm';
    } else {
      const om = text.match(/\b(\d{1,2})\s*o'?clock\b/);
      if (om) hour = Number(om[1]);
    }
  }
  // Part of day, Hindi or English — used when no hour is given.
  const part = /(morning|subah)/.test(text) ? 'morning'
    : /(afternoon|dopahar)/.test(text) ? 'afternoon'
    : /(evening|shaam)/.test(text) ? 'evening'
    : /(night|raat)/.test(text) ? 'night' : null;
  if (dayOffset === null && hour === null && part === null) {
    return { at: { value: null, confidence: 0 }, display: { value: null, confidence: 0 } };
  }
  const date = new Date(now);
  if (dayOffset !== null) date.setDate(date.getDate() + dayOffset);
  if (hour !== null) {
    let h = hour % 12;
    if (pm || /(dopahar|shaam|raat|afternoon|evening|night)/.test(text)) h += 12;
    if (/(subah|morning)/.test(text) && hour === 12) h = 0;
    date.setHours(h, 0, 0, 0);
  } else if (part) {
    // No hour stated, only the part of day: a canonical hour for that
    // part (morning 9, afternoon 3, evening 7, night 10). The display
    // keeps the part word, so no false precision is shown.
    const canonical: Record<string, number> = { morning: 9, afternoon: 15, evening: 19, night: 22 };
    date.setHours(canonical[part], 0, 0, 0);
  } else {
    date.setHours(12, 0, 0, 0);
  }
  const dayWord = dayOffset === 0 ? 'aaj' : dayOffset === -1 ? 'kal' : dayOffset === -2 ? 'parson' : '';
  const partWord = part === 'morning' ? 'subah' : part === 'afternoon' ? 'dopahar' : part === 'evening' ? 'shaam' : part === 'night' ? 'raat' : '';
  const display = `${dayWord}${hour !== null ? `, ${hour} baje` : partWord ? `, ${partWord}` : ''}`.trim();
  const confidence = dayOffset !== null && hour !== null ? 0.85 : 0.6;
  return { at: { value: date, confidence }, display: { value: display || null, confidence } };
}

// OTP/PIN sharing needs a credential word + a sharing verb — and no
// denial nearby. Step 20 (B5): "I did not share any OTP" / "OTP nahi
// diya" were read as sharing, which also suppressed the OTP gap question.
// The denial is checked in a ±40-char window around the first credential
// mention; "nahi to" (otherwise) is not a denial. Mixed clauses
// ("PIN de diya, OTP nahi diya") are beyond this rule — the first
// credential's window decides.
function detectCredentialShared(text: string): boolean {
  if (!/(otp|pin|cvv|password)/.test(text)) return false;
  if (!/(manga|maanga|bata|diya|bheja|share|install|le liya|leliya)/.test(text)) return false;
  const idx = text.search(/(otp|pin|cvv|password)/);
  const window = text
    .slice(Math.max(0, idx - 40), idx + 40)
    .replace(/nahi\s+to|nahin\s+to/g, ' ');
  if (/\b(not|never|didn'?t|did\s+not|nahi|nahin|mat|no)\b/.test(window)) return false;
  return true;
}
// Step 21 (H1): the old masker only hid 4–6 digit numbers spoken right
// after otp/pin/cvv/password — a bare 16-digit card, a 12-digit Aadhaar or
// a bare 6-digit OTP was stored in plain text in the transcript. Now:
// - 16-digit runs (card) -> only the last 4 survive.
// - 12-digit runs (Aadhaar) -> only the last 4 survive, EXCEPT when a UTR
//   word (utr/reference/transaction id/txn) sits within 20 chars before
//   the run — the UTR must stay readable so extractIncident can still
//   parse it. An unlabelled 12-digit run is masked: it is more likely an
//   Aadhaar than a UTR, and masking also stops parseUtr reading the first
//   12 digits of a card number as a fake UTR.
// - bare 6-digit runs (OTP) -> masked, unless a money word sits within 12
//   chars either side ("250000 rupaye" is an amount, not an OTP).
export function maskCredentials(text: string): { text: string; masked: boolean } {
  let masked = false;
  let out = text.replace(/((?:otp|pin|cvv|password)[^\d]{0,15})(\d{4,6})/gi, (_m, pre: string, digits: string) => {
    masked = true;
    return pre + '•'.repeat(digits.length);
  });
  // 16-digit card runs first — a 12-digit match must never eat a card prefix.
  out = out.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (m) => {
    masked = true;
    return `•••• •••• •••• ${m.replace(/[\s-]/g, '').slice(-4)}`;
  });
  // 12-digit runs: keep only the last 4, unless a UTR word is nearby.
  out = out.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (m, offset: number, full: string) => {
    if (/(utr|reference|transaction ?id|txn)/i.test(full.slice(Math.max(0, offset - 20), offset))) {
      return m;
    }
    masked = true;
    return `•••• •••• ${m.replace(/[\s-]/g, '').slice(-4)}`;
  });
  // Bare 6-digit runs: an OTP unless a money word is next to it.
  out = out.replace(/\b\d{6}\b/g, (m, offset: number, full: string) => {
    const near = full.slice(Math.max(0, offset - 12), offset + m.length + 12);
    if (/(rupaye|rupee|\brs\b|hazaar|lakh|thousand|paisa)/i.test(near)) return m;
    masked = true;
    return '••••••';
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
  const credentialShared = detectCredentialShared(text);
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
