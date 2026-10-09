import nodemailer from 'nodemailer';

export function applicationUrl() {
  const value = process.env.APP_URL || process.env.CLIENT_ORIGIN || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4040' : '');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}

export function emailEnabled() {
  return process.env.EMAIL_ENABLED !== 'false' && !!process.env.SMTP_USER && !!process.env.SMTP_PASS && !!applicationUrl();
}

export function createMailTransport() {
  return nodemailer.createTransport({
    ...(process.env.SMTP_HOST ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
    } : { service: process.env.SMTP_SERVICE || 'gmail' }),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  });
}
