import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, FormControlLabel, IconButton, Paper, Radio,
  RadioGroup, Snackbar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/api';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';

const SEATING_TYPES = [
  { value: 'RESERVED', label: 'Reserved Seats' },
  { value: 'GENERAL', label: 'General Seating' },
];

const EMPTY_FORM = { name: '', city: '', address: '', seatingType: 'RESERVED', rows: 20, seatsPerRow: 50, capacity: 80 };

function buildPayload(form) {
  if (form.seatingType === 'RESERVED') {
    return { name: form.name.trim(), city: form.city.trim(), address: form.address.trim(), seatingType: 'RESERVED', rows: Number(form.rows), seatsPerRow: Number(form.seatsPerRow), capacity: Number(form.rows) * Number(form.seatsPerRow) };
  }
  return { name: form.name.trim(), city: form.city.trim(), address: form.address.trim(), seatingType: 'GENERAL', capacity: Number(form.capacity) };
}

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Required';
  if (!form.city.trim()) e.city = 'Required';
  if (!form.address.trim()) e.address = 'Required';
  if (form.seatingType === 'RESERVED') {
    if (!form.rows || Number(form.rows) < 1) e.rows = 'Min 1';
    if (!form.seatsPerRow || Number(form.seatsPerRow) < 1) e.seatsPerRow = 'Min 1';
  } else {
    if (!form.capacity || Number(form.capacity) < 1) e.capacity = 'Min 1';
  }
  return e;
}

function VenueFormDialog({ open, onClose, initialVenue, existingCities, onSave, isSaving }) {
  const isEdit = Boolean(initialVenue);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!open) return;
    setTouched({});
    if (initialVenue) {
      setForm({
        name: initialVenue.name ?? '',
        city: initialVenue.city ?? '',
        address: initialVenue.address ?? '',
        seatingType: initialVenue.seatingType ?? 'RESERVED',
        rows: initialVenue.rows ?? 20,
        seatsPerRow: initialVenue.seatsPerRow ?? 50,
        capacity: initialVenue.seatingType === 'GENERAL' ? (initialVenue.capacity ?? 80) : 80,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, initialVenue]);
  const errors = validate(form);
  const reservedCapacity = form.seatingType === 'RESERVED' ? Number(form.rows || 0) * Number(form.seatsPerRow || 0) : null;
  const set = (field) => (e) => { setForm((p) => ({ ...p, [field]: e.target.value })); setTouched((p) => ({ ...p, [field]: true })); };
  const handleSave = () => { setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true]))); if (Object.keys(errors).length > 0) return; onSave(buildPayload(form)); };
  const handleClose = () => { onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{isEdit ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} error={touched.name && Boolean(errors.name)} helperText={touched.name && errors.name} fullWidth size="small" />
          <TextField label="Address" value={form.address} onChange={set('address')} error={touched.address && Boolean(errors.address)} helperText={touched.address && errors.address} fullWidth size="small" />
        </Stack>
        <Autocomplete
          freeSolo
          options={existingCities}
          value={form.city}
          onChange={(_, value) => { setForm((p) => ({ ...p, city: value ?? '' })); setTouched((p) => ({ ...p, city: true })); }}
          onInputChange={(_, value) => { setForm((p) => ({ ...p, city: value })); setTouched((p) => ({ ...p, city: true })); }}
          sx={{ mb: 2.5, minWidth: 200 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="City"
              size="small"
              error={touched.city && Boolean(errors.city)}
              helperText={touched.city && errors.city}
            />
          )}
        />

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>Seating Type</Typography>
          <RadioGroup row value={form.seatingType} onChange={set('seatingType')}>
            {SEATING_TYPES.map(({ value, label }) => (
              <FormControlLabel key={value} value={value} control={<Radio size="small" sx={{ color: PURPLE, '&.Mui-checked': { color: PURPLE } }} />}
                label={<Typography variant="body2" sx={{ fontWeight: form.seatingType === value ? 700 : 400, color: form.seatingType === value ? PURPLE : 'text.secondary' }}>{label}</Typography>} />
            ))}
          </RadioGroup>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1, border: `2px solid ${form.seatingType === 'RESERVED' ? PURPLE : BORDER}`, borderRadius: '14px', p: 3, opacity: form.seatingType === 'RESERVED' ? 1 : 0.4, transition: 'all 0.2s', bgcolor: form.seatingType === 'RESERVED' ? '#FBF8FF' : 'white' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 2 }}>Reserved Layout</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Rows</Typography>
                <TextField type="number" value={form.rows} onChange={set('rows')} error={touched.rows && Boolean(errors.rows)} size="small" sx={{ width: 80 }} slotProps={{ htmlInput: { min: 1, max: 200 } }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Seats per Row</Typography>
                <TextField type="number" value={form.seatsPerRow} onChange={set('seatsPerRow')} error={touched.seatsPerRow && Boolean(errors.seatsPerRow)} size="small" sx={{ width: 80 }} slotProps={{ htmlInput: { min: 1, max: 200 } }} />
              </Box>
              <Box sx={{ height: 1, bgcolor: BORDER }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Total Capacity</Typography>
                <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: PURPLE }}>
                  {reservedCapacity?.toLocaleString() ?? '—'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, border: `2px solid ${form.seatingType === 'GENERAL' ? PURPLE : BORDER}`, borderRadius: '14px', p: 3, opacity: form.seatingType === 'GENERAL' ? 1 : 0.4, transition: 'all 0.2s', bgcolor: form.seatingType === 'GENERAL' ? '#FBF8FF' : 'white' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 2 }}>General Seating</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Seats</Typography>
              <TextField type="number" value={form.capacity} onChange={set('capacity')} error={touched.capacity && Boolean(errors.capacity)} size="small" sx={{ width: 80 }} slotProps={{ htmlInput: { min: 1 } }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              General admission — no assigned seats. Tickets are sold until capacity is reached.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} sx={{ borderColor: BORDER, color: 'text.secondary' }} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving} sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' }, minWidth: 80 }}>
          {isSaving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : isEdit ? 'Save Changes' : 'Save Venue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteConfirmDialog({ venue, onConfirm, onClose, isDeleting }) {
  return (
    <Dialog open={Boolean(venue)} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete Venue</DialogTitle>
      <DialogContent>
        <DialogContentText>Delete <strong>{venue?.name}</strong>? This cannot be undone.</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: BORDER, color: 'text.secondary' }}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting} sx={{ minWidth: 80 }}>
          {isDeleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const SEAT_ACTIVE = '#ffffff';
const SEAT_INACTIVE = '#D1D5DB';

function VenueSeatsDialog({ venue, onClose }) {
  const queryClient = useQueryClient();
  const [blockError, setBlockError] = useState(null); // { message, ticketIds }

  useEffect(() => { setBlockError(null); }, [venue?.id]);

  const { data: seats = [], isLoading, isError } = useQuery({
    queryKey: ['venueSeats', venue?.id],
    queryFn: async () => (await adminService.getVenueSeats(venue.id)).data,
    enabled: Boolean(venue),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ seatId, isActive }) => adminService.toggleVenueSeat(venue.id, seatId, isActive),
    onSuccess: () => {
      setBlockError(null);
      queryClient.invalidateQueries({ queryKey: ['venueSeats', venue?.id] });
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data?.ticketIds) {
        setBlockError({ message: data.error, ticketIds: data.ticketIds });
      }
    },
  });

  const handleSeatClick = (seat) => {
    if (toggleMutation.isPending) return;
    setBlockError(null);
    toggleMutation.mutate({ seatId: seat.id, isActive: !seat.isActive });
  };

  const seatsByRow = {};
  seats.forEach((seat) => {
    if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
    seatsByRow[seat.row].push(seat);
  });
  const sortedRows = Object.keys(seatsByRow).sort((a, b) => parseInt(a) - parseInt(b));
  sortedRows.forEach((row) => { seatsByRow[row].sort((a, b) => a.number - b.number); });

  return (
    <Dialog open={Boolean(venue)} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {venue?.name} — Seat Layout
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.25 }}>
          {venue?.rows} rows × {venue?.seatsPerRow} seats/row · {venue?.capacity?.toLocaleString()} total · Click a seat to toggle active/inactive
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: PURPLE }} />
          </Box>
        )}
        {isError && <Alert severity="error">Failed to load seats.</Alert>}

        {blockError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBlockError(null)}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Cannot deactivate this seat
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {blockError.message} — it has valid tickets for upcoming occurrences that are not cancelled.
            </Typography>
            <Typography variant="body2">
              Blocking ticket IDs: <strong>{blockError.ticketIds.join(', ')}</strong>
            </Typography>
          </Alert>
        )}

        {!isLoading && !isError && (
          <Box>
            {/* Stage */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{
                display: 'inline-block', bgcolor: '#E8E4F0', color: '#7C7298',
                borderRadius: '6px 6px 0 0', py: 1, width: '92%',
                fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
              }}>
                STAGE
              </Box>
            </Box>

            {/* Seat grid */}
            <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '50vh' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, minWidth: 'fit-content', mx: 'auto', py: 1 }}>
                {sortedRows.map((row) => (
                  <Box key={row} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ width: 18, textAlign: 'center', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                      {String.fromCharCode(64 + parseInt(row))}
                    </Typography>
                    {seatsByRow[row].map((seat) => {
                      const active = seat.isActive !== false;
                      return (
                        <Box
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          title={`Row ${seat.row}, Seat ${seat.number} — click to mark ${active ? 'inactive' : 'active'}`}
                          sx={{
                            width: 28, height: 26,
                            borderRadius: '5px 5px 3px 3px',
                            bgcolor: active ? SEAT_ACTIVE : SEAT_INACTIVE,
                            border: active ? `1px solid ${BORDER}` : 'none',
                            flexShrink: 0,
                            cursor: toggleMutation.isPending ? 'wait' : 'pointer',
                            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), inset 0 -2px 0 rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.12s',
                            '&:hover': { opacity: 0.7, transform: 'scale(1.08)' },
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
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2.5 }}>
              {[[SEAT_ACTIVE, 'Active', true], [SEAT_INACTIVE, 'Inactive', false]].map(([bg, label, border]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 18, borderRadius: '4px 4px 2px 2px', bgcolor: bg, border: border ? `1.5px solid ${BORDER}` : 'none' }} />
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: BORDER, color: 'text.secondary' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function AdminVenues() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [deletingVenue, setDeletingVenue] = useState(null);
  const [viewingVenue, setViewingVenue] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const { data: venues = [], isLoading, isError } = useQuery({
    queryKey: ['adminVenues'],
    queryFn: async () => (await adminService.getVenues()).data,
  });

  const existingCities = useMemo(() => [...new Set(venues.map((v) => v.city).filter(Boolean))].sort(), [venues]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['adminVenues'] });

  const createMutation = useMutation({ mutationFn: (d) => adminService.createVenue(d), onSuccess: () => { invalidate(); setFormOpen(false); showSnack('Venue created successfully'); }, onError: () => showSnack('Failed to create venue', 'error') });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => adminService.updateVenue(id, data), onSuccess: () => { invalidate(); setFormOpen(false); setEditingVenue(null); showSnack('Venue updated successfully'); }, onError: (err) => showSnack(err?.response?.data?.message ?? 'Failed to update venue', 'error') });
  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteVenue(id),
    onSuccess: () => {
      invalidate();
      setDeletingVenue(null);
      showSnack('Venue deleted');
    },
    onError: (err) => {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete venue';
      showSnack(message, 'error');
    },
  });

  const handleSave = (payload) => editingVenue ? updateMutation.mutate({ id: editingVenue.id, data: payload }) : createMutation.mutate(payload);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  if (isError) return <Alert severity="error">Failed to load venues. Please try again.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Manage Venues</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{venues.length} venues</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingVenue(null); setFormOpen(true); }} sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}>
          New Venue
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(26,16,53,0.07)', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: `2px solid ${BORDER}` }}>
              {['Name', 'City', 'Address', 'Seating', 'Capacity', 'Actions'].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {venues.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No venues yet.</Typography></TableCell></TableRow>
            ) : venues.map((venue) => (
              <TableRow key={venue.id} sx={{ borderBottom: `1px solid ${BORDER}`, '&:hover': { bgcolor: '#FAFAFF' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{venue.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{venue.city}</TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venue.address}</TableCell>
                <TableCell>
                  <Box component="span" sx={{
                    px: 1.5, py: 0.5, borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    border: `1.5px solid ${venue.seatingType === 'RESERVED' ? PURPLE : BORDER}`,
                    color: venue.seatingType === 'RESERVED' ? PURPLE : 'text.secondary',
                    bgcolor: venue.seatingType === 'RESERVED' ? '#F3E8FF' : 'white',
                  }}>
                    {venue.seatingType === 'RESERVED' ? 'Reserved' : 'General'}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{venue.capacity != null ? venue.capacity.toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75}>
                    {venue.seatingType === 'RESERVED' && (
                      <Tooltip title="View Seats">
                        <IconButton size="small" onClick={() => setViewingVenue(venue)}
                          sx={{ border: `1.5px solid ${BORDER}`, borderRadius: '6px', width: 30, height: 30, '&:hover': { borderColor: PURPLE, color: PURPLE } }}>
                          <VisibilityOutlinedIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditingVenue(venue); setFormOpen(true); }}
                        sx={{ border: `1.5px solid ${BORDER}`, borderRadius: '6px', width: 30, height: 30, '&:hover': { borderColor: PURPLE, color: PURPLE } }}>
                        <EditOutlinedIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingVenue(venue)}
                        sx={{ border: '1.5px solid #FCA5A5', borderRadius: '6px', width: 30, height: 30, bgcolor: '#FEF2F2', color: 'error.main', '&:hover': { bgcolor: '#FEE2E2' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: '0.875rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <VenueFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditingVenue(null); }} initialVenue={editingVenue} existingCities={existingCities} onSave={handleSave} isSaving={isSaving} />
      <DeleteConfirmDialog venue={deletingVenue} onClose={() => setDeletingVenue(null)} onConfirm={() => deleteMutation.mutate(deletingVenue.id)} isDeleting={deleteMutation.isPending} />
      <VenueSeatsDialog venue={viewingVenue} onClose={() => setViewingVenue(null)} />
      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminVenues;
