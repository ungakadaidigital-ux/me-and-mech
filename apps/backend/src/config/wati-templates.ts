/**
 * PKG-031 — Wati Template Registry.
 * Template names must match EXACTLY what's approved in the Wati/Meta
 * dashboard. All `me_mech_` prefixed per the locked naming convention
 * (was `mechanix_` in the original draft — renamed with the product).
 * LAUNCH BLOCKER: all 11 templates must be submitted to Meta at least
 * 2 weeks before launch; Tamil templates submitted separately from English.
 */
export const WATI_TEMPLATES = {
  TRIAL_14_DAYS: 'me_mech_trial_14days',
  TRIAL_7_DAYS: 'me_mech_trial_7days',
  TRIAL_3_DAYS: 'me_mech_trial_3days',
  TRIAL_1_DAY: 'me_mech_trial_1day',
  TRIAL_EXPIRED: 'me_mech_trial_expired',
  RENEWAL_7_DAYS: 'me_mech_renewal_7days',
  PAYMENT_SUCCESS: 'me_mech_payment_success',
  PAYMENT_FAILED: 'me_mech_payment_failed',
  GRACE_REMINDER_DAY1: 'me_mech_grace_day1',
  GRACE_REMINDER_DAY3: 'me_mech_grace_day3',
  WIN_BACK: 'me_mech_winback_offer',
  INVOICE_DELIVERY: 'me_mech_invoice_delivery',
  ONBOARDING_D1: 'me_mech_onboarding_d1',
  REFERRAL_REWARD: 'me_mech_referral_reward',
} as const;

export type WatiTemplateId = (typeof WATI_TEMPLATES)[keyof typeof WATI_TEMPLATES];

/** Maps days-left-in-trial to the correct reminder template, per the locked trial reminder schedule. */
export function trialReminderTemplateForDaysLeft(daysLeft: number): WatiTemplateId | null {
  switch (daysLeft) {
    case 14:
      return WATI_TEMPLATES.TRIAL_14_DAYS;
    case 7:
      return WATI_TEMPLATES.TRIAL_7_DAYS;
    case 3:
      return WATI_TEMPLATES.TRIAL_3_DAYS;
    case 1:
      return WATI_TEMPLATES.TRIAL_1_DAY;
    case 0:
      return WATI_TEMPLATES.TRIAL_EXPIRED;
    default:
      return null;
  }
}
