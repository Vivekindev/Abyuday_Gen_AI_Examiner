import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiClock, FiCopy, FiInfo, FiMail, FiSend } from 'react-icons/fi';
import { toast } from 'sonner';
import { Button } from './ui';
import { api, copyText, formatDate } from '../lib/api';
import { deliveryTime, emailFeedback, pendingEmailStatuses } from '../lib/emailDelivery';

const icons = { alert: FiAlertCircle, check: FiCheckCircle, clock: FiClock, info: FiInfo, mail: FiMail, send: FiSend };
const inactiveInvitations = {
  accepted: { heading: 'Invitation accepted', description: 'This person has joined the team. No need to share the link.', tone: 'success', icon: 'check' },
  expired: { heading: 'Invitation expired', description: 'Create a new invitation to give this person access.', tone: 'warning', icon: 'alert' },
  unavailable: { heading: 'Invitation no longer available', description: 'This invitation can no longer be accessed. Check your team’s Invitations for the latest status.', tone: 'neutral', icon: 'info' },
};

export default function InvitationReceipt({ invitation, onDone }) {
  const { id, teamId, email, link, expiresAt } = invitation;
  const [delivery, setDelivery] = useState({ emailStatus: invitation.emailStatus, invitationStatus: 'pending' });
  const [refreshError, setRefreshError] = useState('');
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copying, setCopying] = useState(false);
  const announced = useRef(invitation.emailStatus === 'sent');
  const linkInput = useRef(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let timer;
    const checkDelivery = async () => {
      try {
        const { data } = await api.get(`/teams/${teamId}/invites/${id}/delivery`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setDelivery(data);
        setRefreshError('');
        if (data.emailStatus === 'sent' && data.invitationStatus === 'pending' && !announced.current) {
          announced.current = true;
          toast.success('Invitation email sent', { description: `Sent to ${email}.` });
        }
        if (data.invitationStatus === 'pending') {
          timer = setTimeout(checkDelivery, ['queued', 'sending'].includes(data.emailStatus) ? 5000 : 15000);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.response?.status === 404) {
          setDelivery({ emailStatus: 'cancelled', invitationStatus: 'unavailable' });
          setRefreshError('');
          return;
        }
        setRefreshError('We couldn’t refresh email delivery. Your invitation was created; check again for an update.');
        if (![401, 403].includes(error.response?.status)) timer = setTimeout(checkDelivery, 15000);
      }
    };
    void checkDelivery();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, teamId, email, revision]);

  const inactive = inactiveInvitations[delivery.invitationStatus];
  const feedback = inactive || emailFeedback(delivery.emailStatus);
  const Icon = icons[feedback.icon];
  const sentTime = delivery.emailStatus === 'sent' ? deliveryTime(delivery.sentAt) : '';
  const retryTime = delivery.emailStatus === 'retrying' ? deliveryTime(delivery.nextAttemptAt) : '';
  const shareNeeded = !pendingEmailStatuses.includes(delivery.emailStatus) && delivery.emailStatus !== 'sent';
  const copy = async () => {
    if (copying) return;
    setCopying(true);
    setCopied(false);
    setCopyError('');
    try {
      await copyText(link);
      setCopied(true);
      toast.success('Invitation link copied', { description: `Share it with ${email}.` });
    } catch {
      setCopyError('Select the link and copy it manually. Clipboard access is unavailable.');
      linkInput.current?.focus();
      linkInput.current?.select();
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="invitation-receipt">
      <div className="invitation-delivery" data-tone={feedback.tone} role="status" aria-live="polite" aria-atomic="true">
        <span className="invitation-delivery-icon"><Icon aria-hidden="true" /></span>
        <div>
          <h3>{feedback.heading}</h3>
          <p className="invitation-recipient">{email}</p>
          <p>{feedback.description}</p>
          {!inactive && (sentTime || retryTime) && <p className="invitation-delivery-time">{sentTime ? `Sent ${sentTime}` : `Next retry: ${retryTime}`}</p>}
        </div>
      </div>
      {refreshError && <div className="invitation-refresh">
        <p className="field-hint" role="status">{refreshError}</p>
        <Button variant="ghost" className="btn-sm" onClick={() => setRevision((value) => value + 1)}>Check again</Button>
      </div>}
      {!inactive && <div className="invitation-share">
        <label htmlFor="invitation-link" className="invitation-share-label">Share invitation link</label>
        <div className="inline-copy">
          <input
            ref={linkInput} id="invitation-link" className="input" value={link} readOnly
            aria-describedby="invitation-link-guide" onFocus={(event) => event.target.select()}
          />
          <Button variant={shareNeeded ? 'primary' : 'secondary'} icon={copied ? FiCheck : FiCopy} onClick={copy} disabled={copying} aria-busy={copying} autoFocus={shareNeeded}>
            {copying ? 'Copying…' : copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <p className="invite-guide" id="invitation-link-guide">Valid until {formatDate(expiresAt)}. The recipient must sign in with the invited email address.</p>
        {copyError && <p className="field-hint text-danger" role="alert">{copyError}</p>}
      </div>}
      <div className="form-actions">
        <Button variant={shareNeeded && !inactive ? 'secondary' : 'primary'} onClick={onDone} autoFocus={!shareNeeded || !!inactive}>Done</Button>
      </div>
    </div>
  );
}

InvitationReceipt.propTypes = {
  invitation: PropTypes.shape({
    id: PropTypes.string,
    teamId: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    expiresAt: PropTypes.string.isRequired,
    emailStatus: PropTypes.string.isRequired,
  }).isRequired,
  onDone: PropTypes.func.isRequired,
};
