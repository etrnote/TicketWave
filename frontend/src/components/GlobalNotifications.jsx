import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

const NOTIFICATION_TYPES = {
  LOCK_EXPIRED: (payload) => ({
    message: 'Your reserved seats expired after 5 minutes and are now available to others.',
    severity: 'info',
    path: payload?.occurrenceId ? `/occurrences/${payload.occurrenceId}/seats` : null,
  }),
  ORDER_CANCELLED: (payload) => ({
    message: `Your order #${payload?.orderId ?? ''} was cancelled.`,
    severity: 'info',
    path: '/my-orders',
  }),
};

function GlobalNotifications() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  const enqueue = useCallback((notification) => {
    setQueue((q) => [...q, { ...notification, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      return undefined;
    }

    let reconnectTimer = null;

    const connect = () => {
      const streamUrl = `${API_BASE_URL}/users/me/notifications/stream?token=${encodeURIComponent(token)}`;
      const stream = new EventSource(streamUrl);
      streamRef.current = stream;

      stream.addEventListener('user-notification', (event) => {
        try {
          const payload = JSON.parse(event.data);
          const builder = NOTIFICATION_TYPES[payload?.type];
          if (builder) {
            enqueue(builder(payload));
          }
        } catch {
          // Ignore malformed notifications.
        }
      });

      stream.onerror = () => {
        if (streamRef.current) {
          streamRef.current.close();
          streamRef.current = null;
        }
        reconnectTimer = setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [isAuthenticated, token, enqueue]);

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setCurrent(null);
  };

  const handleClick = () => {
    if (current?.path) {
      navigate(current.path);
    }
    setCurrent(null);
  };

  return (
    <Snackbar
      key={current?.id}
      open={Boolean(current)}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={handleClose}
        onClick={handleClick}
        severity={current?.severity || 'info'}
        variant="filled"
        sx={{
          cursor: current?.path ? 'pointer' : 'default',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiAlert-icon': { color: 'primary.contrastText' },
          '&:hover': current?.path ? { bgcolor: 'primary.dark' } : {},
        }}
      >
        {current?.message}
      </Alert>
    </Snackbar>
  );
}

export default GlobalNotifications;
