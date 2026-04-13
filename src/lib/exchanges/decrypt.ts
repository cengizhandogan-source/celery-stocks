import { decrypt } from './encryption';

const IV_LENGTH = 12;

export function decodeBytea(value: string): Buffer {
  const hex = value.startsWith('\\x') ? value.slice(2) : value;
  return Buffer.from(hex, 'hex');
}

export function decryptBundle(raw: string): string {
  const bundle = decodeBytea(raw);
  const iv = bundle.subarray(0, IV_LENGTH);
  const ciphertext = bundle.subarray(IV_LENGTH);
  return decrypt(ciphertext, iv);
}
