const feedback = {
  queued: {
    label: 'Email queued', heading: 'Invitation created', tone: 'info', icon: 'clock',
    description: 'We’ll send the email in the background. You can close this dialog or share the link now.',
  },
  sending: {
    label: 'Sending email', heading: 'Sending your invitation', tone: 'info', icon: 'send',
    description: 'Your invitation is ready. We’re sending the email now.',
  },
  sent: {
    label: 'Email sent', heading: 'Invitation email sent', tone: 'success', icon: 'check',
    description: 'Inbox delivery may take a moment. The recipient can also check their spam folder.',
  },
  retrying: {
    label: 'Delivery delayed', heading: 'Email delivery delayed', tone: 'warning', icon: 'clock',
    description: 'We couldn’t send the email yet. We’ll retry automatically; you can share the link now.',
  },
  failed: {
    label: 'Email failed', heading: 'Email couldn’t be sent', tone: 'warning', icon: 'alert',
    description: 'The invitation is still valid. Copy the link and share it directly.',
  },
  disabled: {
    label: 'Email unavailable', heading: 'Invitation link ready', tone: 'neutral', icon: 'mail',
    description: 'Automatic email delivery is unavailable. Share the invitation link directly.',
  },
  cancelled: {
    label: 'Email cancelled', heading: 'Email cancelled', tone: 'neutral', icon: 'info',
    description: 'Automatic email delivery has stopped. You can still share this active invitation link.',
  },
  not_sent: {
    label: 'Email not sent', heading: 'Invitation link ready', tone: 'warning', icon: 'alert',
    description: 'The email wasn’t queued. Copy the invitation link and share it directly.',
  },
};

export const pendingEmailStatuses = ['queued', 'sending', 'retrying'];
export const emailFeedback = (status) => feedback[status] || feedback.not_sent;

export function deliveryTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}
