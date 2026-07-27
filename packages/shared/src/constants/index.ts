/**
 * Me & Mech — Shared Constants
 * These values are LOCKED product decisions. Do not change without an
 * explicit founder decision recorded — see project decision log.
 */

export const PRODUCT_NAME = 'Me & Mech';
export const PARENT_COMPANY = 'Unga Kadai Digital';

export const DOMAINS = {
  app: 'meandmech.ungakadaidigital.com',
  api: 'api.meandmech.ungakadaidigital.com',
  deepLinkScheme: 'meandmech://',
} as const;

export const PRICING = {
  monthlyInr: 499,
  annualInr: 4999,
} as const;

export const TRIAL = {
  durationDays: 30,
  dayOneUpgradeOfferDay: 28, // genuine one-time offer, non-repeatable, tied to user_id
  gracePeriodOnHolidayDays: 2, // if Day 30 falls on Sunday/holiday
} as const;

export const REFERRAL = {
  codePrefix: 'MM-', // NOT "MX-" — corrected from early draft
  codeLength: 5, // characters after prefix, e.g. MM-A7K2Q
  successWindowDays: 7, // referee must create 3 job cards within this window
  successJobCardThreshold: 3,
  maxFreeCreditMonths: 6, // cap before switching to permanent discount
  linkExpiryDays: 90,
  tiers: {
    1: { rewardType: 'days_15', valueDays: 15 },
    3: { rewardType: 'month_1', valueDays: 30 },
    5: { rewardType: 'month_2', valueDays: 60 },
    10: { rewardType: 'discount_20', valueDays: null },
  } as const,
} as const;

export const WATI_TEMPLATE_PREFIX = 'me_mech_';

export const RATE_LIMITS = {
  requestOtp: { limit: 3, windowMinutes: 10 },
  verifyOtp: { limit: 5, windowMinutes: 5 },
  voiceTranscribe: { limit: 20, windowMinutes: 60 },
  referralApply: { limit: 3, windowHours: 24 },
  default: { limit: 200, windowMinutes: 1 },
} as const;

export const VOICE = {
  paidEngine: 'sarvam_saarika_v2',
  trialEngine: 'expo_speech_totext',
  audioRetentionHours: 24,
  transcribeAlertThresholdSeconds: 10,
} as const;

export const PLATFORM = {
  framework: 'expo-react-native',
  osScope: 'android-only', // no iOS planned for MVP
  expoSdk: 51,
} as const;
