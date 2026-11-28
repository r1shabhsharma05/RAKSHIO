import { create } from 'zustand';
import type { StoredIncident } from './store';
import {
  addIncident as storeAdd,
  deleteIncident as storeDelete,
  getActiveId,
  listIncidents,
  loadFollowups,
  loadSettings,
  loadShieldLast,
  saveFollowups,
  saveSettings,
  saveShieldLast,
  setActiveId,
  storageFailed,
  updateIncident as storeUpdate,
  wipeAllLocal,
  type FollowupId,
  type Followups,
  type Settings,
  type ShieldLast,
} from './incidents';
import { db } from '../engines/evidence/vault';
import { clearAck } from '../engines/ack/ack';

// Dashboard state: incidents, active incident, settings, follow-ups, last
// shield verdict. LocalStorage is the source of truth; the store is a
// thin reactive mirror over it (no persist middleware — explicit saves
// keep the legacy single-incident migration in one place).
interface DashboardState {
  incidents: StoredIncident[];
  activeId: string | null;
  settings: Settings;
  followups: Followups;
  shieldLast: ShieldLast | null;
  // Step 21 (D2): seeding demo data stashes the previous active incident
  // here, so Judge Mode can hand it back with one tap instead of the
  // victim's report silently leaving Home.
  prevActiveId: string | null;
  loaded: boolean;
  // Step 21 (P7): true when the last localStorage write failed (storage
  // full / private mode) — GlassShell shows a persistent banner.
  storageError: boolean;
  load: () => void;
  active: () => StoredIncident | null;
  setActive: (id: string | null) => void;
  addIncident: (s: StoredIncident, opts?: { demo?: boolean }) => void;
  updateIncident: (id: string, patch: Partial<StoredIncident>) => void;
  deleteIncident: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  markFollowup: (incidentId: string, id: FollowupId) => void;
  setShieldLast: (v: ShieldLast) => void;
  wipeAll: () => Promise<void>;
}

export const useDashboard = create<DashboardState>()((set, get) => ({
  incidents: [],
  activeId: null,
  settings: loadSettings(),
  followups: {},
  shieldLast: null,
  prevActiveId: null,
  loaded: false,
  storageError: false,

  load: () => {
    const incidents = listIncidents();
    const savedActive = getActiveId();
    const activeId = incidents.some((i) => i.id === savedActive) ? savedActive : incidents[0]?.id ?? null;
    set({
      incidents,
      activeId,
      settings: loadSettings(),
      followups: loadFollowups(),
      shieldLast: loadShieldLast(),
      loaded: true,
    });
  },

  active: () => {
    const { incidents, activeId } = get();
    return incidents.find((i) => i.id === activeId) ?? incidents[0] ?? null;
  },

  setActive: (id) => {
    setActiveId(id);
    set({ activeId: id, storageError: storageFailed });
  },

  addIncident: (s, opts) => {
    const incidents = storeAdd(s);
    // A demo seed never silently replaces the victim's report: the old
    // active id is stashed so the Judge page can restore it (D2).
    const prevActiveId = opts?.demo ? get().activeId : null;
    setActiveId(s.id);
    set({ incidents, activeId: s.id, storageError: storageFailed, ...(prevActiveId ? { prevActiveId } : {}) });
  },

  updateIncident: (id, patch) => {
    set({ incidents: storeUpdate(id, patch), storageError: storageFailed });
  },

  deleteIncident: (id) => {
    const incidents = storeDelete(id);
    const { activeId } = get();
    const nextActive = activeId === id ? incidents[0]?.id ?? null : activeId;
    setActiveId(nextActive);
    set({ incidents, activeId: nextActive, storageError: storageFailed });
  },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings, storageError: storageFailed });
  },

  markFollowup: (incidentId, id) => {
    const followups = { ...get().followups };
    followups[incidentId] = { ...followups[incidentId], [id]: 'done' };
    saveFollowups(followups);
    set({ followups, storageError: storageFailed });
  },

  setShieldLast: (v) => {
    saveShieldLast(v);
    set({ shieldLast: v, storageError: storageFailed });
  },

  // One-tap wipe: localStorage keys, ack, and the Dexie vault — then reload.
  wipeAll: async () => {
    wipeAllLocal();
    clearAck();
    try {
      await db.delete();
    } catch {
      /* ignore */
    }
    // Step 21 (T4): wipe used to leave the offline caches and the service
    // worker behind — the app shell (and its cached pages) survived a
    // "delete everything". Now every Cache Storage entry is deleted and
    // every service-worker registration is unregistered, so nothing of
    // the app remains on the device. Each step is best-effort: a failure
    // in one must not stop the others.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => undefined)));
    } catch {
      /* ignore */
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
      }
    } catch {
      /* ignore */
    }
    set({ incidents: [], activeId: null, followups: {}, shieldLast: null, prevActiveId: null, storageError: false });
  },
}));
