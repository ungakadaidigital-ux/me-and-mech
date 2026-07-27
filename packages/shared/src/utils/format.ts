/** Format a numeric/string amount as Indian Rupees, e.g. "₹1,234.50". Amounts travel as strings to preserve precision — never coerce through JS float math for money. */
export function formatInr(amount: string | number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

/** Auto-generated invoice number: {shopPrefix}-{year}-{sequence}, e.g. MG-2025-001 */
export function buildInvoiceNumber(shopPrefix: string, year: number, sequence: number): string {
  return `${shopPrefix.toUpperCase()}-${year}-${String(sequence).padStart(3, '0')}`;
}

/** Generate a referral code candidate: MM- + 5 uppercase alphanumeric chars. Caller must still check DB uniqueness (this function has no collision detection). */
export function generateReferralCodeCandidate(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MM-${code}`;
}
