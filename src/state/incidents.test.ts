// Step 16 (bug 13): Caregiver mode must default OFF until the user enables
// it — a fresh install must never show caregiver UI uninvited. Also pins
// that every incident status has a language key (bug 2).
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, INCIDENT_STATUSES, STATUS_KEY } from './incidents';
import { t } from '../i18n';

describe('step 16: safe defaults', () => {
  it('caregiver mode defaults OFF', () => {
    expect(DEFAULT_SETTINGS.caregiver).toBe(false);
  });

  it('every status has an English and Hindi label', () => {
    for (const s of INCIDENT_STATUSES) {
      const key = STATUS_KEY[s];
      expect(t('en', key)).not.toBe(key);
      expect(t('hi', key)).not.toBe(key);
      expect(t('hg', key)).not.toBe(key);
    }
  });
});
