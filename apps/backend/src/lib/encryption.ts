import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

/**
 * PKG-052 — Field Encryption (AES-256-GCM), per the locked spec:
 *   Encrypted at rest: customer.phone, workshop.gstNumber, workshop.upiId
 *   NOT encrypted: amounts, dates, status fields, job descriptions
 *
 * Key: 256-bit from ENCRYPTION_KEY (already required in env.ts).
 *
 * Storage format: `${ivHex}:${authTagHex}:${ciphertextHex}` — self-
 * contained per value, no shared state needed to decrypt.
 *
 * SCOPE NOTE: applied here to workshop.gstNumber / workshop.upiId, which
 * are write-and-display fields (never filtered/searched on). customer.phone
 * is NOT encrypted at rest in this delivery — it's queried by exact match
 * constantly (findByPhone, the UNIQUE(workshop_id, phone) constraint,
 * duplicate detection). AES-GCM is non-deterministic (random IV per call),
 * so an encrypted phone column can't be searched with `.eq()` without a
 * separate deterministic lookup (e.g. an HMAC-SHA256 `phone_hash` column,
 * indexed, checked in addition to decrypting matches). That's a real
 * migration + repository rewrite, not a config flag — flagging it as the
 * next security follow-up rather than either skipping the requirement
 * silently or applying a naive encryption that would break customer
 * dedup/search in production.
 */
const ALGORITHM = 'aes-256-gcm';

export function encryptField(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(stored: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Malformed encrypted field value');
  }
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf-8');
}
