import { randomBytes, randomInt } from 'crypto';

/** e.g. "RST-7F3A21" — matches the format used throughout BACKEND-README.md. */
export function generateReference(): string {
  const hex = randomBytes(3).toString('hex').toUpperCase();
  return `RST-${hex}`;
}

/** A 12-digit Remita Retrieval Reference (mock — no real Remita merchant account is used). */
export function generateRrr(): string {
  let digits = '';
  for (let i = 0; i < 12; i++) digits += randomInt(0, 10).toString();
  return digits;
}
