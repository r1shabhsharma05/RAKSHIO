import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { BackButton, copyText } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Step 21 (#12): the one screen to show a recovery scammer. No incident
// needed — it must work the second the phone rings, before any report
// exists. Three rules in huge type, a 1930 button, and the caller's
// number copied for the Chakshu report. The card states the rule, never
// a verdict about a person, and never claims showing it stops the scammer.
export function DoNotPayScreen({ onBack }: { onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [number, setNumber] = useState('');
  const showToast = useToast();

  async function copyNumber() {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 6) return;
    if (await copyText(digits)) showToast(t(lang, 'portalCopyToast', { label: t(lang, 'dnpNumberLabel') }));
    else showToast(t(lang, 'portalCopyFail'));
  }

  return (
    <>
      <section className="rk-card" aria-label={t(lang, 'navDoNotPay')}>
        <h2 className="dnp-big">{t(lang, 'dnpTitle')}</h2>
        <p className="dnp-big">{t(lang, 'dnpRule1')}</p>
        <p className="dnp-big">{t(lang, 'dnpRule2')}</p>
        <p className="dnp-big">{t(lang, 'dnpRule3')}</p>
      </section>

      <Button label={t(lang, 'coachCallBtn')} variant="destructive" size="lg" width="100%" href="tel:1930" />

      <section className="rk-card">
        <label htmlFor="dnp-number" className="rk-label">{t(lang, 'dnpNumberLabel')}</label>
        <input
          id="dnp-number"
          className="rk-input"
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t(lang, 'dnpNumberPlaceholder')}
        />
        <button type="button" className="rk-primary-btn" disabled={number.replace(/\D/g, '').length < 6} onClick={copyNumber}>
          {t(lang, 'dnpCopyBtn')}
        </button>
        <p>
          <a href="https://sancharsaathi.gov.in" target="_blank" rel="noopener noreferrer">{t(lang, 'dnpChakshuLink')}</a>
        </p>
      </section>

      <p className="note">{t(lang, 'dnpNote')}</p>
      <BackButton onBack={onBack} />
    </>
  );
}
