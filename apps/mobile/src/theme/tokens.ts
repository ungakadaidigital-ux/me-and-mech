/**
 * PKG-038 — Design Tokens. LOCKED — do not change these values without a
 * recorded founder decision, same rule as the shared package constants.
 */
export const Colors = {
  primary: '#FF6B00', // Mechanic Orange — LOCKED
  primaryDark: '#CC5500',
  success: '#27AE60',
  error: '#E53935',
  warning: '#F39C12',
  background: '#F7F7F7',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E0E0E0',
  offlineYellow: '#FFC107',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

/**
 * Typography — Noto Sans Tamil is MANDATORY for all Tamil-bearing text
 * (which is most of the app). Amounts use Roboto Mono specifically so
 * currency figures align vertically in lists — this is a deliberate
 * exception to the Tamil-font rule, digits don't need Tamil glyphs.
 *
 * CRITICAL: fonts must be fully loaded (awaited) before ANY screen
 * renders — see App.tsx. An unawaited font promise means Tamil text
 * flashes in the system default font on first paint, which is extremely
 * visible on Android and undermines the "Tamil-first" positioning in the
 * first three seconds of every session.
 */
export const Typography = {
  body1: { fontFamily: 'NotoSansTamil_400Regular', fontSize: 16, lineHeight: 24 },
  body2: { fontFamily: 'NotoSansTamil_400Regular', fontSize: 14, lineHeight: 20 },
  heading1: { fontFamily: 'NotoSansTamil_700Bold', fontSize: 22, lineHeight: 28 },
  heading2: { fontFamily: 'NotoSansTamil_700Bold', fontSize: 18, lineHeight: 24 },
  caption: { fontFamily: 'NotoSansTamil_400Regular', fontSize: 12, lineHeight: 16 },
  amount: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, lineHeight: 26 },
  amountSmall: { fontFamily: 'RobotoMono_400Regular', fontSize: 14, lineHeight: 18 },
} as const;

export const amountFormatting = {
  currency: 'INR',
  locale: 'en-IN',
} as const;
