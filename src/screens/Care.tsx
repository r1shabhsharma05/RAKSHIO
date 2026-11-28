import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { StoredIncident } from '../state/store';
import { BackButton, formatINR } from './shared';
import { useDashboard } from '../state/dashboardStore';
import { t, whenText } from '../i18n';

// Care Circle: consent first, then a minimal SOS card. The family number is
// used only to build the WhatsApp link — it is never stored. The offline QR
// card works without internet: show the phone screen, or print it.
export function CareScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [consent, setConsent] = useState(false);
  const [number, setNumber] = useState('');
  const [qr, setQr] = useState('');

  // Step 18: the SOS text is sent to family, so it follows the UI language.
  // The time is rebuilt from the stored Date (en/hi) — the stored display
  // string is Hinglish by construction and would leak into an English SOS.
  const sosWhen = stored.fraudAt
    ? whenText(stored.fraudAt, stored.fraudAtDisplay, lang)
    : (lang === 'hg' ? stored.fraudAtDisplay : null);
  const sosText = [
    t(lang, 'sosLine1'),
    stored.amount != null ? t(lang, 'sosAmount', { amount: formatINR(stored.amount) }) : '',
    sosWhen ? t(lang, 'sosTime', { when: sosWhen }) : '',
    t(lang, 'sosLine2'),
    t(lang, 'sosSign'),
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (!consent) return;
    QRCode.toDataURL(sosText, { width: 256, margin: 1 }).then(setQr).catch(() => undefined);
  }, [consent, sosText]);

  const digits = number.replace(/\D/g, '').replace(/^0/, '');
  const waLink = digits.length >= 10 ? `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(sosText)}` : '';

  return (
    <>
      <label className="caregiver-toggle">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t(lang, 'careConsent')}</span>
      </label>

      {consent && (
        <>
          <section className="rk-card">
            <h2>{t(lang, 'careSosTitle')}</h2>
            <p className="script-box">{sosText}</p>
            <label htmlFor="care-number" className="rk-label">{t(lang, 'careNumberLabel')}</label>
            <input
              id="care-number"
              className="rk-input"
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={t(lang, 'careNumberPlaceholder')}
            />
            <p className="note">{t(lang, 'careNumberNote')}</p>
            {waLink && (
              <a className="rk-primary-btn" href={waLink}>{t(lang, 'careSendBtn')}</a>
            )}
          </section>

          <section className="rk-card">
            <h2>{t(lang, 'careQrTitle')}</h2>
            <p>{t(lang, 'careQrNote')}</p>
            {qr && <img src={qr} alt="SOS card QR code" className="qr-img" />}
          </section>
        </>
      )}
      <BackButton onBack={onBack} />
    </>
  );
}
