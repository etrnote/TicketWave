import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Grid, Typography, Button, Paper, Divider,
  CircularProgress, Alert, TextField, Snackbar, Chip,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { eventService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { resolveEventImageSrc } from '../utils/image';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';
const BG_LIGHT = '#F3E8FF';

const CAT_COLORS = {
  Concert: { bg: '#FDE68A', text: '#92400E' },
  Theater: { bg: '#F3E8FF', text: '#7C3AED' },
  Movie: { bg: '#DBEAFE', text: '#1D4ED8' },
  Show: { bg: '#FCE7F3', text: '#9D174D' },
};

function formatNextShow(isoString) {
  if (!isoString) return null;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(isoString));
}

function ReviewAvatar({ name }) {
  return (
    <Box
      sx={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4ECDE4 0%, #8B2FBE 55%, #E040A8 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '0.8125rem', fontWeight: 700,
      }}
    >
      {name?.[0]?.toUpperCase() || 'U'}
    </Box>
  );
}

function StarRating({ value }) {
  return (
    <Box component="span" sx={{ fontSize: '0.875rem' }}>
      {'⭐'.repeat(Math.round(value))}
    </Box>
  );
}

function PosterPlaceholder() {
  return (
    <Box
      sx={{
        width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden',
        background: `repeating-linear-gradient(
          -45deg,
          #E9E4F5 0px, #E9E4F5 10px,
          #F3EFF9 10px, #F3EFF9 20px
        )`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${BORDER}`,
      }}
    >
      <Typography variant="body2" sx={{ color: '#B8B0D4', fontWeight: 500 }}>Event poster</Typography>
    </Box>
  );
}

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventRes, reviewsRes, occurrencesRes] = await Promise.all([
        eventService.getEventById(id),
        eventService.getReviews(id),
        eventService.getOccurrences(id),
      ]);
      setEvent(eventRes.data);
      setReviews(reviewsRes.data || []);
      setOccurrences(occurrencesRes.data || []);
    } catch {
      setError('Failed to load event details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const now = new Date();
  const futureOccurrences = occurrences
    .filter((o) => o.startTime && new Date(o.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const nextShowLabel = futureOccurrences.length > 0 ? formatNextShow(futureOccurrences[0].startTime) : null;

  // If `Event` gains a dedicated `minPrice` / `basePrice` field, use it directly instead of scanning occurrences.
  const pricedOccurrences = occurrences.filter((o) => o.price != null);
  const minPrice = pricedOccurrences.length > 0 ? Math.min(...pricedOccurrences.map((o) => Number(o.price))) : null;

  const handleAddReview = async () => {
    if (!isAuthenticated) {
      navigate('/login?mode=register');
      return;
    }
    if (!reviewComment.trim()) {
      setSnackbar({ open: true, message: 'Please enter a comment.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await eventService.addReview(id, { rating: reviewRating, comment: reviewComment.trim() });
      setReviews((prev) => [...prev, res.data]);
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      setSnackbar({ open: true, message: 'Review submitted!' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to submit review. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  if (error) return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  const imgSrc = resolveEventImageSrc(event.image, event.imageContentType);
  const catStyle = CAT_COLORS[event.category] || { bg: '#F3F4F6', text: '#374151' };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5 }}>
      <Container maxWidth="lg">
        <Button
          onClick={() => navigate(-1)}
          sx={{ color: 'text.secondary', mb: 3.5, px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
        >
          ← Back to events
        </Button>

        <Grid container spacing={4} alignItems="flex-start" sx={{ mb: 5, flexWrap: { sm: 'nowrap' } }}>
          {/* Poster column */}
          <Grid item xs={12} sm={5} sx={{ flexShrink: 0, width: { sm: '26%' } }}>
            {imgSrc ? (
              <Box
                component="img"
                src={imgSrc}
                alt={event.title}
                sx={{ width: '100%', borderRadius: '16px', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <PosterPlaceholder />
            )}
            <Button
              variant="contained"
              fullWidth
              startIcon={<ConfirmationNumberIcon />}
              onClick={() => {
                if (isAuthenticated) {
                  navigate(`/events/${id}/book`);
                } else {
                  navigate('/login?mode=register');
                }
              }}
              sx={{ mt: 2, py: 1.5, fontSize: '1rem', fontWeight: 700, bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}
            >
              Book Tickets
            </Button>
          </Grid>

          {/* Details column */}
          <Grid item xs={12} sm sx={{ flexGrow: 1, minWidth: 0 }}>
            <Chip
              label={event.category || 'Event'}
              size="small"
              sx={{ bgcolor: catStyle.bg, color: catStyle.text, fontWeight: 600, mb: 1.5 }}
            />
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-1px', lineHeight: 1.15, mb: 1.5 }}>
              {event.title}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3, flexWrap: 'wrap' }}>
              {event.genre && <Typography variant="body2" color="text.secondary">🎭 {event.genre}</Typography>}
              {event.durationMinutes && <Typography variant="body2" color="text.secondary">⏱ {event.durationMinutes} min</Typography>}
              {averageRating && <Typography variant="body2" color="text.secondary">⭐ {averageRating} / 5.0</Typography>}
            </Box>

            <Divider sx={{ borderColor: BORDER, mb: 3 }} />

            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '1px', display: 'block', mb: 1 }}>
              Description
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.75, color: 'text.primary', mb: 3.5 }}>
              {event.description || 'No description available.'}
            </Typography>

            {/* Info cards */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 130px', bgcolor: BG_LIGHT, borderRadius: '12px', p: '14px 18px', border: `1px solid ${BORDER}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Ticket price</Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: PURPLE, lineHeight: 1.2 }}>
                  {minPrice != null ? `From $${minPrice}` : '—'}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 110px', bgcolor: BG_LIGHT, borderRadius: '12px', p: '14px 18px', border: `1px solid ${BORDER}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Next show</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                  {nextShowLabel ?? '—'}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 100px', bgcolor: BG_LIGHT, borderRadius: '12px', p: '14px 18px', border: `1px solid ${BORDER}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Showings</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                  {futureOccurrences.length} {futureOccurrences.length === 1 ? 'date' : 'dates'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Reviews */}
        <Paper elevation={0} sx={{ p: '28px 32px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reviews{' '}
              <Typography component="span" variant="body1" color="text.secondary" sx={{ fontWeight: 400 }}>({reviews.length})</Typography>
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                if (isAuthenticated) {
                  setShowReviewForm((v) => !v);
                } else {
                  navigate('/login?mode=register');
                }
              }}
              sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}
            >
              + Add Review
            </Button>
          </Box>

          {isAuthenticated && showReviewForm && (
            <Box sx={{ bgcolor: 'background.default', borderRadius: '10px', p: 2.25, mb: 2.5, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Rating:</Typography>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Box key={n} component="span" onClick={() => setReviewRating(n)}
                    sx={{ fontSize: '1.375rem', cursor: 'pointer', filter: n <= reviewRating ? 'none' : 'grayscale(1) opacity(0.4)', transition: 'filter 0.15s' }}>
                    ⭐
                  </Box>
                ))}
              </Box>
              <TextField multiline rows={3} fullWidth placeholder="Share your experience…" value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Button variant="contained" size="small" onClick={handleAddReview} disabled={submitting}
                sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}>
                Submit
              </Button>
            </Box>
          )}

          {reviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No reviews yet. Be the first!</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              {reviews.map((r, i) => (
                <Box key={r.id ?? i} sx={{ pb: i < reviews.length - 1 ? 1.75 : 0, borderBottom: i < reviews.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
                    <ReviewAvatar name={r.userName} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.userName || 'User'}</Typography>
                    <StarRating value={r.rating} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 5, lineHeight: 1.6 }}>{r.comment}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, message: '' })} message={snackbar.message} />
    </Box>
  );
}

export default EventDetail;
