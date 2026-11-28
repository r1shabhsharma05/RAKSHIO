import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { BANKS, bankBlockSteps, bankDraft, findBank, loadBankRef, saveBankRef } from '../engines/banks/banks';
import { BackButton } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Bank Alert Kit: helpline (verified numbers only), block steps, a pre-filled
// draft the user reviews before sending anywhere, and a reference-number
// field. RAKSHIO never sends the draft — there is no send button.
export function BankKitScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const initial = findBank(stored.bank);
  const [selected, setSelected] = useState(initial?.name ?? BANKS[0].name);
  const [draft, setDraft] = useState(() => bankDraft(stored, lang));
  const [ref, setRef] = useState(() => loadBankRef(stored.id));
  const [refSaved, setRefSaved] = useState(false);
  const bank = BANKS.find((b) => b.name === selected) ?? BANKS[0];
  const showToast = useToast();

  // Switching bank re-fills the draft from the NEW bank (live bug: the draft
  // kept saying HDFC after switching to SBI). The draft is a pre-fill — the
  // user can still edit it by hand afterwards.
  function changeBank(name: string) {
    setSelected(name);
    if (name !== '__other') setDraft(bankDraft(stored, lang, name));
  }

  function saveRef() {
    saveBankRef(stored.id, ref.trim());
    setRefSaved(true);
    showToast(t(lang, 'bankRefToast'));
  }

  return (
    <>
      <p>{t(lang, 'bankIntro')}</p>

      <section className="rk-card">
        <label htmlFor="bank-select" className="rk-label">{t(lang, 'bankSelectLabel')}</label>
        <select id="bank-select" className="rk-input" value={selected} onChange={(e) => changeBank(e.target.value)}>
          {BANKS.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
          <option value="__other">{t(lang, 'bankOtherOption')}</option>
        </select>
        {selected === '__other' ? (
          <p>{t(lang, 'bankOtherNote')}</p>
        ) : (
          <>
            <h2>{t(lang, 'bankHelplineTitle')}</h2>
            {bank.numbers.map((n) => (
              <Button key={n} label={t(lang, 'bankCallBtn', { bank: bank.name, n })} variant="destructive" size="lg" width="100%" href={`tel:${n.replace(/\s/g, '')}`} />
            ))}
            {bank.chargeable && <p className="db-muted">{t(lang, 'bankChargeNote')}</p>}
            <p>{bankBlockSteps(bank, lang)}</p>
          </>
        )}
      </section>

      <section className="rk-card">
        <h2>{t(lang, 'bankDraftTitle')}</h2>
        <p className="note-strong">{t(lang, 'bankDraftWarn')}</p>
        <textarea className="rk-input" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Bank draft" />
        <label htmlFor="bank-ref" className="rk-label">{t(lang, 'bankRefLabel')}</label>
        <input
          id="bank-ref"
          className="rk-input"
          value={ref}
          onChange={(e) => { setRef(e.target.value); setRefSaved(false); }}
          placeholder={t(lang, 'bankRefPlaceholder')}
        />
        <button type="button" className="rk-primary-btn" disabled={ref.trim().length < 1} onClick={saveRef}>
          {t(lang, 'bankRefSaveBtn')}
        </button>
        {refSaved && <p role="status" className="status-ok">{t(lang, 'bankRefSaved')}</p>}
        <a href="https://www.npci.org.in/" target="_blank" rel="noopener noreferrer">NPCI — UPI help</a>
      </section>
      <BackButton onBack={onBack} />
    </>
  );
}
