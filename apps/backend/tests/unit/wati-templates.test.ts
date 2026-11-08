import { describe, it, expect } from 'vitest';
import { WATI_TEMPLATES, trialReminderTemplateForDaysLeft } from '../../src/config/wati-templates';

describe('trial reminder schedule (locked: 14 / 7 / 3 / 1 / expiry)', () => {
  it('maps days-left to the correct template', () => {
    expect(trialReminderTemplateForDaysLeft(14)).toBe(WATI_TEMPLATES.TRIAL_14_DAYS);
    expect(trialReminderTemplateForDaysLeft(7)).toBe(WATI_TEMPLATES.TRIAL_7_DAYS);
    expect(trialReminderTemplateForDaysLeft(3)).toBe(WATI_TEMPLATES.TRIAL_3_DAYS);
    expect(trialReminderTemplateForDaysLeft(1)).toBe(WATI_TEMPLATES.TRIAL_1_DAY);
    expect(trialReminderTemplateForDaysLeft(0)).toBe(WATI_TEMPLATES.TRIAL_EXPIRED);
  });
  it('sends nothing on any other day', () => {
    for (const d of [30, 20, 13, 10, 5, 4, 2, -1]) {
      expect(trialReminderTemplateForDaysLeft(d)).toBeNull();
    }
  });
  it('every template name carries the me_mech_ prefix', () => {
    for (const name of Object.values(WATI_TEMPLATES)) {
      expect(name.startsWith('me_mech_')).toBe(true);
    }
  });
});
