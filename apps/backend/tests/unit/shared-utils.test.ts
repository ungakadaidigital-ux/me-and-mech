import { describe, it, expect } from 'vitest';
import {
  isValidIndianPhone,
  normalizeIndianPhone,
  isValidTnVehicleNumber,
  isValidReferralCode,
  formatInr,
  buildInvoiceNumber,
  generateReferralCodeCandidate,
} from '@me-and-mech/shared';

describe('phone utils', () => {
  it('accepts 10-digit numbers starting 6-9, with or without +91', () => {
    expect(isValidIndianPhone('9840012345')).toBe(true);
    expect(isValidIndianPhone('+91 98400 12345')).toBe(true);
    expect(isValidIndianPhone('919840012345')).toBe(true);
  });
  it('rejects short numbers and numbers starting 0-5', () => {
    expect(isValidIndianPhone('984001234')).toBe(false);
    expect(isValidIndianPhone('5840012345')).toBe(false);
    expect(isValidIndianPhone('')).toBe(false);
  });
  it('normalizes every accepted variant to +91XXXXXXXXXX', () => {
    expect(normalizeIndianPhone('9840012345')).toBe('+919840012345');
    expect(normalizeIndianPhone('+91 98400 12345')).toBe('+919840012345');
    expect(normalizeIndianPhone('919840012345')).toBe('+919840012345');
  });
});

describe('vehicle number', () => {
  it('accepts TN plates in spaced, lowercase and compact form', () => {
    expect(isValidTnVehicleNumber('TN37AB1234')).toBe(true);
    expect(isValidTnVehicleNumber('tn 37 ab 1234')).toBe(true);
    expect(isValidTnVehicleNumber('TN09A1234')).toBe(true);
  });
  it('rejects non-TN and malformed plates', () => {
    expect(isValidTnVehicleNumber('KA01AB1234')).toBe(false);
    expect(isValidTnVehicleNumber('TN37AB12')).toBe(false);
  });
});

describe('referral code', () => {
  it('uses the MM- prefix, not the retired MX- prefix', () => {
    expect(isValidReferralCode('MM-A7K2Q')).toBe(true);
    expect(isValidReferralCode('mm-a7k2q')).toBe(true);
    expect(isValidReferralCode('MX-A7K2Q')).toBe(false);
  });
  it('generated candidates always validate and never use ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCodeCandidate();
      expect(code).toMatch(/^MM-[A-HJ-NP-Z2-9]{5}$/);
      expect(isValidReferralCode(code)).toBe(true);
    }
  });
});

describe('money and invoice numbers', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatInr('1234.5')).toContain('1,234.5');
    expect(formatInr(100000)).toContain('1,00,000');
  });
  it('falls back to ₹0 for non-numeric input instead of NaN', () => {
    expect(formatInr('abc')).toBe('₹0');
  });
  it('builds prefix-year-sequence invoice numbers', () => {
    expect(buildInvoiceNumber('mg', 2025, 1)).toBe('MG-2025-001');
    expect(buildInvoiceNumber('MG', 2026, 42)).toBe('MG-2026-042');
  });
});
