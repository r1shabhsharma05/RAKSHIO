import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { formatINR, fraudTypeLabel } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// 1930 Call Coach: big call button + a 30-second script built only from
// confirmed facts + a checklist. "Done" logs that the button was tapped —
// never that the call happened or the complaint was filed.
export function CoachScreen({
  stored,
  onCallTap,
  onDone,
  onOpenAck,
  onBack,
}: {
  stored: StoredIncident;
  onCallTap: () => void;
  onDone: () => void;
  onOpenAck: () => void;
  onBack: () => void;
}) {
  const lang = useDashboard((s) => s.settings.language);
  const [done, setDone] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const showToast = useToast();

  const scriptParts: string[] = ['Namaste, main RAKSHIO app se bol raha hoon.'];
  if (stored.amount != null) scriptParts.push(`Mere account se ${formatINR(stored.amount)} kat gaye.`);
  if (stored.fraudAtDisplay) scriptParts.push(`Ye ${stored.fraudAtDisplay} hua.`);
  if (stored.method) scriptParts.push(`Paise ${stored.method} se gaye.`);
  if (stored.bank) scriptParts.push(`Bank: ${stored.bank}.`);
  if (stored.utr) scriptParts.push(`UTR number: ${stored.utr}.`);
  if (stored.credentialShared) scriptParts.push('Mujhse OTP manga gaya tha.');
  scriptParts.push('Kripya meri shikayat darj karein aur fund freeze me madad karein.');
  const script = scriptParts.join(' ');

  const checklist: { id: string; label: string }[] = [
    { id: 'amount', label: t(lang, 'coachCheckAmount', { v: stored.amount != null ? formatINR(stored.amount) : t(lang, 'unknown') }) },
    { id: 'time', label: t(lang, 'coachCheckTime', { v: stored.fraudAtDisplay ?? t(lang, 'unknown') }) },
    { id: 'bank', label: t(lang, 'coachCheckBank', { v: stored.bank ?? t(lang, 'unknown') }) },
    { id: 'utr', label: t(lang, 'coachCheckUtr', { v: stored.utr ?? t(lang, 'unknown') }) },
    { id: 'type', label: t(lang, 'coachCheckType', { v: fraudTypeLabel(stored.fraudType, lang) }) },
  ];

  return (
    <>
      <p>{t(lang, 'coachIntro')}</p>

      <section className="rk-card">
        <h2>{t(lang, 'coachScriptTitle')}</h2>
        <p className="script-box">{script}</p>
      </section>

      <section className="rk-card">
        <h2>{t(lang, 'coachChecklistTitle')}</h2>
        <ul className="checklist">
          {checklist.map((c) => (
            <li key={c.id}>
              <input
                type="checkbox"
                id={`chk-${c.id}`}
                checked={!!checks[c.id]}
                onChange={(e) => setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))}
              />
              <label htmlFor={`chk-${c.id}`}>{c.label}</label>
            </li>
          ))}
        </ul>
      </section>

      <Button label={t(lang, 'coachCallBtn')} variant="destructive" size="lg" width="100%" href="tel:1930" onClick={onCallTap} />

      {!done ? (
        <Button label={t(lang, 'coachDoneBtn')} variant="secondary" size="lg" width="100%" onClick={() => { onDone(); setDone(true); showToast(t(lang, 'coachDoneToast')); }} />
      ) : (
        <>
          <p className="step2-note" role="status">
            {t(lang, 'coachDoneNote')}
          </p>
          <Button label={t(lang, 'coachAckBtn')} variant="secondary" size="lg" width="100%" onClick={onOpenAck} />
        </>
      )}

      <p>{t(lang, 'coachBusyNote')} <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a></p>
      <Button label="Wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />
    </>
  );
}
