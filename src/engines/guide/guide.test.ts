import { describe, expect, it } from 'vitest';
import { GUIDES, guideById, guideForFraudType, guideForShieldRule } from './guide';

describe('situation guide engine', () => {
  it('every guide is complete: title + all five sections with at least 2 items', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(12);
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.recognize.length).toBeGreaterThanOrEqual(2);
      expect(g.firstFiveMinutes.length).toBeGreaterThanOrEqual(2);
      expect(g.reportSteps.length).toBeGreaterThanOrEqual(2);
      expect(g.dontDo.length).toBeGreaterThanOrEqual(2);
      expect(g.evidence.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('guide ids are unique', () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('guideById returns null for unknown ids', () => {
    expect(guideById('not-a-guide')).toBeNull();
    expect(guideById(null)).toBeNull();
    expect(guideById(undefined)).toBeNull();
  });

  it('fraud-type mapping covers every extractor output', () => {
    // Extractor fraud types (src/engines/understanding/extract.ts FRAUD_RULES).
    const extractorTypes = [
      'digital-arrest',
      'remote-access',
      'otp-impersonation',
      'qr-scam',
      'investment-scam',
      'job-scam',
      'phishing-link',
      'unauthorised-debit',
    ];
    for (const type of extractorTypes) {
      expect(guideForFraudType(type), `no guide for ${type}`).not.toBeNull();
    }
    expect(guideForFraudType(null)).toBeNull();
  });

  it('shield-rule mapping covers the common rules and stays null where no guide fits', () => {
    expect(guideForShieldRule('otp-demand')?.id).toBe('otp-scam');
    expect(guideForShieldRule('digital-arrest')?.id).toBe('digital-arrest');
    expect(guideForShieldRule('recovery-promise')?.id).toBe('refund-scam');
    expect(guideForShieldRule('remote-access')?.id).toBe('remote-access');
    expect(guideForShieldRule('kyc-threat')?.id).toBe('kyc-scam');
    expect(guideForShieldRule('prize-lottery')).toBeNull();
    expect(guideForShieldRule('urgency')).toBeNull();
    expect(guideForShieldRule('id-demand')).toBeNull();
    expect(guideForShieldRule(null)).toBeNull();
  });

  it('never promises recovery or a trained model', () => {
    // The guides are fixed rule lists; no copy may claim AI, a trained
    // model, or guaranteed recovery.
    const text = JSON.stringify(GUIDES).toLowerCase();
    expect(text).not.toContain('trained model');
    // Standalone "ai" as a word (not "hai" inside a Hindi sentence).
    expect(text).not.toMatch(/\bai\b/);
    expect(text).not.toContain('paisa wapas milega');
    expect(text).not.toContain('paisa wapas dilayenge');
    expect(text).not.toContain('guaranteed recovery');
  });
});
