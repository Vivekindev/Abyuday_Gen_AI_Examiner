import PropTypes from 'prop-types';
import { FiAlertCircle, FiCheckCircle, FiClock, FiInfo, FiMail, FiSend } from 'react-icons/fi';
import { deliveryTime, emailFeedback } from '../lib/emailDelivery';

const icons = { alert: FiAlertCircle, check: FiCheckCircle, clock: FiClock, info: FiInfo, mail: FiMail, send: FiSend };

export default function EmailDeliveryStatus({ status, sentAt, nextAttemptAt }) {
  const feedback = emailFeedback(status);
  const Icon = icons[feedback.icon];
  const time = deliveryTime(status === 'sent' ? sentAt : status === 'retrying' ? nextAttemptAt : null);
  const detail = status === 'sent'
    ? `Accepted by the email provider${time ? ` on ${time}` : ''}. Inbox delivery may take a moment.`
    : status === 'retrying' && time ? `Next automatic retry: ${time}.` : feedback.label;
  return (
    <span className="email-delivery-badge" data-tone={feedback.tone} title={detail}>
      <Icon aria-hidden="true" />
      {feedback.label}
      {['sent', 'retrying'].includes(status) && <span className="sr-only">. {detail}</span>}
    </span>
  );
}

EmailDeliveryStatus.propTypes = {
  status: PropTypes.string,
  sentAt: PropTypes.string,
  nextAttemptAt: PropTypes.string,
};
