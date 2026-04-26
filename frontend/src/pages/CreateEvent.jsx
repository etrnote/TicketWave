import { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Button, Paper, Alert, CircularProgress,
  MenuItem, InputAdornment, Collapse, IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { adminService, eventService } from '../services/api';
import { resolveEventImageSrc } from '../utils/image';
import OccurrenceScheduleEditor from '../components/OccurrenceScheduleEditor';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';
const BG = '#F8F6FF';

const createNewScheduleItem = () => ({ id: null, date: '', time: '', venueId: '', status: 'SCHEDULED' });
const formatDateForInput = (d) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const formatTimeForInput = (d) =>
  [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':');
const MAX_OCCURRENCE_YEARS_AHEAD = 3;
const OCCURRENCE_IN_PAST_MESSAGE = 'Occurrence start time must be in the future.';
const OCCURRENCE_TOO_FAR_MESSAGE = 'Occurrence start time cannot be more than 3 years in the future.';
const isOccurrenceInPast = (item) => {
  if (!item?.date || !item?.time) return false;
  return new Date(`${item.date}T${item.time}:00`).getTime() <= Date.now();
};

function SectionCard({ title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: '28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)', width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '1px', display: 'block', mb: 2.5 }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function CreateEvent() {
  const { id: routeId } = useParams();
  const eventId = Number(routeId);
  const isEditMode = Number.isFinite(eventId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [schedule, setSchedule] = useState([createNewScheduleItem()]);
  const [originalOccurrenceIds, setOriginalOccurrenceIds] = useState([]);
  const [originalOccurrenceStatusById, setOriginalOccurrenceStatusById] = useState({});
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showActiveOccurrences, setShowActiveOccurrences] = useState(true);
  const [showPastOccurrences, setShowPastOccurrences] = useState(true);
  const [showCancelledOccurrences, setShowCancelledOccurrences] = useState(true);

  const showErrorAndScrollToTop = (message) => {
    setError(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateOccurrenceStart = (startTimeIso) => {
    const start = new Date(startTimeIso);
    const now = new Date();
    if (start <= now) return OCCURRENCE_IN_PAST_MESSAGE;
    const maxAllowedStart = new Date(now);
    maxAllowedStart.setFullYear(maxAllowedStart.getFullYear() + MAX_OCCURRENCE_YEARS_AHEAD);
    if (start > maxAllowedStart) return OCCURRENCE_TOO_FAR_MESSAGE;
    return null;
  };

  const validateScheduleBeforeSubmit = () => {
    const editableItems = schedule.filter((item) => item.status !== 'CANCELLED' && !isOccurrenceInPast(item));
    for (const item of editableItems) {
      const hasAnyValue = Boolean(item.date || item.time || item.venueId);
      if (!hasAnyValue) continue;

      if (!item.date || !item.time || !item.venueId) {
        return 'Each occurrence must include date, time, and venue.';
      }

      const startTime = new Date(`${item.date}T${item.time}:00`).toISOString();
      const dateValidationMessage = validateOccurrenceStart(startTime);
      if (dateValidationMessage) {
        return dateValidationMessage;
      }
    }
    return null;
  };

  const validateScheduleBeforeAddOccurrence = (items) => {
    const editableItems = items.filter((item) => item.status !== 'CANCELLED' && !isOccurrenceInPast(item));
    for (const item of editableItems) {
      const hasAnyValue = Boolean(item.date || item.time || item.venueId);
      if (!hasAnyValue) continue;

      if (!item.date || !item.time || !item.venueId) {
        return 'Each occurrence must include date, time, and venue.';
      }

      const startTime = new Date(`${item.date}T${item.time}:00`).toISOString();
      const dateValidationMessage = validateOccurrenceStart(startTime);
      if (dateValidationMessage) return dateValidationMessage;
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests = [eventService.getCategories(), adminService.getVenues()];
        if (isEditMode) {
          requests.push(eventService.getEventById(eventId), adminService.getEventOccurrencesForAdmin(eventId));
        }
        const [catsRes, venuesRes, eventRes, occurrencesRes] = await Promise.all(requests);
        setCategories(catsRes.data);
        setVenues(venuesRes.data);
        if (isEditMode && eventRes?.data) {
          const ev = eventRes.data;
          setTitle(ev.title ?? '');
          setCategory(ev.category ?? '');
          setGenre(ev.genre ?? '');
          setDuration(ev.durationMinutes != null ? String(ev.durationMinutes) : '');
          setDescription(ev.description ?? '');
          if (ev.image) {
            setImageFile({
              encodedImage: ev.image,
              contentType: ev.imageContentType ?? 'image/jpeg',
              previewUrl: resolveEventImageSrc(ev.image, ev.imageContentType),
            });
          }
          const occurrences = occurrencesRes?.data ?? [];
          setOriginalOccurrenceIds(occurrences.map((occ) => occ.id));
          setOriginalOccurrenceStatusById(
            occurrences.reduce((acc, occ) => {
              acc[occ.id] = occ.status ?? 'SCHEDULED';
              return acc;
            }, {}),
          );
          if (occurrences.length > 0) {
            setSchedule(occurrences.map((occ) => {
              const d = new Date(occ.startTime);
              return {
                id: occ.id,
                date: formatDateForInput(d),
                time: formatTimeForInput(d),
                venueId: occ.venueId ? String(occ.venueId) : '',
                status: occ.status ?? 'SCHEDULED',
              };
            }));
            const firstWithPrice = occurrences.find((occ) => occ.price != null);
            if (firstWithPrice) setPrice(String(firstWithPrice.price));
          }
        }
      } catch {
        showErrorAndScrollToTop('Failed to load event form data. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [eventId, isEditMode]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const sep = dataUrl.indexOf(',');
      if (sep === -1) return;
      const header = dataUrl.slice(0, sep);
      const encodedImage = dataUrl.slice(sep + 1);
      const match = header.match(/:(.*?);/);
      if (!match) return;
      setImageFile({ encodedImage, contentType: match[1], previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !category) { setError('Name and Category are required'); return; }
    const durationTrimmed = String(duration).trim();
    const durationMins = parseInt(durationTrimmed, 10);
    if (!durationTrimmed || Number.isNaN(durationMins) || durationMins < 1) {
      setError('Duration (minutes) is required and must be a positive number.');
      return;
    }
    const scheduleValidationMessage = validateScheduleBeforeSubmit();
    if (scheduleValidationMessage) {
      showErrorAndScrollToTop(scheduleValidationMessage);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const eventPayload = {
        title, category, genre,
        durationMinutes: durationMins,
        description,
        image: imageFile?.encodedImage ?? null,
        imageContentType: imageFile?.contentType ?? null,
      };
      const eventRes = isEditMode
        ? await adminService.updateEvent(eventId, eventPayload)
        : await adminService.createEvent(eventPayload);
      const savedEventId = eventRes.data.id;
      const editableOccurrences = schedule.filter(
        (item) => item.status !== 'CANCELLED' && !isOccurrenceInPast(item),
      );
      if (editableOccurrences.some((item) => item.date && item.time && item.venueId)) {
        await Promise.all(schedule.map(async (item) => {
          if (item.status === 'CANCELLED' || isOccurrenceInPast(item)) return;
          if (!item.date || !item.time || !item.venueId) return;
          const startTime = new Date(`${item.date}T${item.time}:00`).toISOString();
          const dateValidationMessage = validateOccurrenceStart(startTime);
          if (dateValidationMessage) {
            throw new Error(dateValidationMessage);
          }
          const occPayload = {
            venueId: item.venueId ? Number(item.venueId) : null,
            startTime,
            price: price ? parseFloat(price) : 0,
          };
          if (isEditMode && item.id) { await adminService.updateOccurrence(item.id, occPayload); return; }
          await adminService.createOccurrence(savedEventId, occPayload);
        }));
      }
      if (isEditMode) {
        const newlyCancelled = schedule
          .filter((item) => item.id != null && item.status === 'CANCELLED')
          .filter((item) => originalOccurrenceStatusById[item.id] !== 'CANCELLED')
          .map((item) => item.id);

        const currentIds = schedule.filter((i) => i.id != null).map((i) => i.id);
        const removed = originalOccurrenceIds.filter((oId) => !currentIds.includes(oId));
        const toCancelIds = [...new Set([...newlyCancelled, ...removed])];

        if (toCancelIds.length > 0) {
          await Promise.all(toCancelIds.map((oId) => adminService.cancelOccurrence(oId)));
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['adminEvents'] });
      await queryClient.invalidateQueries({ queryKey: ['adminOccurrenceStats'] });
      setSuccess(true);
      setTimeout(() => navigate('/admin/events'), 1500);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message
        || (isEditMode ? 'Failed to update event.' : 'Failed to create event.');
      showErrorAndScrollToTop(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;

  const handleRemoveOccurrence = async (index, item) => {
    if (loading) return;
    if (item.id == null) {
      const activeCount = schedule.filter((s) => s.status !== 'CANCELLED').length;
      if (activeCount === 1) return;
      setSchedule(schedule.filter((_, i) => i !== index));
      return;
    }
    try {
      const { data } = await adminService.getOccurrenceCancellationEligibility(item.id);
      if (!data?.cancellable) {
        showErrorAndScrollToTop(data?.message || 'Occurrence cannot be cancelled.');
        return;
      }
      await adminService.cancelOccurrence(item.id);
      setSchedule(schedule.map((row, i) => (i === index ? { ...row, status: 'CANCELLED' } : row)));
      setOriginalOccurrenceStatusById((prev) => ({ ...prev, [item.id]: 'CANCELLED' }));
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['adminOccurrenceStats'] });
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to cancel occurrence.';
      showErrorAndScrollToTop(message);
    }
  };

  const futureOccurrences = schedule.filter(
    (item) => item.status !== 'CANCELLED' && !isOccurrenceInPast(item),
  );
  const pastOccurrences = schedule.filter(
    (item) => item.status !== 'CANCELLED' && isOccurrenceInPast(item),
  );
  const cancelledOccurrences = schedule.filter((item) => item.status === 'CANCELLED');

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4.5 }}>
        <Button onClick={() => navigate('/admin/events')} sx={{ color: 'text.secondary', px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}>
          ← Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          {isEditMode ? 'Edit Event' : 'Add New Event'}
        </Typography>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 3 }}>{isEditMode ? 'Event updated!' : 'Event created!'} Redirecting…</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Two-column: details + poster */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, alignItems: 'stretch', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <SectionCard title="Event Details">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.75 }}>
                <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                  <TextField fullWidth label="Event Name *" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} size="small" />
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                  <TextField select fullWidth label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required disabled={loading} size="small">
                    {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                  </TextField>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.75 }}>
                <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                  <TextField fullWidth label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} disabled={loading} size="small" />
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    required
                    label="Duration (min)"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={loading}
                    size="small"
                    inputProps={{ min: 1, inputMode: 'numeric' }}
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">min</InputAdornment> } }}
                  />
                </Box>
              </Box>
              <Box sx={{ maxWidth: 160 }}>
                <TextField fullWidth label="Price ($)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} size="small" />
              </Box>
              <TextField fullWidth label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={5} disabled={loading} />
            </Box>
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}>
          <SectionCard title="Event Poster">
            <Box
              component="label"
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 1.5, p: 3, borderRadius: '12px', border: `2px dashed ${BORDER}`, cursor: 'pointer',
                flex: 1, bgcolor: BG, transition: 'all 0.2s',
                '&:hover': { borderColor: PURPLE, bgcolor: '#F3E8FF' },
              }}
            >
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              {imageFile ? (
                <>
                  <Box component="img" src={imageFile.previewUrl} alt="Preview"
                    sx={{ maxHeight: 180, maxWidth: '100%', borderRadius: 2, objectFit: 'contain' }} />
                  <Typography variant="body2" color="text.secondary">Click to change image</Typography>
                </>
              ) : (
                <>
                  <Box sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    🖼
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>
                    Upload Poster Image
                  </Typography>
                  <Typography variant="caption" color="text.secondary">PNG, JPG up to 5MB</Typography>
                  <Button variant="outlined" size="small" sx={{ borderColor: PURPLE, color: PURPLE, pointerEvents: 'none' }}>
                    Choose File
                  </Button>
                </>
              )}
            </Box>
          </SectionCard>
        </Box>
      </Box>

      {/* Schedule section */}
      <SectionCard title="Schedule — Occurrences">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Future ({futureOccurrences.length})
          </Typography>
          <IconButton size="small" onClick={() => setShowActiveOccurrences((v) => !v)}>
            {showActiveOccurrences ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={showActiveOccurrences}>
        <OccurrenceScheduleEditor
          schedule={schedule}
          setSchedule={setSchedule}
          venues={venues}
          disabled={loading}
          onRemoveOccurrence={handleRemoveOccurrence}
          statusFilter={(item) => item.status !== 'CANCELLED' && !isOccurrenceInPast(item)}
          showAddButton
          showActionButton
          readOnly={false}
          muted={false}
          onBeforeAddOccurrence={validateScheduleBeforeAddOccurrence}
          onAddOccurrenceValidationError={showErrorAndScrollToTop}
        />
        </Collapse>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Past ({pastOccurrences.length})
          </Typography>
          <IconButton size="small" onClick={() => setShowPastOccurrences((v) => !v)}>
            {showPastOccurrences ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={showPastOccurrences}>
          {pastOccurrences.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              No past occurrences.
            </Typography>
          ) : (
            <OccurrenceScheduleEditor
              schedule={schedule}
              setSchedule={setSchedule}
              venues={venues}
              disabled={loading}
              onRemoveOccurrence={handleRemoveOccurrence}
              statusFilter={(item) => item.status !== 'CANCELLED' && isOccurrenceInPast(item)}
              showAddButton={false}
              showActionButton
              readOnly
              muted
            />
          )}
        </Collapse>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Cancelled ({cancelledOccurrences.length})
          </Typography>
          <IconButton size="small" onClick={() => setShowCancelledOccurrences((v) => !v)}>
            {showCancelledOccurrences ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={showCancelledOccurrences}>
          {cancelledOccurrences.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              No cancelled occurrences.
            </Typography>
          ) : (
            <OccurrenceScheduleEditor
              schedule={schedule}
              setSchedule={setSchedule}
              venues={venues}
              disabled
              statusFilter={(item) => item.status === 'CANCELLED'}
              showAddButton={false}
              showActionButton={false}
              readOnly
              muted
            />
          )}
        </Collapse>
      </SectionCard>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/events')}
          disabled={loading}
          sx={{ borderColor: PURPLE, color: PURPLE, '&:hover': { bgcolor: '#F3E8FF' } }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, px: 3.5 }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : isEditMode ? 'Update Event' : 'Save Event'}
        </Button>
      </Box>
    </Box>
  );
}

export default CreateEvent;
