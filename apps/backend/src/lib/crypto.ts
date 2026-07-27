import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Generic secret hashing (OTPs, refresh tokens) using scrypt — no extra
 * native dependency (bcrypt) needed, node:crypto ships with Node 20.
 */
export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(':');
  if (!salt || !derivedHex) return false;
  const derived = scryptSync(secret, salt, 64);
  const storedBuf = Buffer.from(derivedHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

export function generateOtp(): string {
  // 6-digit numeric OTP, avoids leading-zero ambiguity issues by padding.
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, '0');
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}
