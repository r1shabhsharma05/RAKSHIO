import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { StoredIncident } from '../state/store';
import { BackButton, formatINR } from './shared';

// Care Circle: consent first, then a minimal SOS card. The family number is
// used only to build the WhatsApp link — it is never stored. The offline QR
// card works without internet: show the phone screen, or print it.
export function CareScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const [consent, setConsent] = useState(false);
  const [number, setNumber] = useState('');
  const [qr, setQr] = useState('');

  const sosText = [
    'Mujhe fraud hua hai — madad chahiye.',
    stored.amount != null ? `Rashi: ${formatINR(stored.amount)}.` : '',
    stored.fraudAtDisplay ? `Samay: ${stored.fraudAtDisplay}.` : '',
    '1930 par call karne me meri madad karein. Kisi ko OTP mat dijiye.',
    '— RAKSHIO se',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (!consent) return;
    QRCode.toDataURL(sosText, { width: 256, margin: 1 }).then(setQr).catch(() => undefined);
  }, [consent, sosText]);

  const digits = number.replace(/\D/g, '').replace(/^0/, '');
  const waLink = digits.length >= 10 ? `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(sosText)}` : '';

  return (
    <>
      <h2>Care Circle — Parivar ko batayein</h2>

      <label className="caregiver-toggle">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Main chahta/chahti hoon ki RAKSHIO mere parivar ko ye SOS card dikhaye. (Sirf ye card share hoga — poora incident nahi.)</span>
      </label>

      {consent && (
        <>
          <section className="rk-card">
            <h2>SOS card preview</h2>
            <p className="script-box">{sosText}</p>
            <label htmlFor="care-number" className="rk-label">Parivar ka WhatsApp number</label>
            <input
              id="care-number"
              className="rk-input"
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Jaise: 98765 43210"
            />
            <p className="note">Ye number save nahi hota — sirf link banane ke liye use hota hai.</p>
            {waLink && (
              <a className="rk-primary-btn" href={waLink}>WhatsApp par SOS bhejein</a>
            )}
          </section>

          <section className="rk-card">
            <h2>Offline QR SOS card</h2>
            <p>Internet na ho to ye QR dikhayein — scan karne par SOS text mil jayega.</p>
            {qr && <img src={qr} alt="SOS card QR code" className="qr-img" />}
          </section>
        </>
      )}
      <BackButton onBack={onBack} />
    </>
  );
}
