import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import type { StoredIncident } from '../state/store';
import { addEvidence, countOtherEvidence, listEvidence, tamperTestCopy, verifyChain, type EvidenceRecord } from '../engines/evidence/vault';
import { BackButton } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Evidence Vault: capture screenshots/SMS/notes, hash-chained in IndexedDB.
// Verify turns the chain green — or red, naming the tampered record.
// The Tamper Test button is a labelled demo that runs on a COPY: it shows
// what Verify would say if a record were changed, without touching the
// real entries — the real chain always stays intact.
export function VaultScreen({ stored, caregiver, onBack }: { stored: StoredIncident; caregiver: boolean; onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [rows, setRows] = useState<EvidenceRecord[]>([]);
  // Step 20 (B6): rows start empty while the async load is in flight —
  // the empty note must not render before the stored rows arrive.
  const [loaded, setLoaded] = useState(false);
  // Step 20 (B4): evidence saved under OTHER incidents, so an empty Vault
  // can name where it is instead of looking like data loss.
  const [other, setOther] = useState<{ count: number; incidentId: string | null }>({ count: 0, incidentId: null });
  const [kind, setKind] = useState<'screenshot' | 'sms' | 'note' | 'file'>('sms');
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [verify, setVerify] = useState<{ ok: boolean; brokenAt?: number; count: number } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperDemo, setTamperDemo] = useState<{ ok: boolean; brokenAt?: number; count: number } | null>(null);
  // Step 20 (B3): a double-tap must save once. The ref guard is
  // synchronous (state re-render is not fast enough between two clicks
  // of a dblclick); the transaction in addEvidence is the second layer.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const showToast = useToast();

  async function refresh() {
    setRows(await listEvidence(stored.id));
    setOther(await countOtherEvidence(stored.id));
    setLoaded(true);
  }
  useEffect(() => { refresh(); }, [stored.id]);

  async function add() {
    if (!text.trim() && kind !== 'file') return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await addEvidence({
        incidentId: stored.id, kind, label: label.trim() || kind,
        text: text.trim(), capturedAt: new Date().toISOString(), byCaregiver: caregiver,
      });
      setText('');
      setLabel('');
      setVerify(null);
      await refresh();
      showToast(t(lang, 'vaultSavedToast'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // Step 21 (T2): files over 5 MB are rejected with a reason (an uncapped
  // base64 photo can blow the IndexedDB budget on a low-end phone), and
  // images are downscaled to at most 1280px on the long side as JPEG 0.85
  // before storage — a screenshot stays readable, the stored bytes stay
  // small. The save is wrapped: a full/quota-blocked store used to fail
  // silently.
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_IMAGE_DIM = 1280;

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  async function downscaleImage(file: File): Promise<string | null> {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    if (f.size > MAX_FILE_BYTES) {
      showToast(t(lang, 'vaultFileTooBig'));
      return;
    }
    try {
      const data = f.type.startsWith('image/')
        ? ((await downscaleImage(f)) ?? (await readAsDataURL(f)))
        : await readAsDataURL(f);
      await addEvidence({
        incidentId: stored.id, kind: 'file', label: f.name,
        text: `File: ${f.name} (${Math.round(f.size / 1024)} KB)`,
        data, capturedAt: new Date().toISOString(), byCaregiver: caregiver,
      });
      setVerify(null);
      await refresh();
    } catch {
      showToast(t(lang, 'vaultSaveFail'));
    }
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
      <p>{t(lang, 'vaultIntro')}</p>

      <section className="rk-card">
        <h2>{t(lang, 'vaultAddTitle')}</h2>
        <label htmlFor="ev-kind" className="rk-label">{t(lang, 'vaultKindLabel')}</label>
        <select id="ev-kind" className="rk-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="sms">{t(lang, 'vaultKindSms')}</option>
          <option value="screenshot">{t(lang, 'vaultKindScreenshot')}</option>
          <option value="note">{t(lang, 'vaultKindNote')}</option>
          <option value="file">{t(lang, 'vaultKindFile')}</option>
        </select>
        <label htmlFor="ev-label" className="rk-label">{t(lang, 'vaultLabelLabel')}</label>
        <input id="ev-label" className="rk-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t(lang, 'vaultLabelPlaceholder')} />
        {kind === 'file' ? (
          <input type="file" accept="image/*" onChange={onFile} aria-label={t(lang, 'vaultFileLabel')} />
        ) : (
          <>
            <label htmlFor="ev-text" className="rk-label">{t(lang, 'vaultTextLabel')}</label>
            <textarea id="ev-text" className="rk-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t(lang, 'vaultTextPlaceholder')} />
          </>
        )}
        <p className="note">{t(lang, 'vaultRedactNote')}</p>
        <button type="button" className="rk-primary-btn" disabled={saving || (kind !== 'file' && text.trim().length < 1)} onClick={add}>{t(lang, 'vaultSaveBtn')}</button>
      </section>

      <section className="rk-card">
        <h2>{t(lang, 'vaultSavedTitle', { n: rows.length })}</h2>
        <p className="note">{t(lang, 'vaultIncidentLabel', { id: `#${stored.id.replace(/^rk-/, 'RK-').toUpperCase()}` })}</p>
        {!loaded && <p className="note">{t(lang, 'evidenceLoading')}</p>}
        {loaded && rows.length === 0 && <p className="note">{t(lang, 'vaultEmptyNote')}</p>}
        {loaded && rows.length === 0 && other.count > 0 && other.incidentId && (
          <p className="note">{t(lang, 'vaultOtherEvidenceNote', { n: other.count, id: `#${other.incidentId.replace(/^rk-/, 'RK-').toUpperCase()}` })}</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="field-row">
            <span className="label">[{r.kind}] {r.label}{r.byCaregiver ? t(lang, 'vaultCaregiverTag') : ''}<br /><span className="ev-text">{r.text.slice(0, 120)}</span></span>
            <span className="value ev-hash">{r.hash.slice(0, 12)}…</span>
          </div>
        ))}
        <Button label={verifying ? t(lang, 'vaultVerifying') : t(lang, 'vaultVerifyBtn')} variant="secondary" size="lg" width="100%" isDisabled={verifying} onClick={onVerify} />
        {verify && (
          <p role="status" className={verify.ok ? 'status-ok' : 'status-bad'}>
            {verify.ok
              ? t(lang, 'vaultChainOk', { n: verify.count })
              : t(lang, 'vaultChainBroken', { n: verify.brokenAt ?? 0, count: verify.count })}
          </p>
        )}
        {rows.length > 0 && (
          <Button label={t(lang, 'vaultTamperBtn')} variant="ghost" size="lg" width="100%" onClick={onTamperTest} />
        )}
        {tamperDemo && (
          <p role="status" className="status-bad">
            {tamperDemo.ok
              ? t(lang, 'vaultTamperOk')
              : t(lang, 'vaultTamperBroken', { n: tamperDemo.brokenAt ?? 0 })}
          </p>
        )}
        {tamperDemo && (
          <Button label={t(lang, 'vaultVerifyRealBtn')} variant="secondary" size="lg" width="100%" onClick={onVerify} />
        )}
      </section>
      {rows.length > 0 && <p><Badge label="Hash-chained • SHA-256" variant="success" /></p>}

      {/* Step 21 (#6): the capture guide — what to keep, before the
          victim deletes it. Static advice only; nothing is auto-saved. */}
      <section className="rk-card">
        <h2>{t(lang, 'vaultKeepTitle')}</h2>
        <ul>
          <li>{t(lang, 'vaultKeep1')}</li>
          <li>{t(lang, 'vaultKeep2')}</li>
          <li>{t(lang, 'vaultKeep3')}</li>
          <li>{t(lang, 'vaultKeep4')}</li>
        </ul>
      </section>
      <BackButton onBack={onBack} />
    </>
  );
}
