import crypto from 'node:crypto';

function encryptionKey() {
  const secret = process.env.EMAIL_ENCRYPTION_KEY || process.env.TEST_TOKEN_SECRET;
  if (!secret) throw new Error('An email encryption key is required.');
  return crypto.hkdfSync('sha256', secret, 'abyuday-email-outbox', 'payload-v1', 32);
}

export function sealPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}

export function openPayload(payload) {
  if (payload?.version !== 1) throw new Error('Invalid email payload.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8'));
}
