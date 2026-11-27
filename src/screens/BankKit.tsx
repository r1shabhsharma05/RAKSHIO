import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { BANKS, bankDraft, findBank, loadBankRef, saveBankRef } from '../engines/banks/banks';
import { BackButton } from './shared';
import { useToast } from '../components/Toast';

// Bank Alert Kit: helpline (verified numbers only), block steps, a pre-filled
// draft the user reviews before sending anywhere, and a reference-number
// field. RAKSHIO never sends the draft — there is no send button.
export function BankKitScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const initial = findBank(stored.bank);
  const [selected, setSelected] = useState(initial?.name ?? BANKS[0].name);
  const [draft, setDraft] = useState(() => bankDraft(stored));
  const [ref, setRef] = useState(() => loadBankRef(stored.id));
  const [refSaved, setRefSaved] = useState(false);
  const bank = BANKS.find((b) => b.name === selected) ?? BANKS[0];
  const showToast = useToast();

  // Switching bank re-fills the draft from the NEW bank (live bug: the draft
  // kept saying HDFC after switching to SBI). The draft is a pre-fill — the
  // user can still edit it by hand afterwards.
  function changeBank(name: string) {
    setSelected(name);
    if (name !== '__other') setDraft(bankDraft(stored, name));
  }

  function saveRef() {
    saveBankRef(stored.id, ref.trim());
    setRefSaved(true);
    showToast('Reference number save ho gaya');
  }

  return (
    <>
      <h1>Bank Alert Kit</h1>
      <p>Bank ko suchit karein — dispute darj hoga, aur reference number milega.</p>

      <section className="rk-card">
        <label htmlFor="bank-select" className="rk-label">Bank chunein</label>
        <select id="bank-select" className="rk-input" value={selected} onChange={(e) => changeBank(e.target.value)}>
          {BANKS.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
          <option value="__other">Mera bank list me nahi hai</option>
        </select>
        {selected === '__other' ? (
          <p>Apne bank ka number bank ki official website ya card ke peeche se lein — Google se mila number pehle verify karein.</p>
        ) : (
          <>
            <h2>Helpline</h2>
            {bank.numbers.map((n) => (
              <Button key={n} label={`${bank.name}: ${n} par call karein`} variant="destructive" size="lg" width="100%" href={`tel:${n.replace(/\s/g, '')}`} />
            ))}
            <p>{bank.blockSteps}</p>
          </>
        )}
      </section>

      <section className="rk-card">
        <h2>Bank ko draft (review karke bhejein)</h2>
        <p className="note-strong">Bhejne se pehle padh lein — RAKSHIO ye draft kahin nahi bhejta.</p>
        <textarea className="rk-input" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Bank draft" />
        <label htmlFor="bank-ref" className="rk-label">Bank reference number (call ke baad milega)</label>
        <input
          id="bank-ref"
          className="rk-input"
          value={ref}
          onChange={(e) => { setRef(e.target.value); setRefSaved(false); }}
          placeholder="Jaise: SR123456789"
        />
        <button type="button" className="rk-primary-btn" disabled={ref.trim().length < 1} onClick={saveRef}>
          Reference number save karein
        </button>
        {refSaved && <p role="status" className="status-ok">✓ Reference number save ho gaya.</p>}
        <a href="https://www.npci.org.in/" target="_blank" rel="noopener noreferrer">NPCI — UPI help</a>
      </section>
      <BackButton onBack={onBack} />
    </>
  );
}
