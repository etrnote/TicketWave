import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Chip, CircularProgress,
  TextField, InputAdornment, FormControl, Select, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import { eventService } from '../services/api';
import { resolveEventImageSrc } from '../utils/image';

const PURPLE = '#8B2FBE';
const GRAD = 'linear-gradient(135deg, #4ECDE4 0%, #8B2FBE 55%, #E040A8 100%)';

const CAT_PALETTE = [
  'rgb(139, 47, 190)',
  'rgb(224, 64, 168)',
  'rgb(78, 205, 228)',
  'rgb(249, 115, 22)',
  '#22C55E', // green
  '#3B82F6', // blue
  '#EC4899', // rose
  '#A855F7', // light purple
  '#14B8A6', // teal
];

const CAT_COLORS = {
  Concert: 'rgb(224, 64, 168)',
  Theater: 'rgb(78, 205, 228)',
  Movie: 'rgb(78, 205, 228)',
  Show: 'rgb(249, 115, 22)',
  Ballet: '#EC4899',
  Comedy: '#22C55E',
  Sports: '#3B82F6',
  Music: 'rgba(252, 70, 179, 1)',
  Festival: 'rgba(120, 64, 224, 1)',
  Theatre: 'rgb(78, 205, 228)',
};

function catColor(category) {
  if (!category) return PURPLE;
  if (CAT_COLORS[category]) return CAT_COLORS[category];
  // Deterministic fallback: hash category name into palette
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) & 0xffff;
  return CAT_PALETTE[hash % CAT_PALETTE.length];
}

function EventCard({ event, onClick }) {
  const imgSrc = resolveEventImageSrc(event.image, event.imageContentType);
  const color = catColor(event.category);

  return (
    <Box
      onClick={onClick}
      sx={{
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: '14px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.22s',
        boxShadow: '0 2px 12px rgba(26,16,53,0.07)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 32px rgba(139,47,190,0.18)',
        },
      }}
    >
      {/* Image area */}
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        {imgSrc ? (
          <Box
            component="img"
            src={imgSrc}
            alt={event.title}
            sx={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ height: 170, bgcolor: '#EDE9F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon sx={{ fontSize: 48, color: '#B8B0D4' }} />
          </Box>
        )}
        {event.category && (
          <Box
            sx={{
              position: 'absolute', top: 10, left: 10,
              px: 1.25, py: 0.5, borderRadius: 20,
              bgcolor: color, color: 'white',
              fontSize: '0.688rem', fontWeight: 700, letterSpacing: '0.5px',
            }}
          >
            {event.category}
          </Box>
        )}
      </Box>

      {/* Content — grows to fill card height so all cards align at bottom */}
      <Box sx={{ p: '14px 16px 16px', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, lineHeight: 1.3, fontSize: '0.9375rem' }}
          noWrap
        >
          {event.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem', flexGrow: 1 }}>
          {[event.genre, event.durationMinutes ? `${event.durationMinutes} min` : null].filter(Boolean).join(' · ')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography component="span" variant="caption" color="text.secondary">From </Typography>
            <Typography component="span" sx={{ fontSize: '1.0625rem', fontWeight: 800, color: PURPLE }}>
              {event.minPrice != null ? `$${Number(event.minPrice)}` : '—'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, fontSize: '0.8125rem', px: 1.5, py: 0.5 }}
          >
            Book Now
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function Home() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const loadCategories = async () => {
    try {
      const res = await eventService.getCategories();
      setCategories(res.data || []);
    } catch {
      setCategories([]);
    }
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedGenre) params.genre = selectedGenre;
      if (searchName) params.name = searchName;
      const res = await eventService.getFilteredEvents(params);
      const data = res.data || [];
      setEvents(data);
      if (!selectedCategory && !selectedGenre && !searchName) {
        const unique = [...new Set(data.map((e) => e.genre).filter(Boolean))];
        setGenres(unique);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedGenre, searchName]);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero */}
      <Box
        sx={{
          background: GRAD,
          py: { xs: 7, md: 9 },
          px: { xs: 3, md: 6 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtle dot pattern */}
        <Box
          sx={{
            position: 'absolute', inset: 0, opacity: 0.5,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '2px', fontWeight: 600, display: 'block', mb: 1.5 }}
          >
            Discover &amp; Book
          </Typography>
          <Typography
            variant="h2"
            sx={{
              color: 'white', fontWeight: 800, letterSpacing: '-2px',
              fontSize: { xs: '2.5rem', md: '3.25rem' }, lineHeight: 1.1, mb: 1,
            }}
          >
            Your Perfect Night Out
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.0625rem', mb: 4.5 }}>
            Concerts · Theater · Movies · Shows
          </Typography>

          {/* Search bar */}
          <Box
            sx={{
              maxWidth: 640, mx: 'auto',
              display: 'flex', gap: 1, alignItems: 'center',
              bgcolor: 'white', borderRadius: '12px',
              px: 2.25, py: 0.75,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
            <TextField
              variant="standard"
              placeholder="Search events, artists, venues…"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              fullWidth
              slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.9375rem', color: 'text.primary' } } }}
            />
            <Button
              variant="contained"
              sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, flexShrink: 0, px: 2.5 }}
            >
              Search
            </Button>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Filter:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['', ...(categories)].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Box
                  key={cat || 'all'}
                  component="button"
                  onClick={() => setSelectedCategory(cat)}
                  sx={{
                    px: 2, py: 0.75,
                    borderRadius: 20,
                    border: '1.5px solid',
                    borderColor: active ? PURPLE : 'divider',
                    bgcolor: active ? PURPLE : 'background.paper',
                    color: active ? 'white' : 'text.secondary',
                    fontSize: '0.8125rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    '&:hover': { borderColor: PURPLE, color: active ? 'white' : PURPLE },
                  }}
                >
                  {cat || 'All'}
                </Box>
              );
            })}
          </Box>

          <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5 }} />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              displayEmpty
              sx={{ fontSize: '0.8125rem', borderRadius: 2 }}
            >
              <MenuItem value="">All Genres</MenuItem>
              {genres.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Results header */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Events</Typography>
          <Typography variant="body2" color="text.secondary">{events.length} found</Typography>
        </Box>

        {/* Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress sx={{ color: PURPLE }} />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No events found. Try adjusting your filters.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2.75,
            }}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default Home;
