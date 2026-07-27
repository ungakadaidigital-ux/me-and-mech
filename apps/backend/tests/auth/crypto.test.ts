import { describe, it, expect } from 'vitest';
import { hashSecret, verifySecret, generateOtp, generateOpaqueToken } from '../../src/lib/crypto';

describe('crypto', () => {
  it('verifies a correct secret against its hash', () => {
    const hash = hashSecret('123456');
    expect(verifySecret('123456', hash)).toBe(true);
  });

  it('rejects an incorrect secret', () => {
    const hash = hashSecret('123456');
    expect(verifySecret('000000', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt) even for the same input', () => {
    const a = hashSecret('123456');
    const b = hashSecret('123456');
    expect(a).not.toBe(b);
    expect(verifySecret('123456', a)).toBe(true);
    expect(verifySecret('123456', b)).toBe(true);
  });

  it('generates a 6-digit numeric OTP', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates a sufficiently long opaque refresh token', () => {
    const token = generateOpaqueToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
  });
});
