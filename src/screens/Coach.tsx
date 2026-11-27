import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { formatINR, fraudTypeLabel, NoReportBanner } from './shared';

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
  const [done, setDone] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

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
    { id: 'amount', label: `Rashi: ${stored.amount != null ? formatINR(stored.amount) : 'Pata nahi'}` },
    { id: 'time', label: `Samay: ${stored.fraudAtDisplay ?? 'Pata nahi'}` },
    { id: 'bank', label: `Bank: ${stored.bank ?? 'Pata nahi'}` },
    { id: 'utr', label: `UTR: ${stored.utr ?? 'Nahi mila'}` },
    { id: 'type', label: `Fraud type: ${fraudTypeLabel(stored.fraudType)}` },
  ];

  return (
    <>
      <NoReportBanner />
      <h1>1930 Call Coach</h1>
      <p>Call karne se pehle script ek baar padh lijiye — 30 second ki baat hai.</p>

      <section className="rk-card">
        <h2>Call script</h2>
        <p className="script-box">{script}</p>
      </section>

      <section className="rk-card">
        <h2>Checklist — call par ye sab batayein</h2>
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

      <Button label="1930 par call karein" variant="destructive" size="lg" width="100%" href="tel:1930" onClick={onCallTap} />

      {!done ? (
        <Button label="Call ke baad 'Done' dabaiye" variant="secondary" size="lg" width="100%" onClick={() => { onDone(); setDone(true); }} />
      ) : (
        <>
          <p className="step2-note" role="status">
            Call tap hua — ye sirf itna batata hai ki button daba. Call poori hui ya complaint file hui, ye RAKSHIO nahi jaanta.
          </p>
          <Button label="Ack number bharein (Ack Bridge)" variant="secondary" size="lg" width="100%" onClick={onOpenAck} />
        </>
      )}

      <p style={{ fontSize: '1rem' }}>Line busy ho to 2 minute baad dobara try karein. Call ke baad 24 ghante me portal complaint poori karein: <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a></p>
      <Button label="Wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />
    </>
  );
}
