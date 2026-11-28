import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { listEvidence, countOtherEvidence, rootHash, type EvidenceRecord } from '../engines/evidence/vault';
import { loadAck } from '../engines/ack/ack';
import { buildProofPdf, buildProofZip, downloadBlob, rootHashQrDataUrl } from '../engines/proof/proofpack';
import { BackButton } from './shared';
import { useToast } from '../components/Toast';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Bilingual Proof Pack: PDF (Latin-script Hinglish — pdf-lib standard fonts
// have no Devanagari glyphs), ZIP (PDF + evidence.json + root hash), and a
// QR of the root hash for quick verification.
export function ProofScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  // Step 20 (B6): same loading-vs-empty split as the Vault.
  const [loaded, setLoaded] = useState(false);
  // Step 20 (B4): evidence saved under other incidents.
  const [other, setOther] = useState<{ count: number; incidentId: string | null }>({ count: 0, incidentId: null });
  const [root, setRoot] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const ack = loadAck();
  const showToast = useToast();

  useEffect(() => {
    listEvidence(stored.id).then((rows) => { setEvidence(rows); setLoaded(true); });
    countOtherEvidence(stored.id).then(setOther);
    rootHash(stored.id).then(async (r) => {
      setRoot(r);
      if (r) setQr(await rootHashQrDataUrl(r));
    });
  }, [stored.id]);

  async function makePdf() {
    setBusy(true);
    try {
      const bytes = await buildProofPdf(stored, evidence, root, ack?.ackNumber ?? null);
      // TS 7 types Uint8Array as ArrayBufferLike; BlobPart wants ArrayBufferView<ArrayBuffer>.
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'RAKSHIO-proof.pdf');
      showToast(t(lang, 'proofPdfToast'));
    } finally {
      setBusy(false);
    }
  }

  async function makeZip() {
    setBusy(true);
    try {
      const bytes = await buildProofPdf(stored, evidence, root, ack?.ackNumber ?? null);
      const zip = await buildProofZip(bytes, evidence, root);
      downloadBlob(zip, 'RAKSHIO-proof-pack.zip');
      showToast(t(lang, 'proofZipToast'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p>{t(lang, 'proofIntro')}</p>
      <p className="note-strong">{t(lang, 'proofCheckNote')}</p>

      <section className="rk-card">
        <div className="field-row"><span className="label">{t(lang, 'proofIncidentLabel', { id: `#${stored.id.replace(/^rk-/, 'RK-').toUpperCase()}` })}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'proofEvidenceLabel')}</span><span className="value">{evidence.length}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'proofRootLabel')}</span><span className="value ev-hash">{root ? `${root.slice(0, 16)}…` : t(lang, 'proofNoEvidence')}</span></div>
        <div className="field-row"><span className="label">{t(lang, 'proofAckLabel')}</span><span className="value">{ack?.ackNumber ?? t(lang, 'proofNoAck')}</span></div>
      </section>

      {!loaded && (
        <p className="note">{t(lang, 'evidenceLoading')}</p>
      )}

      {loaded && evidence.length === 0 && (
        <p className="note">{t(lang, 'proofEmptyNote')}</p>
      )}

      {loaded && evidence.length === 0 && other.count > 0 && other.incidentId && (
        <p className="note">{t(lang, 'proofOtherEvidenceNote', { n: other.count, id: `#${other.incidentId.replace(/^rk-/, 'RK-').toUpperCase()}` })}</p>
      )}

      {qr && (
        <section className="rk-card">
          <h2>{t(lang, 'proofQrTitle')}</h2>
          <img src={qr} alt="Root hash QR code" className="qr-img-sm" />
        </section>
      )}

      <button type="button" className="rk-primary-btn" disabled={busy} onClick={makePdf}>{busy ? t(lang, 'proofBusy') : t(lang, 'proofPdfBtn')}</button>
      <Button label={busy ? t(lang, 'proofBusy') : t(lang, 'proofZipBtn')} variant="secondary" size="lg" width="100%" isDisabled={busy} onClick={makeZip} />
      <p className="note">{t(lang, 'proofPdfNote')}</p>
      <BackButton onBack={onBack} />
    </>
  );
}
