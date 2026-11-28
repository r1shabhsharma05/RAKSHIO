// Situation Guide engine — deterministic, on-device, rule-based guidance.
// No model, no AI, no server, no data leaves the device: every guide is a
// fixed, reviewed list of steps for one fraud situation. The extractor and
// the Shield map onto these guides; nothing here is generated or guessed.
//
// Numbers used are only the established official windows (1930 turant — pehle 4 ghante me sabse behtar,
// portal ≤24h, bank ≤3 working days) — never recovery promises.
export type GuideCategory = 'money-lost' | 'no-loss' | 'account' | 'message';

export interface SituationGuide {
  id: string;
  title: string;
  // Filter category: money lost, no loss (attempt only), account access,
  // or a threatening call/message.
  category: GuideCategory;
  // Why the first minutes matter — only the official windows (1930 turant — pehle 4 ghante me sabse behtar,
  // portal ≤24h, bank ≤3 working days), never a recovery promise.
  timeNote: string;
  // Other guides that often follow this one (e.g. OTP scam → recovery scam).
  related: string[];
  // The three most common situations, pinned first on the guide list.
  common?: boolean;
  recognize: string[];
  firstFiveMinutes: string[];
  reportSteps: string[];
  dontDo: string[];
  evidence: string[];
}

const REPORT_1930 = '1930 par call karein — turant, pehle 4 ghante me sabse behtar';
const REPORT_PORTAL = 'cybercrime.gov.in par 24 ghante me complaint likhein';
const REPORT_BANK = 'Bank me likhit dispute dein — 3 working days ke andar';
const REPORT_ACK = 'Ack number sambhal kar rakhein — har jagah wahi kaam aayega';

export const GUIDES: SituationGuide[] = [
  {
    id: 'upi-fraud',
    title: 'UPI fraud / bina permission debit',
    category: 'money-lost',
    timeNote: 'turant 1930 par call karein — pehle 4 ghante me sabse behtar. Bank dispute 3 working days ke andar.',
    related: ['qr-scam', 'phishing-link'],
    common: true,
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
    category: 'money-lost',
    timeNote: 'OTP share hote hi scammer ke paas access hai — turant block karein, phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['refund-scam', 'fake-customer-care'],
    common: true,
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
    category: 'money-lost',
    timeNote: 'Screen-share app turant hatayein — phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['remote-access', 'otp-scam'],
    common: true,
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
    category: 'money-lost',
    timeNote: 'Login karte hi paisa kat sakta hai — turant password badlein, phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['upi-fraud', 'kyc-scam'],
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
    category: 'account',
    timeNote: 'Agar OTP de diya ho to turant card block karein — phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['phishing-link', 'otp-scam'],
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
    category: 'money-lost',
    timeNote: 'Recovery agent ko ek bhi rupaya mat dijiye — dusre scam ki report bhi 1930 par karein.',
    related: ['otp-scam', 'investment-scam'],
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
    category: 'money-lost',
    timeNote: 'Aur paisa mat dijiye — turant 1930 par report karein — pehle 4 ghante me sabse behtar, bank ko bhi batayein.',
    related: ['refund-scam', 'job-scam'],
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
    category: 'account',
    timeNote: 'SIM block sabse pehla kadam hai — OTP aane ka intezaar mat karein. Phir 1930 par report karein.',
    related: ['upi-fraud', 'otp-scam'],
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
    category: 'money-lost',
    timeNote: 'QR scan karte hi paisa kata — turant block karein, phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['upi-fraud', 'phishing-link'],
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
    category: 'money-lost',
    timeNote: 'Fee de di ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['loan-app-scam', 'investment-scam'],
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
    category: 'money-lost',
    timeNote: 'Dhamki se darr kar paisa mat dijiye — harassment ki report 1930 par karein.',
    related: ['job-scam', 'digital-arrest'],
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
    category: 'no-loss',
    timeNote: 'Paise nahi gaye — koi deadline nahi hai. Phir bhi 1930 par report karein, isse dusre log bachte hain.',
    related: ['otp-scam', 'phishing-link'],
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
    category: 'message',
    timeNote: 'Digital arrest jaisa koi kaanoon nahi hai — call kaatte hi khatra khatm. Report 1930 par karein.',
    related: ['loan-app-scam', 'kyc-scam'],
    common: true,
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
    category: 'account',
    timeNote: 'Screen-share band karte hi access tootta hai — turant app hatayein, phir 1930 par report karein.',
    related: ['fake-customer-care', 'otp-scam'],
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
  {
    id: 'courier-scam',
    title: 'Parcel / courier dhokha',
    category: 'money-lost',
    timeNote: 'Parcel ke naam par paisa gaya ho to turant bank ko batayein — phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['phishing-link', 'delivery-fee-scam'],
    common: true,
    recognize: [
      "Call/SMS: 'aapka parcel ruka hai — customs fee bharni hai'",
      "'Parcel me drugs mile hain' kehkar dhamkaya gaya",
      'Fee bharne ke liye link ya UPI ID bheji gayi',
    ],
    firstFiveMinutes: [
      'Fee mat bharin — courier company kabhi call par fee nahi mangti',
      'Tracking number official site/app par khud check karein',
      'Number ko block karein, message delete karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Customs clearance' ke naam par paisa mat dijiye",
      'Parcel ke dar se kisi link par login mat karein',
    ],
    evidence: [
      'SMS/call ka screenshot',
      'Mangi gayi fee + UPI ID/link',
      'Payment ka proof agar de diya ho',
    ],
  },
  {
    id: 'lottery-scam',
    title: 'Lottery / prize dhokha',
    category: 'money-lost',
    timeNote: 'Prize ke naam par fee de di ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['refund-scam', 'phishing-link'],
    recognize: [
      "'Aapne lottery jeeti hai' — par aapne kabhi ticket kharida hi nahi",
      "'Prize lene ke liye processing fee bharni hogi'",
      'WhatsApp par certificate ya cheque ki photo bheji',
    ],
    firstFiveMinutes: [
      'Fee mat dijiye — asli prize me pehle fee nahi lagti',
      'Number ko block karein',
      'Agar paisa de diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Tax' ya 'processing fee' ke naam par paisa mat dijiye",
      'Prize ke lalach me OTP/PIN mat dijiye',
    ],
    evidence: [
      'Message + certificate ki photo ka screenshot',
      'Number aur UPI ID',
      'Payment ka proof',
    ],
  },
  {
    id: 'electricity-scam',
    title: 'Bijli bill / connection kaatne ki dhamki',
    category: 'money-lost',
    timeNote: 'Bill ke naam par paisa gaya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['kyc-scam', 'phishing-link'],
    recognize: [
      "SMS: 'aaj raat bijli kaat di jayegi — bill update karein'",
      'Link bheja — bijli vibhag jaisi fake site',
      'Payment ke liye turant UPI karne ko kaha',
    ],
    firstFiveMinutes: [
      'Link par click mat karein — bijli vibhag SMS se payment nahi mangta',
      'Bill official app/website par khud check karein',
      'Agar payment kar diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Connection kaatne' ki dhamki par ghabra kar payment mat karein",
      'SMS wale link par login mat karein',
    ],
    evidence: [
      'SMS ka screenshot',
      'Fake site ka link',
      'Payment ka proof',
    ],
  },
  {
    id: 'matrimonial-scam',
    title: 'Shaadi / matrimonial dhokha',
    category: 'money-lost',
    timeNote: 'Shaadi ke naam par paisa gaya ho to saboot sambhalein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['romance-scam', 'refund-scam'],
    recognize: [
      'Matrimonial site par "rishta" — jaldi shaadi ka dabav',
      "'Shaadi se pehle gift/fee bhej dijiye'",
      'Profile ki photo aur kahani me antar',
    ],
    firstFiveMinutes: [
      'Paisa mat bhejiye — shaadi ke naam par advance nahi hota',
      'Profile ki photo reverse-search karke dekhein',
      'Site par profile report karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Rishta pakka karne' ke liye paisa mat dijiye",
      'Bank details ya Aadhaar share mat karein',
    ],
    evidence: [
      'Chat ke screenshots',
      'Profile ka link/screenshot',
      'Payment ka proof',
    ],
  },
  {
    id: 'romance-scam',
    title: 'Romance / dating dhokha',
    category: 'money-lost',
    timeNote: 'Bharose me aakar paisa bhej diya ho to saboot sambhalein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['matrimonial-scam', 'sextortion-scam'],
    recognize: [
      'Online "rishta" — milne se pehle hi paisa manga',
      "'Emergency hai — abhi paisa bhej do'",
      'Video call par milne se hamesha mana',
    ],
    firstFiveMinutes: [
      'Aur paisa mat bhejiye — emergency ki kahani aksar jhooth hoti hai',
      'Parivar ke bharosemand ko batayein',
      'Chat ke screenshots lein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Bharose me aakar baar-baar paisa mat bhejiye',
      'Apni private photo/video share mat karein',
    ],
    evidence: [
      'Chat ke screenshots',
      'Profile ka link',
      'Har payment ka proof',
    ],
  },
  {
    id: 'tech-support-scam',
    title: 'Nakli tech support pop-up',
    category: 'account',
    timeNote: 'Pop-up par call kar di ho to koi app install mat karein — remote access mile to turant app hatayein, phir 1930 par report karein.',
    related: ['remote-access', 'fake-customer-care'],
    recognize: [
      "Screen par pop-up: 'aapka computer/phone virus se bhara hai'",
      'Pop-up me "support" ka number diya',
      "Call par 'technician' ne app install karwaya",
    ],
    firstFiveMinutes: [
      'Pop-up band karein — browser/app ko turant close karein',
      'Koi app install mat karein, remote access mat dein',
      'Agar app install ho gayi ho to turant uninstall karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Pop-up wale number par call mat karein',
      "'Virus saaf karne' ke liye paisa mat dijiye",
    ],
    evidence: [
      'Pop-up ka screenshot',
      'Number aur app ka naam',
      'Payment ka proof agar diya ho',
    ],
  },
  {
    id: 'sextortion-scam',
    title: 'Video-call blackmail (sextortion)',
    category: 'message',
    timeNote: 'Blackmail ki dhamki se darr kar paisa mat dijiye — turant 1930 par report karein, video kahin bhi ho tab bhi.',
    related: ['romance-scam', 'digital-arrest'],
    recognize: [
      'Video call par achanak ashleel video — phir blackmail',
      "'Paisa nahi diya to video sabko bhej dunga'",
      'Aapki photo/video se morphed clip banaya',
    ],
    firstFiveMinutes: [
      'Paisa mat dijiye — dene se blackmail nahi rukta, badhta hai',
      'Dhamki wale messages ke screenshots lein',
      'Parivar ya bharosemand ko turant batayein — sharm se chhupana scammer ki jeet hai',
    ],
    reportSteps: [
      '1930 par report karein — blackmail bhi likhein',
      'cybercrime.gov.in par complaint karein',
      'Social media par us account ko report + block karein',
      REPORT_ACK,
    ],
    dontDo: [
      'Blackmail se darr kar paisa mat dijiye',
      'Scammer se behes ya baatchit mat badhayein',
    ],
    evidence: [
      'Dhamki wale messages ke screenshots',
      'Caller ka number/profile link',
      'Video/call ka time',
    ],
  },
  {
    id: 'card-reward-scam',
    title: 'Card reward-points / card-block dhokha',
    category: 'money-lost',
    timeNote: 'Reward-points ke naam par OTP de diya ho to turant card block karein — phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['kyc-scam', 'otp-scam'],
    recognize: [
      "SMS/call: 'aapke reward points expire ho rahe hain'",
      "'Card block ho gaya hai — unblock ke liye OTP dijiye'",
      'Reward redeem karne ke liye link bheja',
    ],
    firstFiveMinutes: [
      'Link par click mat karein — bank SMS se reward redeem nahi karwata',
      'Card ke peeche likhe official number par khud call karein',
      'Agar OTP de diya ho to turant card block karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Reward ke naam par OTP/CVV mat dijiye',
      "'Card block' ki dhamki par ghabra kar login mat karein",
    ],
    evidence: [
      'SMS ka screenshot',
      'Fake link',
      'Transaction ka proof',
    ],
  },
  {
    id: 'olx-buyer-scam',
    title: 'OLX buyer dhokha',
    category: 'money-lost',
    timeNote: 'Saman bechte hue paisa gaya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['upi-collect-scam', 'qr-scam'],
    recognize: [
      'Buyer turant deal pakki karta hai — bina dekhe',
      "'Payment bhej diya' kehkar fake screenshot bhejta hai",
      "Paise lene ke liye QR scan ya '₹1 bhej ke verify karo' kehta hai",
    ],
    firstFiveMinutes: [
      'Paise lene ke liye QR scan mat karein, PIN mat dijiye',
      'Payment apne bank app me khud check karein — screenshot par bharosa mat karein',
      'Saman tab tak mat dijiye jab tak paisa account me na dikhe',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Paise lene ke liye kabhi PIN mat dijiye',
      'Fake payment screenshot par bharosa mat karein',
    ],
    evidence: [
      'Chat ke screenshots',
      'Fake payment screenshot',
      'Buyer ka number + UPI ID',
    ],
  },
  {
    id: 'upi-collect-scam',
    title: 'UPI collect-request dhokha',
    category: 'money-lost',
    timeNote: 'Collect request approve karte hi paisa kata — turant block karein, phir turant 1930 par call karein — pehle 4 ghante me sabse behtar.',
    related: ['upi-fraud', 'olx-buyer-scam'],
    recognize: [
      'UPI app me "collect request" aayi — paise aane ke bajaye jaane wali thi',
      "'Payment lene ke liye approve karein' kaha gaya",
      'Request approve karte hi paisa kat gaya',
    ],
    firstFiveMinutes: [
      'Collect request ko approve mat karein — reject karein',
      'Turant UPI PIN badlein, bank ko batayein',
      'Request bhejne wale ko block karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Anjaan collect request kabhi approve mat karein',
      'Paise lene ke liye PIN mat dijiye',
    ],
    evidence: [
      'Collect request ka screenshot',
      'Request bhejne wale ki UPI ID',
      'Transaction ka screenshot (UTR)',
    ],
  },
  {
    id: 'delivery-fee-scam',
    title: 'Delivery fee / address-update dhokha',
    category: 'money-lost',
    timeNote: 'Delivery fee ke naam par paisa gaya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['courier-scam', 'phishing-link'],
    recognize: [
      "SMS: 'address galat hai — ₹25 fee bhar kar update karein'",
      'Chhoti fee ke liye link bheja — login + card details mangi',
      'Fee bharte hi bada amount kat gaya',
    ],
    firstFiveMinutes: [
      'Link par click mat karein — delivery company SMS se fee nahi mangti',
      'Order official app par khud check karein',
      'Agar payment kar diya ho to turant card block karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Chhoti fee ke lalach me card details mat dijiye',
      'SMS wale link par login mat karein',
    ],
    evidence: [
      'SMS ka screenshot',
      'Fake link',
      'Transaction ka proof',
    ],
  },
  {
    id: 'crypto-scam',
    title: 'Crypto / fake trading-app dhokha',
    category: 'money-lost',
    timeNote: 'Aur paisa mat dijiye — turant 1930 par report karein — pehle 4 ghante me sabse behtar, bank ko bhi batayein.',
    related: ['investment-scam', 'refund-scam'],
    recognize: [
      "'Crypto me guaranteed profit' — fake trading app",
      'App me profit dikh raha hai, par withdrawal nahi ho raha',
      "'Withdrawal ke liye tax/fee bharni hogi'",
    ],
    firstFiveMinutes: [
      "Aur paisa mat dijiye — 'withdrawal fee' hi scam hai",
      'App se logout karein, linked bank account par nazar rakhein',
      'Bank ko batayein — account freeze karwayein agar paisa gaya ho',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Withdrawal fee' ya 'tax' ke naam par aur paisa mat dijiye",
      "App ke 'profit' screen par bharosa mat karein",
    ],
    evidence: [
      'App ka naam + screenshots',
      'Chat ke screenshots',
      'Har payment ka proof (UTR)',
    ],
  },
  {
    id: 'visa-scam',
    title: 'Nakli visa / immigration agent',
    category: 'money-lost',
    timeNote: 'Visa ke naam par paisa gaya ho to saboot sambhalein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['job-scam', 'refund-scam'],
    recognize: [
      "'Visa guarantee' — bina interview ke",
      "'Processing fee' pehle, phir 'embassy fee', phir 'medical fee'",
      'Agent ka office ya license verify nahi hota',
    ],
    firstFiveMinutes: [
      'Aur paisa mat dijiye — fee ki list badhti hi jayegi',
      'Agent ka license/registration official site par check karein',
      'Passport/details ki copy kahan-kahan di, note karein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Visa guarantee' par bharosa mat karein",
      'Original passport/documents kisi agent ko mat dijiye',
    ],
    evidence: [
      'Agent ka naam, number, office address',
      'Chat + receipts ke screenshots',
      'Har payment ka proof',
    ],
  },
  {
    id: 'rental-scam',
    title: 'Nakli rental / property listing',
    category: 'money-lost',
    timeNote: 'Advance de diya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['olx-buyer-scam', 'upi-fraud'],
    recognize: [
      'Bazaar se bahut sasta flat/room — "turant token bharo"',
      'Ghar dekhe bina advance manga',
      "'Owner bahar hai — pehle token, phir chabi'",
    ],
    firstFiveMinutes: [
      'Ghar dekhe bina advance mat dijiye',
      'Listing ki photo reverse-search karke dekhein',
      'Agar advance de diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Bina ghar dekhe token/advance mat dijiye',
      'Saste ke lalach me jaldi mat karein',
    ],
    evidence: [
      'Listing ka screenshot + link',
      'Chat ke screenshots',
      'Payment ka proof',
    ],
  },
  {
    id: 'gift-card-scam',
    title: 'Gift-card / voucher dhokha',
    category: 'money-lost',
    timeNote: 'Gift card ka code de diya ho to turant card company ko batayein — 1930 par bhi report karein.',
    related: ['digital-arrest', 'refund-scam'],
    recognize: [
      "'Payment gift card se karo' — koi bhi kaam ho",
      'Gift card ka code/PIN manga gaya',
      "'Boss/police' kehkar gift card kharidwaya",
    ],
    firstFiveMinutes: [
      'Gift card ka code kisi ko mat dijiye — code dete hi paisa gaya',
      'Card company ko turant batayein — code block ho sakta hai',
      'Receipt sambhal kar rakhein',
    ],
    reportSteps: [
      '1930 par report karein',
      'cybercrime.gov.in par complaint karein',
      'Gift card company ko code + receipt dekar block karwayein',
      REPORT_ACK,
    ],
    dontDo: [
      'Kisi ke kahe par gift card mat kharidein',
      'Gift card ka code/PIN share mat karein',
    ],
    evidence: [
      'Gift card ki receipt',
      'Chat/call ka number',
      'Code bhejne ka proof',
    ],
  },
  {
    id: 'task-scam',
    title: 'Part-time task dhokha (like/rating)',
    category: 'money-lost',
    timeNote: 'Task ke naam par paisa gaya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['job-scam', 'investment-scam'],
    common: true,
    recognize: [
      "'Video like karo, paise kamao' — pehle chhoti payment mili",
      "'Premium task ke liye deposit bharo'",
      'Telegram/WhatsApp par task group',
    ],
    firstFiveMinutes: [
      'Deposit mat dijiye — pehli chhoti payment hi jal hai',
      'Group se bahar niklein, number block karein',
      'Agar paisa de diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Premium task' ke liye deposit mat dijiye",
      'Task ke naam par UPI PIN/OTP mat dijiye',
    ],
    evidence: [
      'Group/chat ke screenshots',
      'Task ki details',
      'Har payment ka proof',
    ],
  },
  {
    id: 'scholarship-scam',
    title: 'Nakli admission / scholarship dhokha',
    category: 'money-lost',
    timeNote: 'Admission/scholarship ke naam par paisa gaya ho to saboot sambhalein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['job-scam', 'refund-scam'],
    recognize: [
      "'Scholarship mil gayi — processing fee bharo'",
      "'Admission pakka — seat booking fee abhi bharo'",
      'Institute ka naam bada, par contact sirf WhatsApp',
    ],
    firstFiveMinutes: [
      'Fee mat dijiye — institute ki official site par khud verify karein',
      'Institute ke official number par call karke poochein',
      'Agar paisa de diya ho to turant bank ko batayein',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      "'Seat khatm ho jayegi' ki jaldi me fee mat dijiye",
      'Scholarship ke naam par bank details mat dijiye',
    ],
    evidence: [
      'Message/letter ka screenshot',
      'Institute ka naam + number',
      'Payment ka proof',
    ],
  },
  {
    id: 'travel-scam',
    title: 'Nakli travel booking dhokha',
    category: 'money-lost',
    timeNote: 'Booking ke naam par paisa gaya ho to turant bank ko batayein — turant 1930 par report karein — pehle 4 ghante me sabse behtar.',
    related: ['olx-buyer-scam', 'refund-scam'],
    recognize: [
      'Saste flight/hotel deal — "aaj hi book karo"',
      'Payment ke baad ticket/confirmation nahi aaya',
      'Booking site ka naam mashhoor jaisa, par nakli',
    ],
    firstFiveMinutes: [
      'Booking official app/site par khud check karein',
      'Agar paisa de diya ho to turant bank ko batayein',
      'Confirmation na aaye to "agent" ko aur paisa mat dijiye',
    ],
    reportSteps: [REPORT_1930, REPORT_PORTAL, REPORT_BANK, REPORT_ACK],
    dontDo: [
      'Saste deal ke lalach me anjaan site par payment mat karein',
      "'Booking confirm karne' ke liye dobara fee mat dijiye",
    ],
    evidence: [
      'Site/app ka naam + link',
      'Chat ke screenshots',
      'Payment ka proof',
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
  // Step 21 (#11): new extractor types point at their own guides.
  'courier-scam': 'courier-scam',
  'task-scam': 'task-scam',
  'crypto-scam': 'crypto-scam',
  'loan-app-scam': 'loan-app-scam',
  'phishing-link': 'phishing-link',
  'unauthorised-debit': 'upi-fraud',
};

// Shield rule ids (src/engines/shield/shield.ts) → guide. Rules with no
// specific guide (urgency, id-demand) map to null; the caller then links
// to the full guide list.
const SHIELD_RULE_TO_GUIDE: Record<string, string> = {
  'otp-demand': 'otp-scam',
  'digital-arrest': 'digital-arrest',
  'advance-fee': 'refund-scam',
  'recovery-promise': 'refund-scam',
  'remote-access': 'remote-access',
  'upi-collect': 'upi-collect-scam',
  'fake-authority': 'digital-arrest',
  'kyc-threat': 'kyc-scam',
  'suspicious-link': 'phishing-link',
  'prize-lottery': 'lottery-scam',
  'courier': 'courier-scam',
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

