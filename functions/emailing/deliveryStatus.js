import { emailEnabled } from './transport.js';

// Only delivery metadata leaves the outbox; message content and SMTP errors stay private.
export function emailDeliveryStatus(mail) {
  let status = mail?.status;
  if (status === 'pending') status = mail.attempts ? 'retrying' : 'queued';
  if (status === 'processing') status = 'sending';
  if (!['sent', 'failed', 'cancelled'].includes(status) && !emailEnabled()) status = 'disabled';
  return {
    emailStatus: status || 'not_sent',
    sentAt: status === 'sent' ? mail.sentAt || null : null,
    nextAttemptAt: status === 'retrying' ? mail.nextAttemptAt || null : null,
  };
}
