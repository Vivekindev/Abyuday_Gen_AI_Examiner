import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import { Button } from './ui';
import { api, errorMessage } from '../lib/api';

export default function RetryAssessmentButton({ testID, name, onRetried }) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await api.post('/test/retry', { testID });
      toast.success('Assessment queued for another attempt');
      onRetried();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not retry this assessment. Try again shortly.'));
      if (error.response?.status === 409) onRetried();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return <Button variant="secondary" className="btn-sm" icon={FiRefreshCw} onClick={retry} disabled={busy} aria-label={`Retry ${name}`} aria-busy={busy}>
    {busy ? 'Queueing…' : 'Retry'}
  </Button>;
}
RetryAssessmentButton.propTypes = { testID: PropTypes.string.isRequired, name: PropTypes.string.isRequired, onRetried: PropTypes.func.isRequired };
