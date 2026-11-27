import type { ExtractedIncident } from '../engines/understanding/extract';
import type { IncidentStatus } from './incidents';

// One incident per device for Step 1. Only the masked transcript is stored:
// OTP/PIN/CVV digits are masked by the Understanding Engine before this point.
export interface StoredIncident {
  id: string;
  createdAt: string;
  fraudAt: string | null;
  fraudAtDisplay: string | null;
  amount: number | null;
  method: string | null;
  bank: string | null;
  utr: string | null;
  fraudType: string | null;
  credentialShared: boolean;
  contactChannel: string | null;
  confirmed: { amount: boolean; fraudAt: boolean; method: boolean };
  transcript: string;
  maskedCredentials: boolean;
  callTappedAt: string | null;
  caregiverMode: boolean;
  // Dashboard status, set by the user (or by their own recorded actions:
  // ack saved -> awaiting-portal, bank ref saved -> bank-notified).
  // Absent on pre-dashboard incidents — the dashboard defaults it.
  status?: IncidentStatus;
}

const KEY = 'rakshio.incident.v1';

export function saveIncident(data: StoredIncident): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full/private mode */ }
}

export function loadIncident(): StoredIncident | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredIncident) : null;
  } catch {
    return null;
  }
}

export function wipeIncident(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function toStored(
  incident: ExtractedIncident,
  transcript: string,
  masked: boolean,
  fraudAt: Date | null,
  caregiverMode: boolean,
): StoredIncident {
  return {
    id: `rk-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    fraudAt: fraudAt ? fraudAt.toISOString() : null,
    fraudAtDisplay: incident.fraudAtDisplay.value,
    amount: incident.amount.value,
    method: incident.method.value,
    bank: incident.bank.value,
    utr: incident.utr.value,
    fraudType: incident.fraudType.value,
    credentialShared: incident.credentialShared,
    contactChannel: incident.contactChannel.value,
    confirmed: { amount: false, fraudAt: false, method: false },
    transcript,
    maskedCredentials: masked,
    callTappedAt: null,
    caregiverMode,
  };
}
