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

// Step 21 (#1/#5): the RBI zero-liability clock is 3 WORKING days, not
// 72 flat hours. Add n working days, skipping Sundays (the rule the
// Coach screen states next to the date). Pure — the date is never mutated.
export function addWorkingDays(from: Date, n: number): Date {
  const out = new Date(from);
  let left = n;
  while (left > 0) {
    out.setDate(out.getDate() + 1);
    if (out.getDay() !== 0) left--;
  }
  return out;
}

export interface DeadlineStatus extends Deadline {
  remainingMs: number;
  /** 'pending' = the portal clock cannot start yet — no 1930 call is
   *  recorded, so there is no call time to count 24 hours from. */
  state: 'safe' | 'soon' | 'overdue' | 'pending';
}

// Step 21 (P3/H5): the bank zero-liability due date. Until 31 Dec 2026 the
// RBI rule is 3 working days from the bank's communication; the fraud date
// is the earliest that communication could exist, so counting from it is
// the conservative proxy — and every screen that shows this date says the
// bank's own notice governs. From 1 Jan 2027 the rule is five calendar
// days from the transaction itself, so the switch is date-based.
export function bankDueDate(fraudAt: Date): Date {
  if (fraudAt.getTime() >= new Date(2027, 0, 1).getTime()) {
    return new Date(fraudAt.getTime() + 5 * 86_400_000);
  }
  return addWorkingDays(fraudAt, 3);
}

// 'soon' starts in the last quarter of the window, so the queue can re-order
// before the deadline actually passes.
// Step 21 (P2): the portal clock is anchored to the 1930 call — `calledAt`
// is the ack's saved call time when one exists, otherwise the portal state
// is 'pending' and no countdown is shown (a countdown from the fraud would
// be the wrong rule). The bank clock uses bankDueDate, not 72 flat hours.
export function deadlineStatuses(fraudAt: Date, now: Date, calledAt?: Date | null): DeadlineStatus[] {
  return DEADLINES.map((d) => {
    if (d.id === 'portal' && !calledAt) {
      return { ...d, remainingMs: 0, state: 'pending' as const };
    }
    const due =
      d.id === 'bank' ? bankDueDate(fraudAt).getTime()
      : d.id === 'portal' ? calledAt!.getTime() + d.hours! * 3600_000
      : fraudAt.getTime() + d.hours! * 3600_000;
    const span = due - (d.id === 'portal' ? calledAt!.getTime() : fraudAt.getTime());
    const remainingMs = due - now.getTime();
    const state = remainingMs <= 0 ? 'overdue' : remainingMs <= span * 0.25 ? 'soon' : 'safe';
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
// Step 21 (P2): the portal is urgent only once its clock is actually running
// ('soon'/'overdue') — a 'pending' portal (no 1930 call yet) is not urgent.
export function orderActions(fraudAt: Date, now: Date, credentialShared: boolean, lang: Lang = 'hg', calledAt?: Date | null): ActionItem[] {
  const statuses = deadlineStatuses(fraudAt, now, calledAt);
  const portal = statuses.find((s) => s.id === 'portal')!;
  const portalUrgent = portal.state === 'soon' || portal.state === 'overdue';
  const items: ActionItem[] = [
    { id: 'stop', title: t(lang, 'actStopTitle'), why: t(lang, 'actStopWhy'), urgent: credentialShared },
    { id: 'call1930', title: t(lang, 'actCallTitle'), why: t(lang, 'actCallWhy') },
    { id: 'bank', title: t(lang, 'actBankTitle'), why: t(lang, 'actBankWhy'), step2: true },
    { id: 'portal', title: t(lang, 'actPortalTitle'), why: t(lang, 'actPortalWhy'), urgent: portalUrgent, step2: true },
    { id: 'evidence', title: t(lang, 'actEvidenceTitle'), why: t(lang, 'actEvidenceWhy'), step2: true },
    { id: 'family', title: t(lang, 'actFamilyTitle'), why: t(lang, 'actFamilyWhy'), step2: true },
  ];
  if (portalUrgent) {
    const [p] = items.splice(items.findIndex((i) => i.id === 'portal'), 1);
    items.splice(1, 0, p);
  }
  return items;
}
