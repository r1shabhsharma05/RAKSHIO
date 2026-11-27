import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import type { StoredIncident } from '../../state/store';
import type { EvidenceRecord } from '../evidence/vault';

// Bilingual Proof Pack: a PDF the victim can hand to the bank or police,
// a ZIP (PDF + evidence list + root hash), and a QR of the root hash.
// The PDF is Latin-script Hinglish, not Devanagari — pdf-lib's standard
// fonts have no Devanagari glyphs, and embedding a font would need a
// network fetch at generation time. Latin script keeps it offline-safe.
export async function buildProofPdf(
  stored: StoredIncident,
  evidence: EvidenceRecord[],
  root: string | null,
  ackNumber: string | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;

  const line = (text: string, size = 12, b = false, gap = 18) => {
    page.drawText(text, { x: 50, y, size, font: b ? bold : font, color: rgb(0.05, 0.29, 0.43) });
    y -= gap;
  };
  const wrap = (text: string, size = 11) => {
    const words = text.split(' ');
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).length > 78) { line(cur.trim(), size); cur = w; }
      else cur += ' ' + w;
    }
    if (cur.trim()) line(cur.trim(), size);
  };

  line('RAKSHIO — Fraud Incident Proof Pack', 16, true, 24);
  line('Ye RAKSHIO dwara banaya gaya record hai. Ye koi police/bank report nahi hai.', 10, false, 26);
  line('Incident Summary (Vivaran)', 13, true);
  line(`Rashi (Amount): ${stored.amount != null ? `Rs ${stored.amount.toLocaleString('en-IN')}` : 'Pata nahi'}`);
  line(`Samay (Date/Time): ${stored.fraudAtDisplay ?? 'Pata nahi'}`);
  line(`Bank / App: ${stored.bank ?? 'Pata nahi'}`);
  line(`Tareeka (Method): ${stored.method ?? 'Pata nahi'}`);
  line(`UTR / Reference: ${stored.utr ?? 'Nahi mila'}`);
  line(`Fraud type: ${stored.fraudType ?? 'Pata nahi'}`);
  line(`OTP/PIN share hua: ${stored.credentialShared ? 'Haan' : 'Nahi'}`);
  line(`1930 Ack number: ${ackNumber ?? 'Abhi nahi mila'}`);
  line(`1930 call tap hua: ${stored.callTappedAt ? 'Haan' : 'Nahi'}`);
  y -= 8;
  line('Evidence (Saboot) — hash-chained, tamper-evident', 13, true);
  if (evidence.length === 0) {
    line('Koi evidence abhi save nahi hua.', 11);
  } else {
    for (const e of evidence) {
      line(`- [${e.kind}] ${e.label} — ${new Date(e.capturedAt).toLocaleString('en-IN')}`, 10, false, 14);
      line(`  hash: ${e.hash.slice(0, 24)}…`, 9, false, 14);
    }
  }
  y -= 8;
  line('Root hash (Evidence chain ka aakhri hash)', 13, true);
  wrap(root ?? 'Koi evidence nahi — root hash nahi bana.', 10);
  y -= 8;
  line('Disclaimer', 13, true);
  wrap('RAKSHIO ne koi report file nahi ki hai. Ye pack sirf aapke record ke liye hai. 1930 aur cybercrime.gov.in par complaint aapko khud karni hoti hai. RAKSHIO recovery ka vaada nahi karta.', 10);
  line(`Banaya gaya: ${new Date().toLocaleString('en-IN')}`, 10, false, 14);

  return doc.save();
}

export async function buildProofZip(pdfBytes: Uint8Array, evidence: EvidenceRecord[], root: string | null): Promise<Blob> {
  const zip = new JSZip();
  zip.file('RAKSHIO-proof.pdf', pdfBytes);
  zip.file('evidence.json', JSON.stringify(evidence, null, 2));
  zip.file('root-hash.txt', root ?? 'no-evidence\n');
  return zip.generateAsync({ type: 'blob' });
}

export async function rootHashQrDataUrl(root: string): Promise<string> {
  return QRCode.toDataURL(root, { width: 256, margin: 1 });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
