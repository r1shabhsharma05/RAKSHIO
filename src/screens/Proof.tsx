import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { StoredIncident } from '../state/store';
import { listEvidence, rootHash, type EvidenceRecord } from '../engines/evidence/vault';
import { loadAck } from '../engines/ack/ack';
import { buildProofPdf, buildProofZip, downloadBlob, rootHashQrDataUrl } from '../engines/proof/proofpack';
import { BackButton, NoReportBanner } from './shared';
import { useToast } from '../components/Toast';

// Bilingual Proof Pack: PDF (Latin-script Hinglish — pdf-lib standard fonts
// have no Devanagari glyphs), ZIP (PDF + evidence.json + root hash), and a
// QR of the root hash for quick verification.
export function ProofScreen({ stored, onBack }: { stored: StoredIncident; onBack: () => void }) {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [root, setRoot] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const ack = loadAck();
  const showToast = useToast();

  useEffect(() => {
    listEvidence(stored.id).then(setEvidence);
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
      showToast('PDF download ho gaya');
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
      showToast('ZIP download ho gaya');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NoReportBanner />
      <h1>Proof Pack</h1>
      <p>Bank ya police ko dene ke liye ek record: incident summary, evidence list with hashes, aur root hash.</p>

      <section className="rk-card">
        <div className="field-row"><span className="label">Evidence entries</span><span className="value">{evidence.length}</span></div>
        <div className="field-row"><span className="label">Root hash</span><span className="value ev-hash">{root ? `${root.slice(0, 16)}…` : 'Koi evidence nahi'}</span></div>
        <div className="field-row"><span className="label">1930 Ack</span><span className="value">{ack?.ackNumber ?? 'Nahi mila'}</span></div>
      </section>

      {evidence.length === 0 && (
        <p className="note">Abhi koi saboot nahi hai — PDF khaali aayega. Pehle Evidence Vault me SMS ya note save karein, phir wapas aakar Proof Pack banayein.</p>
      )}

      {qr && (
        <section className="rk-card">
          <h2>Root hash QR</h2>
          <img src={qr} alt="Root hash QR code" className="qr-img-sm" />
        </section>
      )}

      <button type="button" className="rk-primary-btn" disabled={busy} onClick={makePdf}>{busy ? 'Ban raha hai…' : 'PDF download karein'}</button>
      <Button label={busy ? 'Ban raha hai…' : 'ZIP download karein (PDF + evidence + root hash)'} variant="secondary" size="lg" width="100%" isDisabled={busy} onClick={makeZip} />
      <p className="note">PDF Latin-script Hinglish me hai — Devanagari font offline embed nahi ho sakta, isliye Roman letters use kiye gaye hain.</p>
      <BackButton onBack={onBack} />
    </>
  );
}
