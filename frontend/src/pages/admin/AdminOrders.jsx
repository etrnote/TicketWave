import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, InputAdornment, MenuItem, Paper,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/api';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';

const STATUS_STYLES = {
  COMPLETED: { bg: '#DCFCE7', text: '#166534' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value ?? 0));
}
function formatDate(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoString));
}
function toDateOnly(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#F3F4F6', text: '#374151' };
  const label = status === 'COMPLETED' ? 'Completed' : status === 'CANCELLED' ? 'Cancelled' : status;
  return (
    <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, bgcolor: style.bg, color: style.text }}>
      {label}
    </Box>
  );
}

function AdminOrders() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => (await adminService.getOrders()).data,
  });

  const { data: occurrenceStats = [] } = useQuery({
    queryKey: ['adminOccurrenceStats'],
    queryFn: async () => (await adminService.getOccurrenceStats()).data,
  });

  const eventTitleByOccurrence = useMemo(() => {
    const map = new Map();
    occurrenceStats.forEach((s) => { if (s.occurrenceId != null) map.set(s.occurrenceId, s.eventTitle ?? '—'); });
    return map;
  }, [occurrenceStats]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (dateFilter && toDateOnly(o.createdAt) !== dateFilter) return false;
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const event = eventTitleByOccurrence.get(o.occurrenceId) ?? '';
        if (!String(o.id).includes(q) && !event.toLowerCase().includes(q) && !String(o.userId).includes(q)) return false;
      }
      return true;
    });
  }, [orders, dateFilter, statusFilter, search, eventTitleByOccurrence]);

  const paginatedOrders = useMemo(() => filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredOrders, page, rowsPerPage]);

  const cancellableIds = useMemo(() => new Set(filteredOrders.filter((o) => o.status !== 'CANCELLED').map((o) => o.id)), [filteredOrders]);
  const visibleCancellableIds = useMemo(() => paginatedOrders.filter((o) => o.status !== 'CANCELLED').map((o) => o.id), [paginatedOrders]);
  const allVisibleSelected = visibleCancellableIds.length > 0 && visibleCancellableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allVisibleSelected) setSelected((p) => { const n = new Set(p); visibleCancellableIds.forEach((id) => n.delete(id)); return n; });
    else setSelected((p) => { const n = new Set(p); visibleCancellableIds.forEach((id) => n.add(id)); return n; });
  };
  const toggleRow = (id) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const cancelMutation = useMutation({
    mutationFn: async (ids) => { await Promise.all([...ids].map((id) => adminService.cancelOrder(id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); setSelected(new Set()); setConfirmOpen(false); showSnack('Orders cancelled successfully'); },
    onError: () => { setConfirmOpen(false); showSnack('Failed to cancel one or more orders', 'error'); },
  });

  const selectedCancellable = useMemo(() => new Set([...selected].filter((id) => cancellableIds.has(id))), [selected, cancellableIds]);

  if (ordersLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  if (ordersError) return <Alert severity="error">Failed to load orders. Please try again.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Orders History</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{filteredOrders.length} orders</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            type="date" size="small" value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setSelected(new Set()); setPage(0); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
          />
          <TextField
            select size="small" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          >
            {['All', 'COMPLETED', 'CANCELLED'].map((s) => <MenuItem key={s} value={s}>{s === 'All' ? 'All' : s === 'COMPLETED' ? 'Completed' : 'Cancelled'}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 40, bgcolor: 'background.paper', border: `1.5px solid ${BORDER}`, borderRadius: '10px', px: 1.75 }}>
            <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Box component="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search…"
              sx={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.8125rem', color: 'text.primary', bgcolor: 'transparent', width: 140 }} />
          </Box>
        </Stack>
      </Box>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: '10px 16px', bgcolor: '#F3E8FF', borderRadius: '10px', border: `1px solid ${BORDER}` }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: PURPLE }}>{selected.size} selected</Typography>
          <Button size="small" variant="outlined" onClick={() => setSelected(new Set())} sx={{ borderColor: BORDER, color: 'text.secondary', height: 28 }}>Clear</Button>
          <Button size="small" onClick={() => setConfirmOpen(true)} sx={{ bgcolor: '#FEE2E2', color: '#EF4444', height: 28, '&:hover': { bgcolor: '#FEE2E2' } }}>
            Cancel Selected
          </Button>
        </Box>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(26,16,53,0.07)', overflow: 'hidden', flexGrow: 1 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ borderBottom: `2px solid ${BORDER}` }}>
              <TableCell padding="checkbox" sx={{ bgcolor: 'white !important' }}>
                <Checkbox size="small" checked={allVisibleSelected} indeterminate={!allVisibleSelected && visibleCancellableIds.some((id) => selected.has(id))} onChange={toggleAll} disabled={visibleCancellableIds.length === 0}
                  sx={{ color: BORDER, '&.Mui-checked': { color: PURPLE }, '&.MuiCheckbox-indeterminate': { color: PURPLE } }} />
              </TableCell>
              {['Order ID', 'Customer', 'Event', 'Date', 'Total', 'Status'].map((h) => <TableCell key={h} sx={{ bgcolor: 'white !important' }}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{dateFilter ? 'No orders on this date.' : 'No orders found.'}</Typography></TableCell></TableRow>
            ) : paginatedOrders.map((order) => {
              const isCancelled = order.status === 'CANCELLED';
              const isChecked = selected.has(order.id);
              const eventTitle = eventTitleByOccurrence.get(order.occurrenceId) ?? '—';
              return (
                <TableRow key={order.id} onClick={() => !isCancelled && toggleRow(order.id)}
                  sx={{ borderBottom: `1px solid ${BORDER}`, bgcolor: isChecked ? '#FAF8FF' : 'white', opacity: isCancelled ? 0.6 : 1, cursor: isCancelled ? 'default' : 'pointer', '&:hover': { bgcolor: isChecked ? '#FAF8FF' : '#FAFAFF' }, transition: 'background 0.1s' }}>
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={isChecked} disabled={isCancelled} onChange={() => toggleRow(order.id)}
                      sx={{ color: BORDER, '&.Mui-checked': { color: PURPLE } }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: PURPLE }}>#{order.id}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">User #{order.userId}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{eventTitle}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>{formatDate(order.createdAt)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatPrice(order.totalPrice)}</Typography></TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filteredOrders.length} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]} sx={{ borderTop: `1px solid ${BORDER}` }} />
      </TableContainer>

      {/* Footer */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2.5 }}>
        <Button variant="outlined" startIcon={<CancelOutlinedIcon />} disabled={selectedCancellable.size === 0} onClick={() => setConfirmOpen(true)}
          sx={{ borderColor: selectedCancellable.size > 0 ? '#EF4444' : BORDER, color: selectedCancellable.size > 0 ? '#EF4444' : 'text.secondary' }}>
          Cancel {selectedCancellable.size > 0 ? `(${selectedCancellable.size})` : ''}
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Orders</DialogTitle>
        <DialogContent>
          <DialogContentText>Cancel <strong>{selectedCancellable.size}</strong> selected order{selectedCancellable.size > 1 ? 's' : ''}? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined" sx={{ borderColor: BORDER, color: 'text.secondary' }}>Back</Button>
          <Button color="error" variant="contained" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(selectedCancellable)} sx={{ minWidth: 90 }}>
            {cancelMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminOrders;
