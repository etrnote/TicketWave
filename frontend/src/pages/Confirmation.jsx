import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HomeIcon from '@mui/icons-material/Home';
import ListAltIcon from '@mui/icons-material/ListAlt';

function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

// Generates a deterministic but visually convincing barcode from a string.
function Barcode({ value }) {
  const seed = value.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const pseudo = (n) => Math.abs(Math.sin((seed + n) * 9301 + 49297) * 233280) % 1;

  const segments = Array.from({ length: 64 }, (_, i) => ({
    bar: pseudo(i) > 0.38,
    width: Math.ceil(pseudo(i + 200) * 2) + 1,
  }));

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'stretch', height: 52,
        bgcolor: '#fff', borderRadius: 0.5, overflow: 'hidden', px: 0.5,
      }}
    >
      {segments.map((seg, i) => (
        <Box
          key={i}
          sx={{
            width: seg.width,
            bgcolor: seg.bar ? '#111' : 'transparent',
            flexShrink: 0,
          }}
        />
      ))}
    </Box>
  );
}

function TicketCard({ orderId, seat, index }) {
  const ticketCode = `EM${String(orderId).padStart(6, '0')}${String(index + 1).padStart(3, '0')}`;

  return (
    <Paper
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Ticket header */}
      <Box
        sx={{
          px: 2.5, py: 1.5,
          background: 'linear-gradient(135deg, #3f2b96 0%, #6a4de0 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ConfirmationNumberIcon sx={{ color: '#fff', fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
            Ticket #{index + 1}
          </Typography>
        </Box>
        <Chip
          label={`Row ${seat.row} · Seat ${seat.number}`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, border: 'none' }}
        />
      </Box>

      {/* Barcode area */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Barcode value={ticketCode} />
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', mt: 0.75, letterSpacing: 4, color: 'text.secondary', fontFamily: 'monospace' }}
        >
          {ticketCode}
        </Typography>
      </Box>
    </Paper>
  );
}

function Confirmation() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const { order, eventName, occurrence, selectedSeats = [] } = state ?? {};

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">
        {/* Success header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: '#2e7d32', mb: 1.5 }} />
          <Typography
            variant="h3"
            sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: 'primary.main', mb: 1 }}
          >
            Booking Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your order <strong>#{orderId}</strong> is confirmed. Check your tickets below.
          </Typography>
        </Box>

        {/* Event details card */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {eventName ?? 'Event'}
          </Typography>

          {occurrence?.startTime && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <EventIcon color="primary" />
              <Typography variant="body1">{formatDate(occurrence.startTime)}</Typography>
            </Box>
          )}
          {occurrence?.venueName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <LocationOnIcon color="primary" />
              <Typography variant="body1">{occurrence.venueName}</Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary">Total paid</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              ${Number(order?.totalPrice ?? 0).toFixed(2)}
            </Typography>
          </Box>
        </Paper>

        {/* Tickets */}
        {selectedSeats.length > 0 && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your Tickets</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 5 }}>
              {selectedSeats.map((seat, idx) => (
                <TicketCard key={seat.id} orderId={orderId} seat={seat} index={idx} />
              ))}
            </Box>
          </>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Back to Home
          </Button>
          <Button
            variant="contained"
            startIcon={<ListAltIcon />}
            onClick={() => navigate('/my-orders')}
            sx={{ borderRadius: 2, px: 3 }}
          >
            View My Orders
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default Confirmation;
