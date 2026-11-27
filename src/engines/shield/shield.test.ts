import { describe, expect, it } from 'vitest';
import { analyzeShield } from './shield';

// 50-message test set: 20 danger, 15 suspicious, 15 safe.
// Target: 90%+ (45/50). The set deliberately includes the hard cases:
// legit bank OTP warnings ("do not share your OTP") must stay safe,
// and a delivered-parcel message must stay safe at the courier boundary.
const CASES: { text: string; expected: 'danger' | 'suspicious' | 'safe' }[] = [
  // danger (20)
  { text: 'Aapka OTP 482913 hai, turant batao warna account band ho jayega', expected: 'danger' },
  { text: 'Refund ke liye pehle 500 rupaye processing fee jama karein, paisa wapas guarantee hai', expected: 'danger' },
  { text: 'Main cyber crime officer bol raha hoon, digital arrest hoga, turant AnyDesk install karo', expected: 'danger' },
  { text: 'Recovery agent hoon, aapka paisa wapas karwa dunga, pehle 2000 advance fee bhej do', expected: 'danger' },
  { text: 'UPI collect request approve karo, paise lene ke liye PIN daalo', expected: 'danger' },
  { text: 'KYC update nahi kiya to account block ho jayega, link par click karo', expected: 'danger' },
  { text: 'Lottery me 5 lakh jeet gaye, claim karne ke liye pehle 1000 fee jama karo', expected: 'danger' },
  { text: 'Aapka account suspend hoga, KYC link par turant click karo, OTP batao', expected: 'danger' },
  { text: 'TeamViewer install karo, main aapka refund process karunga, processing fee 999 pay karo', expected: 'danger' },
  { text: 'RBI se bol raha hoon, aapke account se galat transaction hua, turant OTP share karo', expected: 'danger' },
  { text: 'Cashback claim karne ke liye link par click karo aur OTP batao', expected: 'danger' },
  { text: 'Aapka paisa wapas milega, recovery agent ko advance fee bhejo, 100% guarantee', expected: 'danger' },
  { text: 'Screen share karo, main bank se hoon, OTP batao, turant karo warna account band', expected: 'danger' },
  { text: 'Digital arrest warrant aaya hai, court case hoga, turant paisa jama karo warna police aayegi', expected: 'danger' },
  { text: 'Inaam jeet gaye, 10 lakh prize, pehle tax fee 5000 bhejo', expected: 'danger' },
  { text: 'Aapka UPI PIN expire ho gaya, naya PIN batao aur turant update karo', expected: 'danger' },
  { text: 'Refund process ke liye AnyDesk download karo aur OTP share karo', expected: 'danger' },
  { text: 'CBI officer hoon, aapke khilaf case hai, paisa wapas chahiye to pehle fee bharo', expected: 'danger' },
  { text: 'Job ke liye select hue ho, joining fee 2000 pehle jama karo, turant karo', expected: 'danger' },
  { text: 'Aapke account se 50000 katne wale hain, rokne ke liye turant OTP batao', expected: 'danger' },
  // suspicious (15)
  { text: 'KYC update karein, link par click karein', expected: 'suspicious' },
  { text: 'Aapne lottery jeeti hai, prize claim karne ke liye link kholein', expected: 'suspicious' },
  { text: 'Aapka account block ho jayega, turant contact karein', expected: 'suspicious' },
  { text: 'RBI se message hai, account verify karne ke liye link par click karein', expected: 'suspicious' },
  { text: 'Cashback claim karein turant, offer aaj hi khatm ho raha hai', expected: 'suspicious' },
  { text: 'Aapka courier ruk gaya hai, link par click karke address update karein', expected: 'suspicious' },
  { text: 'Aapka card block ho gaya hai, turant call karein', expected: 'suspicious' },
  { text: 'Aapka electricity bill pending hai, connection kat jayega, turant pay karein', expected: 'suspicious' },
  { text: 'WhatsApp par aapko job offer mila hai, details ke liye link kholein', expected: 'suspicious' },
  { text: 'Aapke naam par loan approve hua hai, details ke liye is link par click karein', expected: 'suspicious' },
  { text: 'Police verification ke liye aapka Aadhaar number chahiye', expected: 'suspicious' },
  { text: 'Aapka SIM block ho jayega, KYC ke liye turant call karein', expected: 'suspicious' },
  { text: 'Aapka account verify nahi hua, 24 ghante me band ho jayega', expected: 'suspicious' },
  { text: 'Mujhe aapke account me paise bhejne hain, aapka UPI ID turant batao', expected: 'suspicious' },
  { text: 'Aapka PAN card block hone wala hai, update ke liye link kholein', expected: 'suspicious' },
  // safe (15)
  { text: 'Aapke account me ₹500 credit hue. SBI', expected: 'safe' },
  { text: 'Your OTP is 482913. Do not share it with anyone.', expected: 'safe' },
  { text: 'Aapka OTP 482913 hai. Kisi ko mat batao.', expected: 'safe' },
  { text: 'Kal subah 10 baje aapki flight hai. Safe journey!', expected: 'safe' },
  { text: 'Aapka order deliver ho gaya hai. Dhanyavaad!', expected: 'safe' },
  { text: 'Your parcel has been delivered. Thank you!', expected: 'safe' },
  { text: 'Bank se suchna: kabhi apna OTP kisi ke saath share na karein.', expected: 'safe' },
  { text: 'Aapki EMI ₹5,000 kal due hai. Auto-debit hoga.', expected: 'safe' },
  { text: 'Namaste, main Ramesh hoon, kal milte hain chai par.', expected: 'safe' },
  { text: 'Aapka electricity bill ₹850 hai. Due date 30 Nov.', expected: 'safe' },
  { text: 'SBI: aapke account se ₹2000 debit hue. Shesh balance ₹15,000.', expected: 'safe' },
  { text: 'Aapka Aadhaar card update ho gaya hai. Dhanyavaad.', expected: 'safe' },
  { text: 'Interview kal 11 baje hai. Documents saath le aayein.', expected: 'safe' },
  { text: 'Aapka UPI PIN safal taur par badal gaya hai.', expected: 'safe' },
  { text: 'Happy birthday! Aapka din shubh ho.', expected: 'safe' },
];

describe('Second-Scam Shield 2.0 — 50-message test set', () => {
  it('scores 90%+ (45/50) correct', () => {
    const wrong = CASES.filter((c) => analyzeShield(c.text).level !== c.expected);
    for (const w of wrong) {
      // eslint-disable-next-line no-console
      console.log(`MISS (${w.expected}): got ${analyzeShield(w.text).level} — ${w.text}`);
    }
    expect(CASES.length - wrong.length).toBeGreaterThanOrEqual(45);
  });

  it('a danger message explains itself on the Truth Card', () => {
    const v = analyzeShield('Turant OTP batao, warna account band ho jayega');
    expect(v.level).toBe('danger');
    expect(v.flags.length).toBeGreaterThanOrEqual(2);
    expect(v.truth.length).toBeGreaterThan(10);
    expect(v.advice.length).toBeGreaterThan(10);
  });

  it('a plain OTP notification scores 0 but shows the OTP info note', () => {
    const v = analyzeShield('Your OTP is 482913. Do not share it with anyone.');
    expect(v.level).toBe('safe');
    expect(v.score).toBe(0);
    expect(v.otpNote).toBe('OTP dikh raha hai — kisi se share mat karein.');
    expect(analyzeShield('Koi message bina OTP ke').otpNote).toBeUndefined();
  });
});
