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
  loaded: boolean;
  load: () => void;
  active: () => StoredIncident | null;
  setActive: (id: string | null) => void;
  addIncident: (s: StoredIncident) => void;
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
  loaded: false,

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
    set({ activeId: id });
  },

  addIncident: (s) => {
    const incidents = storeAdd(s);
    setActiveId(s.id);
    set({ incidents, activeId: s.id });
  },

  updateIncident: (id, patch) => {
    set({ incidents: storeUpdate(id, patch) });
  },

  deleteIncident: (id) => {
    const incidents = storeDelete(id);
    const { activeId } = get();
    const nextActive = activeId === id ? incidents[0]?.id ?? null : activeId;
    setActiveId(nextActive);
    set({ incidents, activeId: nextActive });
  },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  markFollowup: (incidentId, id) => {
    const followups = { ...get().followups };
    followups[incidentId] = { ...followups[incidentId], [id]: 'done' };
    saveFollowups(followups);
    set({ followups });
  },

  setShieldLast: (v) => {
    saveShieldLast(v);
    set({ shieldLast: v });
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
    set({ incidents: [], activeId: null, followups: {}, shieldLast: null });
  },
}));
