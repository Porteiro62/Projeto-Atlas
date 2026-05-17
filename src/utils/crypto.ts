import crypto from 'node:crypto';

/**
 * Derives a secure 256-bit (32-byte) key from a user PIN and salt using PBKDF2.
 */
export function deriveKeyFromPin(pin: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256');
}

/**
 * Hashes a PIN securely using PBKDF2 for verification.
 */
export function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha256').toString('hex');
}

/**
 * Encrypts a Buffer using AES-256-GCM with the derived key.
 * Prepends the 12-byte IV and 16-byte Auth Tag to the encrypted data.
 */
export function encryptBuffer(buffer: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine into a single payload: IV (12 bytes) + TAG (16 bytes) + Encrypted Data
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypts a Buffer using AES-256-GCM with the derived key.
 * Assumes the first 12 bytes are the IV and the next 16 bytes are the Auth Tag.
 */
export function decryptBuffer(buffer: Buffer, key: Buffer): Buffer {
  if (buffer.length < 28) {
    throw new Error('Invalid encrypted payload size.');
  }

  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
