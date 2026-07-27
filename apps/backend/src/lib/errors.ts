import { ErrorCode, type ErrorCodeValue } from '@me-and-mech/shared';

/**
 * PKG-008 — Error Handling Architecture
 *
 * Every thrown error in route/service code should be an AppError (or a
 * subclass). Anything else that reaches the final error handler is treated
 * as an unexpected 500 and reported to Sentry — it should never happen in
 * steady state, and if it does, that's a bug to fix, not a shape to support.
 */

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational = true; // distinguishes "expected" errors from bugs

  constructor(code: ErrorCodeValue, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }
}

export class SubscriptionExpiredError extends AppError {
  constructor() {
    super(
      ErrorCode.SUBSCRIPTION_EXPIRED,
      'உங்கள் Me & Mech data பாதுகாப்பாக உள்ளது. புதிய jobs உருவாக்க, upgrade செய்யுங்கள்.',
      402,
    );
  }
}

export class InsufficientPermissionError extends AppError {
  constructor() {
    super(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'You do not have permission to perform this action', 403);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(ErrorCode.RATE_LIMIT, 'Too many requests. Please try again later.', 429, { retryAfterSeconds });
  }
}

export class ThirdPartyOtpDeliveryError extends AppError {
  constructor() {
    super(ErrorCode.OTP_DELIVERY_FAILED, 'OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்', 502);
  }
}

export class InvalidOtpError extends AppError {
  constructor(attemptsLeft: number) {
    super(ErrorCode.INVALID_OTP, 'தவறான OTP. மீண்டும் முயற்சிக்கவும்', 401, { attemptsLeft });
  }
}

export class OtpExpiredError extends AppError {
  constructor() {
    super(ErrorCode.OTP_EXPIRED, 'OTP காலாவதியானது. மீண்டும் அனுப்பவும்', 410);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.DUPLICATE_PHONE, message, 409, details);
  }
}

export class DuplicateVehicleNumberError extends AppError {
  constructor(details?: unknown) {
    super(ErrorCode.DUPLICATE_VEHICLE_NUMBER, 'A vehicle with this registration number already exists', 409, details);
  }
}

/**
 * Cost Control Gate — Non-Negotiable (PKG-030). Trial users get IDENTICAL
 * features to paid subscribers everywhere EXCEPT voice, which costs real
 * money per call (Sarvam AI + GPT-4o-mini) — this is the one deliberate
 * exception to the "zero degradation during trial" rule, and it must never
 * be relaxed without a business decision, not an engineering shortcut.
 */
export class VoiceTrialBlockedError extends AppError {
  constructor() {
    super(
      ErrorCode.VOICE_TRIAL_BLOCKED,
      'Voice billing trial period-ல் இல்லை. Subscribe செய்து voice billing-ஐ பயன்படுத்துங்கள்',
      402,
    );
  }
}

export class VoiceTranscriptionError extends AppError {
  constructor(details?: unknown) {
    super(ErrorCode.VOICE_TRANSCRIPTION_FAILED, 'குரல் அடையாளம் காணப்படவில்லை. கைமுறையாக உள்ளிடவும்', 502, details);
  }
}
