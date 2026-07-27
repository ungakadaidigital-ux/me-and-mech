/**
 * Standard API response envelope. Every backend route responds with one of
 * these two shapes — the mobile client never has to guess the error format.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string; // e.g. ERR_VALIDATION_FAILED, ERR_SUBSCRIPTION_EXPIRED
    message: string; // safe to show the user (Tamil or English per context)
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Known error codes — extend here, do not invent ad-hoc strings in route handlers. */
export const ErrorCode = {
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
  SUBSCRIPTION_EXPIRED: 'ERR_SUBSCRIPTION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSION: 'ERR_AUTH_INSUFFICIENT_PERMISSION',
  NOT_FOUND: 'ERR_NOT_FOUND',
  DUPLICATE_PHONE: 'ERR_DUPLICATE_PHONE',
  DUPLICATE_VEHICLE_NUMBER: 'ERR_DUPLICATE_VEHICLE_NUMBER',
  INVALID_OTP: 'ERR_INVALID_OTP',
  OTP_EXPIRED: 'ERR_OTP_EXPIRED',
  OTP_DELIVERY_FAILED: 'ERR_OTP_DELIVERY_FAILED',
  RATE_LIMIT: 'ERR_RATE_LIMIT',
  VOICE_TRIAL_BLOCKED: 'ERR_VOICE_TRIAL_BLOCKED',
  VOICE_TRANSCRIPTION_FAILED: 'ERR_VOICE_TRANSCRIPTION_FAILED',
  WHATSAPP_FAILED: 'ERR_WHATSAPP_FAILED',
  TRIAL_USER_VOICE_LOCKED: 'ERR_TRIAL_USER_VOICE_LOCKED',
  INTERNAL: 'ERR_INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
