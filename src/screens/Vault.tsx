import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { StoredIncident } from '../state/store';
import { addEvidence, listEvidence, tamperTestCopy, verifyChain, type EvidenceRecord } from '../engines/evidence/vault';
import { BackButton } from './shared';
import { useToast } from '../components/Toast';

// Evidence Vault: capture screenshots/SMS/notes, hash-chained in IndexedDB.
// Verify turns the chain green — or red, naming the tampered record.
// The Tamper Test button is a labelled demo that runs on a COPY: it shows
// what Verify would say if a record were changed, without touching the
// real entries — the real chain always stays intact.
export function VaultScreen({ stored, caregiver, onBack }: { stored: StoredIncident; caregiver: boolean; onBack: () => void }) {
  const [rows, setRows] = useState<EvidenceRecord[]>([]);
  const [kind, setKind] = useState<'screenshot' | 'sms' | 'note' | 'file'>('sms');
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [verify, setVerify] = useState<{ ok: boolean; brokenAt?: number; count: number } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperDemo, setTamperDemo] = useState<{ ok: boolean; brokenAt?: number; count: number } | null>(null);
  const showToast = useToast();

  async function refresh() {
    setRows(await listEvidence(stored.id));
  }
  useEffect(() => { refresh(); }, [stored.id]);

  async function add() {
    if (!text.trim() && kind !== 'file') return;
    await addEvidence({
      incidentId: stored.id, kind, label: label.trim() || kind,
      text: text.trim(), capturedAt: new Date().toISOString(), byCaregiver: caregiver,
    });
    setText('');
    setLabel('');
    setVerify(null);
    await refresh();
    showToast('Saboot save ho gaya');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await addEvidence({
        incidentId: stored.id, kind: 'file', label: f.name,
        text: `File: ${f.name} (${Math.round(f.size / 1024)} KB)`,
        data: String(reader.result), capturedAt: new Date().toISOString(), byCaregiver: caregiver,
      });
      setVerify(null);
      await refresh();
    };
    reader.readAsDataURL(f);
  }

  async function onVerify() {
    setVerifying(true);
    try {
      setVerify(await verifyChain(stored.id));
    } finally {
      setVerifying(false);
    }
  }

  // Runs on a COPY of the rows — the real entries are never mutated, so
  // after the test the real chain still verifies clean.
  async function onTamperTest() {
    if (rows.length === 0) return;
    setTamperDemo(await tamperTestCopy(rows));
  }

  return (
    <>
      <h2>Evidence Vault</h2>
      <p>Screenshot, SMS ya note save karein. Har entry ka SHA-256 hash banta hai — koi entry badle to chain toot jati hai.</p>

      <section className="rk-card">
        <h2>Naya saboot jodein</h2>
        <label htmlFor="ev-kind" className="rk-label">Kis type ka saboot?</label>
        <select id="ev-kind" className="rk-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="sms">SMS / Message</option>
          <option value="screenshot">Screenshot (text)</option>
          <option value="note">Note</option>
          <option value="file">File / Photo</option>
        </select>
        <label htmlFor="ev-label" className="rk-label">Label</label>
        <input id="ev-label" className="rk-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Jaise: Fraud SMS, Bank statement" />
        {kind === 'file' ? (
          <input type="file" accept="image/*" onChange={onFile} aria-label="Photo ya file chunein" />
        ) : (
          <>
            <label htmlFor="ev-text" className="rk-label">Text</label>
            <textarea id="ev-text" className="rk-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="SMS ya note yahan likhein ya paste karein" />
          </>
        )}
        <p className="note">OTP/PIN aur card/Aadhaar number save karne se pehle chhupa diye jayenge.</p>
        <button type="button" className="rk-primary-btn" disabled={kind !== 'file' && text.trim().length < 1} onClick={add}>Vault me save karein</button>
      </section>

      <section className="rk-card">
        <h2>Saved evidence ({rows.length})</h2>
        {rows.length === 0 && <p className="note">Abhi koi saboot nahi hai. Upar SMS ya note likh kar “Vault me save karein” dabaiye — har entry ka hash banta hai.</p>}
        {rows.map((r) => (
          <div key={r.id} className="field-row">
            <span className="label">[{r.kind}] {r.label}{r.byCaregiver ? ' (caregiver)' : ''}<br /><span className="ev-text">{r.text.slice(0, 120)}</span></span>
            <span className="value ev-hash">{r.hash.slice(0, 12)}…</span>
          </div>
        ))}
        <Button label={verifying ? 'Check ho raha hai…' : 'Chain verify karein'} variant="secondary" size="lg" width="100%" isDisabled={verifying} onClick={onVerify} />
        {verify && (
          <p role="status" className={verify.ok ? 'status-ok' : 'status-bad'}>
            {verify.ok
              ? `✓ Chain sahi hai — ${verify.count} entries, koi badlaav nahi.`
              : `✗ Chain TOOTI — record #${verify.brokenAt} badla gaya hai. (${verify.count} entries)`}
          </p>
        )}
        {rows.length > 0 && (
          <Button label="Tamper test (demo) — copy par chain tod kar dekhein" variant="ghost" size="lg" width="100%" onClick={onTamperTest} />
        )}
        {tamperDemo && (
          <p role="status" className="status-bad">
            {tamperDemo.ok
              ? 'Tamper test (copy par): chain saaf nikli — test me koi badlaav nahi dikha.'
              : `Tamper test (sirf copy par): Chain TOOTI — record #${tamperDemo.brokenAt} badla gaya hai. Asli entries surakshit hain — ye test copy par chala, asli Vault me kuch nahi badla.`}
          </p>
        )}
        {tamperDemo && (
          <Button label="Asli chain verify karein" variant="secondary" size="lg" width="100%" onClick={onVerify} />
        )}
      </section>
      {rows.length > 0 && <p><Badge label="Hash-chained • SHA-256" variant="success" /></p>}
      <BackButton onBack={onBack} />
    </>
  );
}
