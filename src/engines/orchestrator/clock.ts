import { DEADLINES, type Deadline } from './deadlines.config';

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

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)} din ${h % 24} ghante`;
  if (h > 0) return `${h} ghante ${m} min`;
  if (m > 0) return `${m} min ${s} sec`;
  return `${s} sec`;
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
export function orderActions(fraudAt: Date, now: Date, credentialShared: boolean): ActionItem[] {
  const statuses = deadlineStatuses(fraudAt, now);
  const portal = statuses.find((s) => s.id === 'portal')!;
  const items: ActionItem[] = [
    { id: 'stop', title: 'Aage ka nuksan rokein', why: 'Card/UPI block karein, taaki aur paise na niklein.', urgent: credentialShared },
    { id: 'call1930', title: '1930 par call karein', why: 'Turant report se fund freeze ka chance banta hai.' },
    { id: 'bank', title: 'Bank ko suchit karein', why: 'Bank ko jaldi batane se dispute aur zero liability ka rasta khulta hai.', step2: true },
    { id: 'portal', title: 'cybercrime.gov.in par complaint poori karein', why: '1930 ke baad 24 ghante me online complaint poori karni hoti hai.', urgent: portal.state !== 'safe', step2: true },
    { id: 'evidence', title: 'Saboot sambhalein', why: 'Screenshot aur SMS abhi save karein, baad me milte nahi.', step2: true },
    { id: 'family', title: 'Parivar ko batayein', why: 'Koi apna saath ho to kadam lena aasan hota hai.', step2: true },
  ];
  if (portal.state !== 'safe') {
    const [p] = items.splice(items.findIndex((i) => i.id === 'portal'), 1);
    items.splice(1, 0, p);
  }
  return items;
}
