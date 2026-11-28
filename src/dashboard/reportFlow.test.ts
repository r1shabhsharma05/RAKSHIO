// Step 16 (bug 9): the confirm gate must ask Bank as a 4th question —
// an incident with no bank (or a low-confidence bank) must list 'bank'
// among its gaps, and the summary must name the bank when known.
import { describe, expect, it } from 'vitest';
import { computeGaps } from './ReportFlow';
import { extractIncident } from '../engines/understanding/extract';
import { DEMO_TRANSCRIPT } from '../demo/seed';

describe('step 16: confirm gate asks Bank', () => {
  it('asks Bank when the transcript names no bank', () => {
    const { incident } = extractIncident('Mere account se kal bees hazaar rupaye kat gaye');
    expect(incident.bank.value).toBeNull();
    expect(computeGaps(incident)).toContain('bank');
  });

  it('does not ask Bank when SBI is captured with confidence', () => {
    const { incident } = extractIncident('Mere SBI account se kal bees hazaar rupaye kat gaye');
    expect(incident.bank.value).toBe('SBI');
    expect(computeGaps(incident)).not.toContain('bank');
  });

  it('the confirm gate covers four fields', () => {
    const { incident } = extractIncident('kuch samajh nahi aaya');
    expect(computeGaps(incident)).toEqual(
      expect.arrayContaining(['amount', 'fraudAt', 'method', 'bank']),
    );
  });
});

// Step 19 (A4): OTP sharing is asked whenever it was not detected, so the
// Step 18 OTP alert is reachable through the guided flow — not only when
// the user volunteers a matching phrase in the first transcript.
describe('step 19: OTP sharing is asked when not detected', () => {
  it('asks OTP when the transcript never mentions it', () => {
    const { incident } = extractIncident('Mere SBI account se kal shaam 7 baje bees hazaar rupaye kat gaye');
    expect(incident.credentialShared).toBe(false);
    expect(computeGaps(incident)).toContain('otp');
  });

  it('does not ask OTP when sharing was detected', () => {
    const { incident } = extractIncident(DEMO_TRANSCRIPT);
    expect(incident.credentialShared).toBe(true);
    expect(computeGaps(incident)).not.toContain('otp');
  });
});
