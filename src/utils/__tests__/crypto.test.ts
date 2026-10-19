import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey } from '../crypto';

describe('Web Crypto AES-GCM BYOK Vault', () => {
  it('encrypts and decrypts API key back to original plaintext', async () => {
    const rawKey = 'sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = await encryptApiKey(rawKey);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await decryptApiKey(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it('handles empty input gracefully', async () => {
    const emptyEncrypted = await encryptApiKey('');
    expect(emptyEncrypted).toBe('');

    const emptyDecrypted = await decryptApiKey('');
    expect(emptyDecrypted).toBe('');
  });

  it('handles plaintext fallback if string is unencrypted or legacy', async () => {
    const plain = 'unencrypted-token-123';
    const result = await decryptApiKey(plain);
    expect(result).toBe(plain);
  });
});
