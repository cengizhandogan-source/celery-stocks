import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.EXCHANGE_KEY_ENCRYPTION_SECRET;
  if (hex && hex.length === 64) {
    return Buffer.from(hex, 'hex');
  }
  // Derive deterministically from OpenAI key as fallback
  const seed = process.env.OPENAI_API_KEY;
  if (!seed) {
    throw new Error('Set EXCHANGE_KEY_ENCRYPTION_SECRET or OPENAI_API_KEY');
  }
  return createHash('sha256').update(`celery-exchange-enc:${seed}`).digest();
}

export function encrypt(plaintext: string): { ciphertext: Buffer; iv: Buffer } {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, authTag]),
    iv,
  };
}

export function decrypt(ciphertext: Buffer, iv: Buffer): string {
  const key = getKey();
  const authTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
  const encrypted = ciphertext.subarray(0, ciphertext.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final('utf8');
}
