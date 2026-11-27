import type { StoredIncident } from './store';
import { loadIncident } from './store';

// Multi-incident storage. One row per confirmed incident; the old
// single-incident key (rakshio.incident.v1) migrates in once, then is
// removed so the two stores can never disagree.
export type IncidentStatus =
  | 'reported'
  | 'in-progress'
  | 'awaiting-portal'
  | 'bank-notified'
  | 'evidence-saved'
  | 'closed';

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'reported',
  'in-progress',
  'awaiting-portal',
  'bank-notified',
  'evidence-saved',
  'closed',
];

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  'in-progress': 'In Progress',
  'awaiting-portal': 'Awaiting Portal',
  'bank-notified': 'Bank Notified',
  'evidence-saved': 'Evidence Saved',
  closed: 'Closed',
};

const LIST_KEY = 'rakshio.incidents.v1';
const ACTIVE_KEY = 'rakshio.active.v1';
const SETTINGS_KEY = 'rakshio.settings.v1';
const FOLLOWUPS_KEY = 'rakshio.followups.v1';
const SHIELD_LAST_KEY = 'rakshio.shield-last.v1';

export interface Settings {
  language: 'en' | 'hi';
  calmPrompt: boolean;
  caregiver: boolean;
  ttsRate: number;
  speechLang: 'hi-IN' | 'en-IN';
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  calmPrompt: true,
  caregiver: false,
  ttsRate: 0.85,
  speechLang: 'hi-IN',
};

export type FollowupId = '1h' | '24h' | '3d' | '7d';
export type Followups = Record<string, Partial<Record<FollowupId, 'done'>>>;

export interface ShieldLast {
  text: string;
  level: 'safe' | 'suspicious' | 'danger';
  score: number;
  at: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — the app keeps working in memory */
  }
}

export function listIncidents(): StoredIncident[] {
  const list = read<StoredIncident[]>(LIST_KEY);
  if (list) return list;
  // One-time migration from the old single-incident store.
  const legacy = loadIncident();
  if (legacy) {
    const migrated = [{ ...legacy, status: legacy.status ?? 'reported' as IncidentStatus }];
    write(LIST_KEY, migrated);
    try {
      localStorage.removeItem('rakshio.incident.v1');
    } catch {
      /* ignore */
    }
    return migrated;
  }
  return [];
}

export function saveIncidents(list: StoredIncident[]): void {
  write(LIST_KEY, list);
}

export function addIncident(incident: StoredIncident): StoredIncident[] {
  const list = [incident, ...listIncidents()];
  saveIncidents(list);
  return list;
}

export function updateIncident(id: string, patch: Partial<StoredIncident>): StoredIncident[] {
  const list = listIncidents().map((i) => (i.id === id ? { ...i, ...patch } : i));
  saveIncidents(list);
  return list;
}

export function deleteIncident(id: string): StoredIncident[] {
  const list = listIncidents().filter((i) => i.id !== id);
  saveIncidents(list);
  return list;
}

export function getActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Settings>(SETTINGS_KEY) ?? {}) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS_KEY, s);
}

export function loadFollowups(): Followups {
  return read<Followups>(FOLLOWUPS_KEY) ?? {};
}

export function saveFollowups(f: Followups): void {
  write(FOLLOWUPS_KEY, f);
}

export function loadShieldLast(): ShieldLast | null {
  return read<ShieldLast>(SHIELD_LAST_KEY);
}

export function saveShieldLast(v: ShieldLast): void {
  write(SHIELD_LAST_KEY, v);
}

// Total bytes this app holds in localStorage — Settings shows the real number.
export function localStorageBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      total += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
  } catch {
    /* ignore */
  }
  return total;
}

// Everything the app owns, for the one-tap wipe. Dexie is cleared separately.
export function wipeAllLocal(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rakshio.')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
