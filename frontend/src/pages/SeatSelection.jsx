import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Paper,
  CircularProgress, Alert,
} from '@mui/material';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PURPLE = '#8B2FBE';
const SEAT_AVAILABLE = '#ffffff';
const SEAT_SELECTED = '#60AAEF';
const SEAT_TAKEN = '#EF4444';
const SEAT_INACTIVE = '#D1D5DB';
const BORDER = '#EDE9F8';

function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ seats: [], price: 0 });
  const [selectedSeatIds, setSelectedSeatIds] = useState(() => {
    const prev = routeState?.selectedSeatIds;
    return prev ? new Set(prev) : new Set();
  });
  const [isLocking, setIsLocking] = useState(false);
  const [lockStatus, setLockStatus] = useState('');
  const seatUpdatesStreamRef = useRef(null);
  const latestSelectedSeatIdsRef = useRef(new Set());
  const latestSeatsRef = useRef([]);

  useEffect(() => {
    latestSelectedSeatIdsRef.current = selectedSeatIds;
  }, [selectedSeatIds]);

  useEffect(() => {
    latestSeatsRef.current = data.seats ?? [];
  }, [data.seats]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventService.getSeats(id);
      setData(res.data);
      latestSeatsRef.current = res.data.seats ?? [];
      // Keep local selection in sync with latest server truth so seats taken by
      // others immediately stop rendering as selected.
      const selectableSeatIds = new Set(
        (res.data.seats ?? [])
          .filter((s) => s.isActive !== false && (s.status === 'AVAILABLE' || s.lockedByMe))
          .map((s) => s.id),
      );
      setSelectedSeatIds((prev) => {
        const next = new Set([...prev].filter((seatId) => selectableSeatIds.has(seatId)));
        return next;
      });
      // Auto-select seats the backend reports as locked by the current user
      // so they appear blue and remain editable even without route state.
      if (!routeState?.selectedSeatIds) {
        const mySeats = (res.data.seats ?? [])
          .filter((s) => s.lockedByMe)
          .map((s) => s.id);
        if (mySeats.length > 0) setSelectedSeatIds(new Set(mySeats));
      }
      return res.data;
    } catch {
      setError('Failed to load seats. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, routeState?.selectedSeatIds]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleSeat = (seat) => {
    if (seat.isActive === false) return;
    if (seat.status !== 'AVAILABLE' && !seat.lockedByMe) return;
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      next.has(seat.id) ? next.delete(seat.id) : next.add(seat.id);
      return next;
    });
  };

  const stopSeatUpdatesStream = useCallback(() => {
    if (seatUpdatesStreamRef.current) {
      seatUpdatesStreamRef.current.close();
      seatUpdatesStreamRef.current = null;
    }
  }, []);

  const subscribeSeatUpdates = useCallback(() => {
    stopSeatUpdatesStream();
    const stream = new EventSource(eventService.getSeatUpdatesStreamUrl(id));
    seatUpdatesStreamRef.current = stream;

    stream.addEventListener('seat-lock-updated', async () => {
      await loadData();
    });

    stream.onerror = () => {
      stopSeatUpdatesStream();
      setTimeout(() => {
        subscribeSeatUpdates();
      }, 1000);
    };
  }, [id, loadData, stopSeatUpdatesStream]);

  const releaseDeselectedLocksOnExit = useCallback(() => {
    const selected = latestSelectedSeatIdsRef.current;
    const currentlyVisibleSeats = latestSeatsRef.current;
    const seatIdsToFree = currentlyVisibleSeats
      .filter((seat) => seat.lockedByMe && !selected.has(seat.id))
      .map((seat) => seat.id);

    if (seatIdsToFree.length === 0) return;

    eventService.freeLocks(id, { seatIds: seatIdsToFree }).catch(() => {
      // Best effort on navigation/unmount; lock TTL remains fallback.
    });
  }, [id]);

  const handleContinue = async () => {
    if (!isAuthenticated) {
      navigate('/login?mode=register');
      return;
    }
    if (selectedSeatIds.size === 0) return;
    const seatIds = Array.from(selectedSeatIds);
    const seatsSnapshot = data.seats.filter((s) => selectedSeatIds.has(s.id));
    const priceSnapshot = data.price ? seatIds.length * data.price : 0;
    setIsLocking(true);
    setLockStatus('Securing your seats...');
    setError('');
    try {
      const res = await eventService.lockSeats(id, { seatIds });
      const { lockIds } = res.data;
      setIsLocking(false);
      setLockStatus('');
      // Replace current history entry with lock state so navigate(-1) from Checkout
      // restores seats correctly without adding an extra entry to the stack.
      navigate(`/occurrences/${id}/seats`, {
        replace: true,
        state: {
          ...routeState,
          lockIds,
          selectedSeatIds: Array.from(selectedSeatIds),
        },
      });
      navigate('/checkout', {
        state: {
          occurrenceId: id,
          lockIds,
          totalPrice: priceSnapshot,
          selectedSeats: seatsSnapshot,
          selectedSeatIds: Array.from(selectedSeatIds),
          occurrence: routeState?.occurrence ?? null,
          eventId: routeState?.eventId ?? null,
        },
      });
    } catch (err) {
      setIsLocking(false);
      setLockStatus('');
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;
      if (status === 409) {
        setError(serverMessage || 'Some of those seats were just taken. Please pick again.');
        setSelectedSeatIds(new Set());
        loadData();
      } else {
        setError(serverMessage || 'Failed to request seats. Please try again.');
      }
    }
  };

  useEffect(() => {
    subscribeSeatUpdates();
    return () => {
      releaseDeselectedLocksOnExit();
      stopSeatUpdatesStream();
    };
  }, [releaseDeselectedLocksOnExit, stopSeatUpdatesStream, subscribeSeatUpdates]);

  if (loading && !isLocking) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  }

  const seatsByRow = {};
  data.seats?.forEach((seat) => {
    if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
    seatsByRow[seat.row].push(seat);
  });
  const sortedRows = Object.keys(seatsByRow).sort((a, b) => parseInt(a) - parseInt(b));
  sortedRows.forEach((row) => { seatsByRow[row].sort((a, b) => a.number - b.number); });

  const ticketCount = selectedSeatIds.size;
  const totalPrice = data.price ? ticketCount * data.price : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5, position: 'relative' }}>
      {/* Locking overlay */}
      {isLocking && (
        <Box
          sx={{
            position: 'fixed', inset: 0, bgcolor: 'rgba(255,255,255,0.8)',
            zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <CircularProgress size={56} sx={{ color: PURPLE }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{lockStatus}</Typography>
        </Box>
      )}

      <Container maxWidth="md">
        <Button onClick={() => navigate(-1)} disabled={isLocking} sx={{ color: 'text.secondary', mb: 3, px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}>
          ← Back
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Select Your Seats</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper
          elevation={0}
          sx={{ p: '28px 24px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 2.5, boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}
        >
          {/* Stage */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box
              sx={{
                display: 'inline-block',
                bgcolor: '#E8E4F0',
                color: '#7C7298',
                borderRadius: '6px 6px 0 0',
                py: 1,
                width: '92%',
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              STAGE
            </Box>
          </Box>

          {/* Seat grid */}
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, minWidth: 'fit-content', mx: 'auto' }}>
              {sortedRows.map((row) => (
                <Box key={row} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25 }}>
                  <Typography variant="caption" sx={{ width: 18, textAlign: 'center', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                    {String.fromCharCode(64 + parseInt(row))}
                  </Typography>
                  {seatsByRow[row].map((seat) => {
                    const isInactive = seat.isActive === false;
                    const isSelected = !isInactive && selectedSeatIds.has(seat.id);
                    const isTaken = !isInactive && (seat.status === 'SOLD' || seat.status === 'LOCKED') && !seat.lockedByMe;
                    const isAvailable = !isInactive && (seat.status === 'AVAILABLE' || seat.lockedByMe);
                    let bg = SEAT_AVAILABLE;
                    if (isInactive) bg = SEAT_INACTIVE;
                    else if (isSelected) bg = SEAT_SELECTED;
                    else if (isTaken) bg = SEAT_TAKEN;

                    return (
                      <Box
                        key={seat.id}
                        onClick={() => toggleSeat(seat)}
                        title={`Row ${seat.row}, Seat ${seat.number}`}
                        sx={{
                          width: 32, height: 30,
                          borderRadius: '6px 6px 3px 3px',
                          bgcolor: bg,
                          border: isAvailable && !isSelected ? `1px solid ${BORDER}` : 'none',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          transition: 'all 0.12s',
                          flexShrink: 0,
                          boxShadow: isSelected
                            ? '0 2px 4px rgba(0,0,0,0.15)'
                            : (isTaken || isInactive) ? 'none' : '0 2px 4px rgba(0,0,0,0.08), inset 0 -2px 0 rgba(0,0,0,0.06)',
                          transform: isSelected ? 'scale(1.1)' : 'none',
                          '&:hover': { transform: isAvailable && !isSelected ? 'scale(1.05)' : isSelected ? 'scale(1.1)' : 'none' },
                        }}
                      />
                    );
                  })}
                  <Typography variant="caption" sx={{ width: 18, textAlign: 'center', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                    {String.fromCharCode(64 + parseInt(row))}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3.5, mt: 2.75 }}>
            {[
              [SEAT_AVAILABLE, 'Available', true],
              [SEAT_SELECTED, 'Selected', false],
              [SEAT_TAKEN, 'Taken', false],
              [SEAT_INACTIVE, 'Inactive', false],
            ].map(([bg, label, border]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 24, height: 22, borderRadius: '4px 4px 2px 2px', bgcolor: bg,
                  border: border ? `1.5px solid ${BORDER}` : 'none',
                  boxShadow: !border ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
                }} />
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Footer bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={isLocking}
            sx={{ borderColor: PURPLE, color: PURPLE, '&:hover': { bgcolor: '#F3E8FF' } }}
          >
            ← Back
          </Button>

          <Paper
            elevation={0}
            sx={{
              flexGrow: 1, px: 3, py: 1.75, borderRadius: '12px',
              border: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <Box component="strong" sx={{ color: 'text.primary' }}>{ticketCount}</Box>{' '}
              seat{ticketCount !== 1 ? 's' : ''} selected
            </Typography>
            <Box sx={{ width: 1, height: 20, bgcolor: 'divider' }} />
            <Box>
              <Typography component="span" variant="body2" color="text.secondary">Total: </Typography>
              <Typography component="span" sx={{ fontSize: '1.125rem', fontWeight: 800, color: 'text.primary' }}>
                ${totalPrice.toFixed(2)}
              </Typography>
            </Box>
          </Paper>

          <Button
            variant="contained"
            disabled={ticketCount === 0 || isLocking}
            onClick={handleContinue}
            sx={{
              bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, px: 3.5, py: 1.25, fontSize: '0.9375rem',
              '&.Mui-disabled': { bgcolor: '#C4BAE8' },
            }}
          >
            Continue →
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default SeatSelection;
