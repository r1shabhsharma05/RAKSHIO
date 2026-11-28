import type { StoredIncident } from '../../state/store';
import { fraudTypeLabel, methodLabel, t, whenText, type Lang } from '../../i18n';

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

// Step 17: the deck follows the UI language. The default 'hg' returns
// the exact old Hinglish labels and values, so the saved ack flow and
// the copy buttons are unchanged there.
export function portalCopyDeck(stored: StoredIncident, ack: AckRecord | null, lang: Lang = 'hg'): CopyRow[] {
  const rows: CopyRow[] = [
    { label: t(lang, 'deckAckLabel'), value: ack?.ackNumber ?? t(lang, 'deckAckMissing') },
    { label: t(lang, 'deckAmountLabel'), value: stored.amount != null ? `₹${stored.amount.toLocaleString('en-IN')}` : t(lang, 'unknown') },
    { label: t(lang, 'deckDateLabel'), value: (stored.fraudAt || stored.fraudAtDisplay ? whenText(stored.fraudAt, stored.fraudAtDisplay, lang) : null) ?? t(lang, 'unknown') },
    { label: t(lang, 'deckBankLabel'), value: stored.bank ?? t(lang, 'unknown') },
    { label: t(lang, 'deckMethodLabel'), value: stored.method ? methodLabel(stored.method, lang) : t(lang, 'unknown') },
    { label: t(lang, 'deckUtrLabel'), value: stored.utr ?? t(lang, 'proofNoAck') },
    { label: t(lang, 'deckFraudTypeLabel'), value: stored.fraudType ? fraudTypeLabel(stored.fraudType, lang) : t(lang, 'unknown') },
    { label: t(lang, 'deckOtpLabel'), value: stored.credentialShared ? t(lang, 'deckYes') : t(lang, 'deckNo') },
    { label: t(lang, 'deckContactLabel'), value: stored.contactChannel ?? t(lang, 'unknown') },
  ];
  return rows;
}
