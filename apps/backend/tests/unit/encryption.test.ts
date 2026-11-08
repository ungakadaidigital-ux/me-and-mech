import { describe, it, expect } from 'vitest';
import { encryptField, decryptField } from '../../src/lib/encryption';

describe('AES-256-GCM field encryption', () => {
  it('round-trips ASCII and Tamil text', () => {
    for (const text of ['33AABCU9603R1ZJ', 'ramesh@upi', 'முருகன் ஆட்டோ']) {
      expect(decryptField(encryptField(text))).toBe(text);
    }
  });
  it('uses a fresh IV, so the same input never encrypts the same way twice', () => {
    expect(encryptField('same')).not.toBe(encryptField('same'));
  });
  it('rejects a tampered ciphertext (GCM auth tag)', () => {
    const [iv, tag, data] = encryptField('secret').split(':');
    const flipped = (data[0] === '0' ? '1' : '0') + data.slice(1);
    expect(() => decryptField(`${iv}:${tag}:${flipped}`)).toThrow();
  });
  it('rejects a malformed value', () => {
    expect(() => decryptField('not-encrypted')).toThrow();
  });
});
