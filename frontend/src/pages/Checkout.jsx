import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Box,
  Checkbox,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ChairIcon from '@mui/icons-material/Chair';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, userService } from '../services/api';
import { generatePaymentToken, paymentService } from '../services/paymentService';

const BRAND_COLOR = {
  Visa: '#1a1f71',
  Mastercard: '#eb001b',
  Amex: '#007bc1',
  Discover: '#ff6600',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function SavedMethodCard({ method, selected, onSelect }) {
  const color = BRAND_COLOR[method.cardType] ?? '#555';
  return (
    <Paper
      onClick={onSelect}
      elevation={selected ? 4 : 1}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'border-color 0.15s',
      }}
    >
      <Radio checked={selected} onChange={onSelect} sx={{ p: 0 }} />
      <Box sx={{ width: 44, height: 28, bgcolor: color, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 9, lineHeight: 1.1, textAlign: 'center' }}>
          {method.cardType.toUpperCase()}
        </Typography>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {method.cardType} •••• {method.lastFour}
        </Typography>
        <Typography variant="caption" color="text.secondary">Saved card</Typography>
      </Box>
    </Paper>
  );
}

function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [event, setEvent] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveNewCard, setSaveNewCard] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [saveCardWarning, setSaveCardWarning] = useState('');

  const savePaymentMethodMutation = useMutation({
    mutationFn: ({ cardType, lastFour, token }) =>
      userService.addPaymentMethod({
        cardType,
        lastFour,
        token,
      }),
  });

  useEffect(() => {
    if (!state?.eventId) return;
    eventService.getEventById(state.eventId).then((res) => setEvent(res.data)).catch(() => {});
    userService.getPaymentMethods().then((res) => {
      const methods = res.data || [];
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedMethodId(methods[0].id);
        setUseNewCard(false);
      } else {
        setUseNewCard(true);
      }
    }).catch(() => setUseNewCard(true));
  }, [state?.eventId]);

  if (!state?.occurrenceId) return <Navigate to="/events" replace />;

  const { occurrenceId, lockIds, ticketCount, totalPrice, selectedSeats = [], selectedSeatIds = [], occurrence } = state;
  const showCardForm = useNewCard || paymentMethods.length === 0;

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSelectSaved = (id) => {
    setSelectedMethodId(id);
    setUseNewCard(false);
    setSaveNewCard(false);
    setError('');
  };

  const handleUseNewCard = () => {
    setSelectedMethodId(null);
    setUseNewCard(true);
    setError('');
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setError('');
    setSaveCardWarning('');

    try {
      let cardType, lastFour;

      if (!showCardForm && selectedMethodId) {
        const method = paymentMethods.find((m) => m.id === selectedMethodId);
        cardType = method.cardType;
        lastFour = method.lastFour;
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        const result = await paymentService.processPayment({ cardNumber, expiry, cvv });
        cardType = result.cardType;
        lastFour = result.lastFour;
        if (saveNewCard) {
          await savePaymentMethodMutation.mutateAsync({
            cardType,
            lastFour,
            token: generatePaymentToken(),
          }).catch(() => setSaveCardWarning('Payment succeeded, but your card could not be saved.'));
        }
      }

      const res = await eventService.purchaseTickets({
        occurrenceId,
        lockIds,
        seatIds: selectedSeats.map((s) => s.id),
        ticketCount,
        paymentDetails: { cardType, lastFour },
      });

      queryClient.invalidateQueries({ queryKey: ['userOrders'] });
      navigate(`/confirmation/${res.data.id}`, {
        state: {
          order: res.data,
          eventName: event?.title ?? 'Event',
          occurrence,
          selectedSeats,
        },
      });
    } catch (err) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? err.message ?? 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5 }}>
      {/* Full-screen processing overlay */}
      {processing && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 1300,
            bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <CircularProgress size={56} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Processing payment…</Typography>
          <Typography variant="body2" color="text.secondary">Please don't close this page</Typography>
        </Box>
      )}

      <Container maxWidth="lg">
        <Button
          onClick={handleGoBack}
          disabled={processing}
          startIcon={<ArrowBackIcon />}
          sx={{ color: 'text.secondary', mb: 2, px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
        >
          Back
        </Button>

        <Typography
          variant="h4"
          sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: 'primary.main', mb: 4 }}
        >
          Checkout
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          {/* ── Order summary ── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 24 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Order Summary</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {event?.title ?? (state?.eventId ? 'Loading event…' : '')}
              </Typography>

              {occurrence?.startTime && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2">{formatDate(occurrence.startTime)}</Typography>
                </Box>
              )}
              {occurrence?.venueName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography variant="body2">{occurrence.venueName}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {selectedSeats.length > 0 ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Selected Seats ({selectedSeats.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, overflow: 'hidden' }}>
                    {selectedSeats.map((seat) => (
                      <Chip
                        key={seat.id}
                        icon={<ChairIcon />}
                        label={`Row ${seat.row}, Seat ${seat.number}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>General Admission</Typography>
                  <Chip label={`${ticketCount ?? 1} ticket${(ticketCount ?? 1) !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  ${Number(totalPrice).toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* ── Payment form ── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LockIcon color="action" fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Payment</Typography>
              </Box>

              {/* Test-mode banner */}
              <Alert severity="info" sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Test mode — no real charges</Typography>
                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                  <Box component="span" sx={{ display: 'block' }}>✓ <strong>4242 4242 4242 4242</strong> — always succeeds (Visa)</Box>
                  <Box component="span" sx={{ display: 'block' }}>✓ <strong>5555 5555 5555 4444</strong> — always succeeds (Mastercard)</Box>
                  <Box component="span" sx={{ display: 'block' }}>✗ <strong>4000 0000 0000 0002</strong> — card declined</Box>
                </Typography>
              </Alert>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {saveCardWarning && <Alert severity="warning" sx={{ mb: 2 }}>{saveCardWarning}</Alert>}

              {/* Saved payment methods */}
              {paymentMethods.length > 0 && (
                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Saved cards</Typography>
                  <RadioGroup>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {paymentMethods.map((m) => (
                        <SavedMethodCard
                          key={m.id}
                          method={m}
                          selected={selectedMethodId === m.id && !useNewCard}
                          onSelect={() => handleSelectSaved(m.id)}
                        />
                      ))}
                      <Paper
                        onClick={handleUseNewCard}
                        elevation={useNewCard ? 4 : 1}
                        sx={{
                          p: 2, borderRadius: 2, border: '2px solid',
                          borderColor: useNewCard ? 'primary.main' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <Radio checked={useNewCard} onChange={handleUseNewCard} sx={{ p: 0 }} />
                        <CreditCardIcon color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Use a new card</Typography>
                      </Paper>
                    </Box>
                  </RadioGroup>
                </FormControl>
              )}

              {/* New card form */}
              {showCardForm && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    inputProps={{ inputMode: 'numeric', maxLength: 19 }}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCardIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Expiry (MM/YY)"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputProps={{ inputMode: 'numeric', maxLength: 5 }}
                      fullWidth
                    />
                    <TextField
                      label="CVV"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                      fullWidth
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={saveNewCard}
                        onChange={(e) => setSaveNewCard(e.target.checked)}
                      />
                    }
                    label="Save this card for next time"
                  />
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleConfirm}
                disabled={processing}
                startIcon={<LockIcon />}
                sx={{ mt: 3, py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '1rem' }}
              >
                Confirm & Pay ${Number(totalPrice).toFixed(2)}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                Your payment is secure and encrypted.
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default Checkout;
