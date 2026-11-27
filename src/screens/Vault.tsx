import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { StoredIncident } from '../state/store';
import { addEvidence, listEvidence, tamperRecord, verifyChain, type EvidenceRecord } from '../engines/evidence/vault';
import { BackButton, NoReportBanner } from './shared';

// Evidence Vault: capture screenshots/SMS/notes, hash-chained in IndexedDB.
// Verify turns the chain green — or red, naming the tampered record.
// The Tamper Test button is a labelled demo: it edits a record without
// re-hashing, so Verify must fail. That is the point of the test.
export function VaultScreen({ stored, caregiver, onBack }: { stored: StoredIncident; caregiver: boolean; onBack: () => void }) {
  const [rows, setRows] = useState<EvidenceRecord[]>([]);
  const [kind, setKind] = useState<'screenshot' | 'sms' | 'note' | 'file'>('sms');
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [verify, setVerify] = useState<{ ok: boolean; brokenAt?: number; count: number } | null>(null);
  const [tampered, setTampered] = useState(false);

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
    setVerify(await verifyChain(stored.id));
  }

  async function onTamperTest() {
    const first = rows[0];
    if (!first?.id) return;
    await tamperRecord(first.id, 'BADLA HUA — tamper test');
    setTampered(true);
    setVerify(await verifyChain(stored.id));
    await refresh();
  }

  return (
    <>
      <NoReportBanner />
      <h1>Evidence Vault</h1>
      <p>Screenshot, SMS ya note save karein. Har entry ka SHA-256 hash banta hai — koi entry badle to chain toot jati hai.</p>

      <section className="rk-card">
        <h2>Naya saboot jodein</h2>
        <label htmlFor="ev-kind" style={{ fontWeight: 600 }}>Kis type ka saboot?</label>
        <select id="ev-kind" className="rk-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="sms">SMS / Message</option>
          <option value="screenshot">Screenshot (text)</option>
          <option value="note">Note</option>
          <option value="file">File / Photo</option>
        </select>
        <label htmlFor="ev-label" style={{ fontWeight: 600 }}>Label</label>
        <input id="ev-label" className="rk-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Jaise: Fraud SMS, Bank statement" />
        {kind === 'file' ? (
          <input type="file" accept="image/*" onChange={onFile} aria-label="Photo ya file chunein" />
        ) : (
          <>
            <label htmlFor="ev-text" style={{ fontWeight: 600 }}>Text</label>
            <textarea id="ev-text" className="rk-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="SMS ya note yahan likhein ya paste karein" />
          </>
        )}
        <p style={{ fontSize: '0.875rem' }}>OTP/PIN aur card/Aadhaar number save karne se pehle chhupa diye jayenge.</p>
        <button type="button" className="rk-primary-btn" disabled={kind !== 'file' && text.trim().length < 1} onClick={add}>Vault me save karein</button>
      </section>

      <section className="rk-card">
        <h2>Saved evidence ({rows.length})</h2>
        {rows.length === 0 && <p>Abhi koi saboot nahi hai.</p>}
        {rows.map((r) => (
          <div key={r.id} className="field-row">
            <span className="label">[{r.kind}] {r.label}{r.byCaregiver ? ' (caregiver)' : ''}<br /><span style={{ fontWeight: 400, fontSize: '0.9375rem' }}>{r.text.slice(0, 120)}</span></span>
            <span className="value" style={{ fontSize: '0.875rem', fontWeight: 400 }}>{r.hash.slice(0, 12)}…</span>
          </div>
        ))}
        <Button label="Chain verify karein" variant="secondary" size="lg" width="100%" onClick={onVerify} />
        {verify && (
          <p role="status" style={{ fontWeight: 700, color: verify.ok ? '#16a34a' : '#dc2626' }}>
            {verify.ok
              ? `✓ Chain sahi hai — ${verify.count} entries, koi badlaav nahi.`
              : `✗ Chain TOOTI — record #${verify.brokenAt} badla gaya hai. (${verify.count} entries)`}
          </p>
        )}
        {rows.length > 0 && (
          <Button label="Tamper test (demo) — pehli entry badal kar dekhein" variant="ghost" size="lg" width="100%" onClick={onTamperTest} />
        )}
        {tampered && <p style={{ fontSize: '0.875rem' }}>Tamper test: pehli entry ko bina hash badle edit kiya gaya. Verify ab laal hona chahiye.</p>}
      </section>
      {rows.length > 0 && <p><Badge label="Hash-chained • SHA-256" variant="success" /></p>}
      <BackButton onBack={onBack} />
    </>
  );
}
