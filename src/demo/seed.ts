// Seeded demo story (₹20,000 unauthorised UPI debit). A test aid so the loop
// runs without a microphone; it is not Judge Mode (Step 2).
export const DEMO_TRANSCRIPT =
  'Mere account se bees hazaar kat gaye. Mujhe ek customer-care number se call aaya tha, OTP manga, phir paise nikal gaye. Kal subah das baje HDFC se UPI se gaye. UTR 432109876543.';

import type { StoredIncident } from '../state/store';

// Step 21 (D4): the seeded demo used to carry yesterday's fraud time, so
// a cold open showed "Time over" on every deadline chip. A demo incident
// is always 20 minutes old — the golden hour is live whenever a judge
// opens it. The display string is rebuilt from the same date, so the
// when-line and the stored Date never disagree. demo:true marks the
// incident as fictional everywhere it is shown (D2 sandbox).
export function makeDemoFresh(s: StoredIncident, now = new Date()): StoredIncident {
  const fraudAt = new Date(now.getTime() - 20 * 60_000);
  const hour12 = fraudAt.getHours() % 12 === 0 ? 12 : fraudAt.getHours() % 12;
  return {
    ...s,
    fraudAt: fraudAt.toISOString(),
    fraudAtDisplay: `aaj, ${hour12} baje`,
    demo: true,
  };
}
