import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider,
  IconButton, Menu, MenuItem, Paper, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService, eventService } from '../../services/api';
import OccurrenceScheduleEditor from '../../components/OccurrenceScheduleEditor';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';

const CAT_COLORS = {
  Concert: { bg: '#FDE68A', text: '#92400E' },
  Theater: { bg: '#F3E8FF', text: '#7C3AED' },
  Movie: { bg: '#DBEAFE', text: '#1D4ED8' },
  Show: { bg: '#FCE7F3', text: '#9D174D' },
};

function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoString));
}

function BookingBar({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const barColor = pct >= 80 ? '#22C55E' : pct >= 50 ? PURPLE : '#F97316';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ flex: 1, height: 8, bgcolor: BORDER, borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', minWidth: 36, textAlign: 'right' }}>
        {Math.round(pct)}%
      </Typography>
    </Box>
  );
}

function OccurrenceSubTable({ stats }) {
  if (!stats || stats.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, px: 2 }}>No occurrences found.</Typography>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: '#F0EDF8' }}>
          {['Date & Time', 'Venue', 'Booked / Total', 'Fill Rate'].map((h) => (
            <TableCell key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, py: 1 }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {stats.map((s) => {
          const pct = s.totalCapacity > 0 ? Math.round((s.ticketsSold / s.totalCapacity) * 100) : 0;
          return (
            <TableRow key={s.occurrenceId}>
              <TableCell sx={{ fontSize: '0.8125rem' }}>{formatDateTime(s.startTime)}</TableCell>
              <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{s.venueName}</TableCell>
              <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.ticketsSold} / {s.totalCapacity}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 80, height: 6, bgcolor: BORDER, borderRadius: 3 }}>
                    <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: pct > 80 ? '#22C55E' : PURPLE, borderRadius: 3 }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{pct}%</Typography>
                </Box>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AddOccurrenceDialog({ eventId, open, onClose, onSuccess }) {
  const [schedule, setSchedule] = useState([{ date: '', time: '', venueId: '' }]);
  const [price, setPrice] = useState('');
  const [venues, setVenues] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const MAX_OCCURRENCE_YEARS_AHEAD = 3;
  const OCCURRENCE_IN_PAST_MESSAGE = 'Occurrence start time must be in the future.';
  const OCCURRENCE_TOO_FAR_MESSAGE = 'Occurrence start time cannot be more than 3 years in the future.';

  useEffect(() => {
    if (!open || !eventId) return;
    setSchedule([{ date: '', time: '', venueId: '' }]);
    setPrice('');
    setError(null);
    setFetchLoading(true);
    Promise.all([adminService.getVenues(), eventService.getOccurrences(eventId)])
      .then(([venuesRes, occRes]) => {
        setVenues(venuesRes.data);
        const first = (occRes.data ?? []).find((o) => o.price != null);
        if (first) setPrice(String(first.price));
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setFetchLoading(false));
  }, [open, eventId]);

  const validateOccurrenceStart = (startTimeIso) => {
    const start = new Date(startTimeIso);
    const now = new Date();
    if (start <= now) return OCCURRENCE_IN_PAST_MESSAGE;
    const maxAllowedStart = new Date(now);
    maxAllowedStart.setFullYear(maxAllowedStart.getFullYear() + MAX_OCCURRENCE_YEARS_AHEAD);
    if (start > maxAllowedStart) return OCCURRENCE_TOO_FAR_MESSAGE;
    return null;
  };

  const validateScheduleItems = (items) => {
    for (const item of items) {
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

  const handleSave = async () => {
    const validationMessage = validateScheduleItems(schedule);
    if (validationMessage) { setError(validationMessage); return; }
    const valid = schedule.filter((i) => i.date && i.time && i.venueId);
    if (valid.length === 0) { setError('Please fill in at least one complete occurrence.'); return; }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(valid.map((item) => {
        const startTime = new Date(`${item.date}T${item.time}:00`).toISOString();
        return adminService.createOccurrence(eventId, { venueId: item.venueId, startTime, price: price ? parseFloat(price) : 0 });
      }));
      onSuccess();
      onClose();
    } catch (e) {
      const message = e?.response?.data?.error || e?.message || 'Failed to add occurrences. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Occurrences</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {fetchLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: PURPLE }} />
          </Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <OccurrenceScheduleEditor
              schedule={schedule}
              setSchedule={setSchedule}
              venues={venues}
              disabled={saving}
              onBeforeAddOccurrence={validateScheduleItems}
              onAddOccurrenceValidationError={setError}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving} sx={{ borderColor: BORDER, color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || fetchLoading}
          sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, minWidth: 90 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EventRow({ event, occurrenceStats, onEdit, onAddOccurrence, onRequestDeleteEvent }) {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const eventStats = useMemo(
    () => occurrenceStats.filter((s) => s.eventId === event.id),
    [occurrenceStats, event.id],
  );
  const avgOccupancy = useMemo(() => {
    if (eventStats.length === 0) return 0;
    return eventStats.reduce((acc, s) => acc + (s.occupancyPercentage ?? 0), 0) / eventStats.length;
  }, [eventStats]);

  const catStyle = CAT_COLORS[event.category] || { bg: '#F3F4F6', text: '#374151' };
  const openMenu = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <TableRow
        onClick={() => setExpanded((v) => !v)}
        sx={{
          cursor: 'pointer',
          bgcolor: expanded ? '#FAFAFF' : 'white',
          transition: 'background 0.15s',
          '& .MuiTableCell-root': { borderBottom: expanded ? 'none' : `1px solid ${BORDER}` },
          '&:hover': { bgcolor: '#FAFAFF' },
        }}
      >
        <TableCell sx={{ width: 40, pl: 1.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
            {expanded ? <ExpandMoreIcon fontSize="small" sx={{ color: PURPLE }} /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{event.title}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={event.category} size="small" sx={{ bgcolor: catStyle.bg, color: catStyle.text, fontWeight: 600, fontSize: '0.75rem' }} />
        </TableCell>
        <TableCell sx={{ minWidth: 220 }}>
          <BookingBar value={avgOccupancy} />
        </TableCell>
        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outlined" size="small"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={openMenu}
            sx={{ borderColor: BORDER, color: 'text.primary', borderRadius: '8px', fontWeight: 600 }}
          >
            Actions
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}
            PaperProps={{ sx: { borderRadius: '10px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140 } }}>
            <MenuItem onClick={() => { closeMenu(); onEdit(event.id); }} sx={{ fontSize: '0.8125rem' }}>Edit</MenuItem>
            <MenuItem onClick={() => { closeMenu(); onAddOccurrence(event.id); }} sx={{ fontSize: '0.8125rem' }}>Add Occurrence</MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                onRequestDeleteEvent(event);
              }}
              sx={{ fontSize: '0.8125rem', color: 'error.main', fontWeight: 600 }}
            >
              Remove Event
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
          <Collapse in={expanded} unmountOnExit>
            <Box sx={{ mx: 6.5, my: 1.75, borderRadius: '10px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <OccurrenceSubTable stats={eventStats} />
            </Box>
            <Divider sx={{ borderColor: BORDER }} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function AdminEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [addOccDialog, setAddOccDialog] = useState({ open: false, eventId: null });

  const { data: events = [], isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => (await adminService.getAdminEvents()).data,
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, event: null });
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { data: occurrenceStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['adminOccurrenceStats'],
    queryFn: async () => (await adminService.getOccurrenceStats()).data,
  });

  if (eventsLoading || statsLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  }
  if (eventsError) return <Alert severity="error">Failed to load events. Please try again.</Alert>;

  const handleRequestDeleteEvent = (ev) => {
    setDeleteConfirm({ open: true, event: ev });
  };

  const handleConfirmDeleteEvent = async () => {
    if (!deleteConfirm.event) return;
    setDeleteBusy(true);
    try {
      await adminService.deleteEvent(deleteConfirm.event.id);
      setDeleteConfirm({ open: false, event: null });
      await queryClient.invalidateQueries({ queryKey: ['adminEvents'] });
      await queryClient.invalidateQueries({ queryKey: ['adminOccurrenceStats'] });
      setSnackbar({ open: true, message: 'Event removed from listings.' });
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to remove event.';
      setSnackbar({ open: true, message: msg });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Manage Events</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{events.length} events total</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/events/create')}
          sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}
        >
          New Event
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(26,16,53,0.07)', overflow: 'hidden' }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: `2px solid ${BORDER}` }}>
              <TableCell sx={{ width: 40 }} />
              <TableCell>Event</TableCell>
              <TableCell>Category</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Avg. Booking</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No events found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  occurrenceStats={occurrenceStats}
                  onEdit={(eId) => navigate(`/admin/events/${eId}/edit`)}
                  onAddOccurrence={(eId) => setAddOccDialog({ open: true, eventId: eId })}
                  onRequestDeleteEvent={handleRequestDeleteEvent}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AddOccurrenceDialog
        eventId={addOccDialog.eventId}
        open={addOccDialog.open}
        onClose={() => setAddOccDialog({ open: false, eventId: null })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['adminOccurrenceStats'] });
          setSnackbar({ open: true, message: 'Occurrence added successfully' });
        }}
      />

      <Dialog
        open={deleteConfirm.open}
        onClose={() => !deleteBusy && setDeleteConfirm({ open: false, event: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Remove event?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirm.event ? (
              <>This will hide “{deleteConfirm.event.title}” from regular listings. This cannot be undone from this screen.</>
            ) : null}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, event: null })} disabled={deleteBusy} variant="outlined" sx={{ borderColor: BORDER, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteEvent}
            disabled={deleteBusy}
            variant="contained"
            color="error"
            sx={{ minWidth: 90 }}
          >
            {deleteBusy ? <CircularProgress size={18} color="inherit" /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ open: false, message: '' })} message={snackbar.message} />
    </Box>
  );
}

export default AdminEvents;
