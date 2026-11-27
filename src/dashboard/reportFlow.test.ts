// Step 16 (bug 9): the confirm gate must ask Bank as a 4th question —
// an incident with no bank (or a low-confidence bank) must list 'bank'
// among its gaps, and the summary must name the bank when known.
import { describe, expect, it } from 'vitest';
import { computeGaps } from './ReportFlow';
import { extractIncident } from '../engines/understanding/extract';

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
