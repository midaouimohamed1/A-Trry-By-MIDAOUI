/**
 * Client-Side Web Crypto API Utility for BYOK Key Encryption
 * Encrypts API keys in-memory / sessionStorage using AES-GCM (256-bit).
 * Derives dynamic cryptographic keys bound to the active browser session.
 */

const SESSION_SALT_KEY = 'byok_crypto_salt_v1';
let inMemorySaltStr: string | null = null;

// Retrieves or initializes a volatile session salt
function getOrCreateSessionSalt(): Uint8Array {
  try {
    let saltStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_SALT_KEY) : inMemorySaltStr;
    if (!saltStr) {
      const salt = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(salt);
      } else {
        for (let i = 0; i < 16; i++) salt[i] = Math.floor(Math.random() * 256);
      }
      saltStr = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      inMemorySaltStr = saltStr;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_SALT_KEY, saltStr);
      }
    }
    const match = saltStr.match(/.{1,2}/g) || [];
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
  } catch {
    if (!inMemorySaltStr) {
      inMemorySaltStr = '0123456789abcdef0123456789abcdef';
    }
    const match = inMemorySaltStr.match(/.{1,2}/g) || [];
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
  }
}

// Derives an AES-GCM 256-bit key from the session context
async function deriveSessionKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }
  const salt = getOrCreateSessionSalt();
  const sessionSecret = `${typeof window !== 'undefined' ? window.location.origin : 'app'}_byok_vault_${salt.join('-')}`;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plain text (e.g. API key) with AES-GCM using Web Crypto API.
 * Returns base64 encoded ciphertext with IV.
 */
export async function encryptApiKey(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== 'string') return '';
  try {
    const key = await deriveSessionKey();
    if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
      return plainText;
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.warn('Web Crypto Encryption fallback:', err);
    return plainText; // Safe fallback if Web Crypto is unavailable in non-secure context
  }
}

/**
 * Decrypts base64 encoded ciphertext back to plain text with AES-GCM.
 */
export async function decryptApiKey(cipherTextBase64: string): Promise<string> {
  if (!cipherTextBase64 || typeof cipherTextBase64 !== 'string') return '';
  try {
    const key = await deriveSessionKey();
    if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
      return cipherTextBase64;
    }
    const binary = atob(cipherTextBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length <= 12) return cipherTextBase64;

    const iv = bytes.slice(0, 12);
    const cipherData = bytes.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    // If it's legacy unencrypted plaintext or cannot be decrypted, return as is
    return cipherTextBase64;
  }
}
