/** Indian mobile number: 10 digits, optionally prefixed with +91 or 91. */
export function isValidIndianPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return `+91${local}`;
}

/** Tamil Nadu vehicle registration format: TN followed by 2 digits, 1-2 letters, 4 digits. */
export function isValidTnVehicleNumber(input: string): boolean {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  return /^TN\d{2}[A-Z]{1,2}\d{4}$/.test(cleaned);
}

export function isValidReferralCode(input: string): boolean {
  return /^MM-[A-Z0-9]{5,8}$/.test(input.trim().toUpperCase());
}
