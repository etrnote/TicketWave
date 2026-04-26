import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Paper, CircularProgress,
  Alert, Snackbar, LinearProgress,
} from '@mui/material';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';
const LIGHT_PURPLE_BG = '#EFEAFB';
const HIGH_OCCUPANCY_THRESHOLD = 80;
const MIN_TICKETS = 1;
const MAX_TICKETS = 50;

function formatCardDate(isoString) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(isoString));
}
function formatTime(isoString) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoString));
}
function OccurrenceCard({ occ, isSelected, onSelect }) {
  const occurrenceDate = new Date(occ.startTime);
  const now = new Date();
  const currentYear = new Date().getFullYear();
  const occurrenceYear = occurrenceDate.getFullYear();
  const showYear = occurrenceYear !== currentYear;
  const isCancelled = occ.status === 'CANCELLED';
  const isPast = occurrenceDate < now;
  const hasAvailability = Number.isFinite(occ.totalCount) && Number.isFinite(occ.availableCount) && occ.totalCount > 0;
  const isSoldOut = hasAvailability && occ.availableCount <= 0;
  const isDisabled = isCancelled || isPast || isSoldOut;
  const soldCount = hasAvailability ? Math.max(0, occ.totalCount - occ.availableCount) : null;
  const soldPercentage = hasAvailability ? Math.min(100, Math.round((soldCount / occ.totalCount) * 100)) : 0;
  return (
    <Box
      onClick={() => !isDisabled && onSelect(occ)}
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        bgcolor: isPast ? '#F7F7FA' : 'background.paper',
        borderRadius: '14px',
        p: 2.5,
        border: '2px solid',
        borderColor: isPast ? '#C9C2DA' : (isSelected ? PURPLE : BORDER),
        opacity: isDisabled ? 0.65 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        boxShadow: isSelected
          ? `0 0 0 4px rgba(139,47,190,0.12), 0 4px 20px rgba(139,47,190,0.18)`
          : '0 2px 8px rgba(26,16,53,0.06)',
        transform: isSelected ? 'translateY(-3px)' : 'none',
        position: 'relative',
      }}
    >
      {isPast && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 10,
            right: 12,
            px: 1,
            py: 0.2,
            borderRadius: 999,
            bgcolor: '#F3E5F5',
            color: '#6A1B9A',
            fontWeight: 700,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}
        >
          ⏳ Passed
        </Typography>
      )}
      {isSoldOut && !isPast && !isCancelled && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 10,
            right: 12,
            px: 1,
            py: 0.2,
            borderRadius: 999,
            bgcolor: '#FEE2E2',
            color: '#B91C1C',
            fontWeight: 700,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}
        >
          Sold Out
        </Typography>
      )}
      {isSelected && (
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: PURPLE, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          ✓ Selected
        </Typography>
      )}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        {formatCardDate(occ.startTime)}
      </Typography>
      {showYear && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -0.25, mb: 0.75 }}>
          {occurrenceYear}
        </Typography>
      )}
      <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: PURPLE, mb: 1.25 }}>
        {formatTime(occ.startTime)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        📍 {occ.venueName}
      </Typography>
      {occ.price != null && (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          ${occ.price}
        </Typography>
      )}
      {hasAvailability && (
        <Box sx={{ mt: 1.25 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
            {occ.availableCount} / {occ.totalCount} available
          </Typography>
          <LinearProgress
            variant="determinate"
            value={soldPercentage}
            sx={{
              height: 8,
              borderRadius: 999,
              bgcolor: LIGHT_PURPLE_BG,
              '& .MuiLinearProgress-bar': { bgcolor: soldPercentage >= HIGH_OCCUPANCY_THRESHOLD ? '#E53935' : PURPLE },
            }}
          />
        </Box>
      )}
      {isCancelled && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
          Cancelled
        </Typography>
      )}
      {isPast && !isCancelled && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: '#6A1B9A' }}>
          This occurrence has already passed
        </Typography>
      )}
    </Box>
  );
}

function BookOccurrence() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventService.getOccurrences(id);
      setOccurrences(res.data || []);
    } catch {
      setError('Failed to load occurrences. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!selectedOccurrenceId) return;
    const selected = occurrences.find((occ) => occ.id === selectedOccurrenceId);
    if (!selected) return;
    const isPast = new Date(selected.startTime) < new Date();
    const hasAvailability = Number.isFinite(selected.totalCount)
      && Number.isFinite(selected.availableCount)
      && selected.totalCount > 0;
    const isSoldOut = hasAvailability && selected.availableCount <= 0;
    if (selected.status === 'CANCELLED' || isPast || isSoldOut) {
      setSelectedOccurrenceId(null);
    }
  }, [occurrences, selectedOccurrenceId]);

  const selectedOccurrence = useMemo(
    () => occurrences.find((occ) => occ.id === selectedOccurrenceId),
    [occurrences, selectedOccurrenceId],
  );
  const sortedOccurrences = useMemo(
    () => [...occurrences].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [occurrences],
  );
  const selectedSeatingType = selectedOccurrence?.seatingType;

  const availableCount = selectedOccurrence?.availableCount;
  const effectiveMax =
    Number.isFinite(availableCount) && availableCount > 0
      ? Math.min(MAX_TICKETS, availableCount)
      : MAX_TICKETS;

  const handleIncrement = () => {
    setTicketCount((t) => {
      if (t >= effectiveMax) {
        if (Number.isFinite(availableCount) && availableCount < MAX_TICKETS) {
          setSnackbar({ open: true, message: `Only ${availableCount} seat${availableCount === 1 ? '' : 's'} available for this showing.` });
        } else {
          setSnackbar({ open: true, message: 'Purchasing tickets is limited to 50 per purchase.' });
        }
        return t;
      }
      return t + 1;
    });
  };

  const handleChooseSeats = () => {
    if (!selectedOccurrenceId || !selectedOccurrence) return;
    if (selectedSeatingType === 'RESERVED') {
      navigate(`/occurrences/${selectedOccurrenceId}/seats`, {
        state: { occurrence: selectedOccurrence, eventId: id },
      });
    } else {
      setSnackbar({ open: true, message: 'This event does not have reserved seating.' });
    }
  };

  const handlePay = () => {
    if (!isAuthenticated) {
      navigate('/login?mode=register');
      return;
    }
    if (!selectedOccurrenceId || !selectedOccurrence) return;
    if (selectedSeatingType === 'RESERVED') { handleChooseSeats(); return; }
    navigate('/checkout', {
      state: {
        occurrenceId: selectedOccurrenceId,
        lockIds: [],
        ticketCount,
        totalPrice: (selectedOccurrence?.price ?? 0) * ticketCount,
        selectedSeats: [],
        occurrence: selectedOccurrence,
        eventId: id,
      },
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  if (error) return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5 }}>
      <Container maxWidth="md">
        <Button onClick={() => navigate(-1)} sx={{ color: 'text.secondary', mb: 3.5, px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}>
          ← Back
        </Button>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-1px', mb: 0.5 }}>
          Select Date &amp; Time
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Choose your preferred showing below
        </Typography>

        {occurrences.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>No occurrences available.</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 4.5,
            }}
          >
            {sortedOccurrences.map((occ) => (
              <OccurrenceCard
                key={occ.id}
                occ={occ}
                isSelected={occ.id === selectedOccurrenceId}
                onSelect={(o) => setSelectedOccurrenceId(o.id)}
              />
            ))}
          </Box>
        )}

        {/* Bottom bar */}
        <Paper
          elevation={0}
          sx={{
            p: '24px 28px',
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
            boxShadow: '0 2px 12px rgba(26,16,53,0.07)',
          }}
        >
          {selectedSeatingType === 'GENERAL' && (
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                Number of Tickets
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  onClick={() => setTicketCount((t) => Math.max(MIN_TICKETS, t - 1))}
                  variant="outlined"
                  sx={{ minWidth: 36, width: 36, height: 36, p: 0, borderColor: BORDER, color: 'text.primary', fontSize: '1.125rem' }}
                >
                  −
                </Button>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                  {ticketCount}
                </Typography>
                <Button
                  onClick={handleIncrement}
                  variant="outlined"
                  sx={{ minWidth: 36, width: 36, height: 36, p: 0, borderColor: BORDER, color: 'text.primary', fontSize: '1.125rem' }}
                >
                  +
                </Button>
              </Box>
            </Box>
          )}

          {selectedSeatingType === 'RESERVED' && (
            <Typography variant="body2" color="text.secondary">
              Select seats on the next screen
            </Typography>
          )}

          {!selectedSeatingType && (
            <Typography variant="body2" color="text.secondary">
              Select an occurrence to continue.
            </Typography>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {selectedOccurrence && selectedSeatingType === 'GENERAL' && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">Total (estimated)</Typography>
              <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: PURPLE }}>
                ${(selectedOccurrence.price ?? 0) * ticketCount}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{ borderColor: PURPLE, color: PURPLE, '&:hover': { bgcolor: '#F3E8FF' } }}
            >
              ← Back
            </Button>
            <Button
              variant="contained"
              disabled={!selectedOccurrenceId}
              onClick={handlePay}
              sx={{
                bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, px: 3.5, py: 1.25, fontSize: '0.9375rem',
                '&.Mui-disabled': { bgcolor: '#C4BAE8' },
              }}
            >
              {selectedSeatingType === 'RESERVED' ? 'Choose Seats →' : 'Pay Directly →'}
            </Button>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
    </Box>
  );
}

export default BookOccurrence;
