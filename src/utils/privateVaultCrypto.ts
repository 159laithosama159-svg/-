/**
 * Client-Side Zero-Knowledge Vault Cryptography (Web Crypto API)
 * AES-256-GCM authenticated encryption + PBKDF2-SHA256 (210,000 iterations)
 * Works identically in modern browsers and Node 22+ (globalThis.crypto.subtle).
 */

export interface EncryptedVaultEnvelope {
  v: 1;
  alg: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64 (16 bytes)
  iv: string; // base64 (12 bytes)
  ct: string; // base64 ciphertext + auth tag
}

const DEFAULT_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function getSubtleCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('المتصفح الحالي لا يدعم التشفير المحلي Web Crypto API.');
  }
  return c;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const cryptoApi = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedVaultEnvelope(value: unknown): value is EncryptedVaultEnvelope {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    obj.alg === 'AES-GCM-256' &&
    obj.kdf === 'PBKDF2-SHA256' &&
    typeof obj.iter === 'number' &&
    obj.iter >= 10_000 &&
    typeof obj.salt === 'string' &&
    obj.salt.length > 0 &&
    typeof obj.iv === 'string' &&
    obj.iv.length > 0 &&
    typeof obj.ct === 'string' &&
    obj.ct.length > 0
  );
}

export async function encryptVaultPayload<T>(
  payload: T,
  passphrase: string,
  iterations = DEFAULT_ITERATIONS
): Promise<EncryptedVaultEnvelope> {
  const cleanPass = passphrase.trim();
  if (cleanPass.length < 4) {
    throw new Error('يجب أن تتكون كلمة سر الخزنة من 4 أحرف أو أرقام على الأقل.');
  }

  const cryptoApi = getSubtleCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(cleanPass, salt, iterations);

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(payload));
  const cipherBuffer = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintextBytes
  );

  return {
    v: 1,
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iter: iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptVaultPayload<T>(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<T> {
  if (!isEncryptedVaultEnvelope(envelope)) {
    throw new Error('صيغة الخزنة المشفّرة غير صالحة.');
  }
  const cleanPass = passphrase.trim();
  if (!cleanPass) {
    throw new Error('يرجى إدخال كلمة السر لفتح الخزنة.');
  }

  const cryptoApi = getSubtleCrypto();
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ct = base64ToBytes(envelope.ct);
  const key = await deriveAesKey(cleanPass, salt, envelope.iter);

  try {
    const plainBuffer = await cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource
    );
    const jsonText = new TextDecoder().decode(plainBuffer);
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error('كلمة السر غير صحيحة — تعذّر فك تشفير الخزنة.');
  }
}
