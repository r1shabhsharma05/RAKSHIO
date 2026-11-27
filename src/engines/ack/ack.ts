import type { StoredIncident } from '../../state/store';

// Ack Bridge: after the 1930 call the victim gets an acknowledgement number.
// Store it, start the 24-hour portal countdown, and hand over a field-by-
// field Portal Copy Deck — copy each row into the portal form, no re-typing
// from memory while panicking.
const ACK_KEY = 'rakshio.ack.v1';

export interface AckRecord {
  ackNumber: string;
  calledAt: string;
  incidentId: string;
}

export function saveAck(rec: AckRecord): void {
  try { localStorage.setItem(ACK_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
}

export function loadAck(): AckRecord | null {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    return raw ? (JSON.parse(raw) as AckRecord) : null;
  } catch {
    return null;
  }
}

export function clearAck(): void {
  try { localStorage.removeItem(ACK_KEY); } catch { /* ignore */ }
}

// Portal complaint must be completed within 24 hours of the 1930 call.
export function portalDeadline(calledAt: string): Date {
  return new Date(new Date(calledAt).getTime() + 24 * 3600_000);
}

export interface CopyRow {
  label: string;
  value: string;
}

export function portalCopyDeck(stored: StoredIncident, ack: AckRecord | null): CopyRow[] {
  const rows: CopyRow[] = [
    { label: '1930 Ack number', value: ack?.ackNumber ?? 'Abhi nahi mila — call ke baad yahan bharein' },
    { label: 'Rashi', value: stored.amount != null ? `₹${stored.amount.toLocaleString('en-IN')}` : 'Pata nahi' },
    { label: 'Date / Time', value: stored.fraudAtDisplay ?? 'Pata nahi' },
    { label: 'Bank / App', value: stored.bank ?? 'Pata nahi' },
    { label: 'Tareeka', value: stored.method ?? 'Pata nahi' },
    { label: 'UTR / Reference', value: stored.utr ?? 'Nahi mila' },
    { label: 'Fraud type', value: stored.fraudType ?? 'Pata nahi' },
    { label: 'OTP/PIN share hua?', value: stored.credentialShared ? 'Haan' : 'Nahi' },
    { label: 'Contact channel', value: stored.contactChannel ?? 'Pata nahi' },
  ];
  return rows;
}
