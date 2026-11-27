import { t, type Lang } from '../../i18n';
import { DEADLINES, type Deadline } from './deadlines.config';

/**
 * Step 16 (bug 2): duration text follows the selected language.
 * English gets proper units ("2 hours 3 min"); Hindi gets Devanagari
 * ("2 घंटे 3 मिनट"); Hinglish keeps the old Hinglish ("2 ghante 3 min").
 */
export function formatDurationLang(lang: Lang, ms: number): string {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const days = Math.floor(h / 24);
  if (days >= 1) {
    const dayPart = t(lang, days === 1 ? 'durDayOne' : 'durDayMany', { n: days });
    const rest = h % 24;
    return rest > 0 ? `${dayPart} ${t(lang, rest === 1 ? 'durHourOne' : 'durHourMany', { n: rest })}` : dayPart;
  }
  if (h > 0) return `${t(lang, h === 1 ? 'durHourOne' : 'durHourMany', { n: h })} ${t(lang, 'durMin', { n: m })}`;
  if (m > 0) return `${t(lang, 'durMin', { n: m })} ${t(lang, 'durSec', { n: s })}`;
  return t(lang, 'durSec', { n: s });
}

/** Hinglish default — kept so old callers don't change behaviour. */
export function formatDuration(ms: number): string {
  return formatDurationLang('hg', ms);
}

export interface DeadlineStatus extends Deadline {
  remainingMs: number;
  state: 'safe' | 'soon' | 'overdue';
}

// 'soon' starts in the last quarter of the window, so the queue can re-order
// before the deadline actually passes.
export function deadlineStatuses(fraudAt: Date, now: Date): DeadlineStatus[] {
  return DEADLINES.map((d) => {
    const remainingMs = fraudAt.getTime() + d.hours * 3600_000 - now.getTime();
    const state = remainingMs <= 0 ? 'overdue' : remainingMs <= d.hours * 3600_000 * 0.25 ? 'soon' : 'safe';
    return { ...d, remainingMs, state };
  });
}

export interface ActionItem {
  id: string;
  title: string;
  why: string;
  urgent?: boolean;
  step2?: boolean;
}

// Queue order follows the clock: the portal card rises when its 24-hour
// window is nearly gone; credential sharing always puts "stop further loss" first.
// Step 16 (bug 2): titles/whys follow the selected language (`lang`, default 'hg').
export function orderActions(fraudAt: Date, now: Date, credentialShared: boolean, lang: Lang = 'hg'): ActionItem[] {
  const statuses = deadlineStatuses(fraudAt, now);
  const portal = statuses.find((s) => s.id === 'portal')!;
  const items: ActionItem[] = [
    { id: 'stop', title: t(lang, 'actStopTitle'), why: t(lang, 'actStopWhy'), urgent: credentialShared },
    { id: 'call1930', title: t(lang, 'actCallTitle'), why: t(lang, 'actCallWhy') },
    { id: 'bank', title: t(lang, 'actBankTitle'), why: t(lang, 'actBankWhy'), step2: true },
    { id: 'portal', title: t(lang, 'actPortalTitle'), why: t(lang, 'actPortalWhy'), urgent: portal.state !== 'safe', step2: true },
    { id: 'evidence', title: t(lang, 'actEvidenceTitle'), why: t(lang, 'actEvidenceWhy'), step2: true },
    { id: 'family', title: t(lang, 'actFamilyTitle'), why: t(lang, 'actFamilyWhy'), step2: true },
  ];
  if (portal.state !== 'safe') {
    const [p] = items.splice(items.findIndex((i) => i.id === 'portal'), 1);
    items.splice(1, 0, p);
  }
  return items;
}
