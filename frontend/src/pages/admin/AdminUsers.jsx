import { useMemo, useState } from 'react';
import {
  Alert, Box, CircularProgress, InputAdornment, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/api';

const PURPLE = '#8B2FBE';
const BORDER = '#EDE9F8';

const ROLE_OPTIONS = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'User', value: 'USER' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function GradientAvatar({ name }) {
  return (
    <Box
      sx={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4ECDE4 0%, #8B2FBE 55%, #E040A8 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '0.75rem', fontWeight: 700,
      }}
    >
      {getInitials(name)}
    </Box>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <Box
      component="span"
      sx={{
        px: 1.25, py: 0.4, borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
        border: `1.5px solid ${isAdmin ? '#D97706' : BORDER}`,
        color: isAdmin ? '#92400E' : '#374151',
        bgcolor: isAdmin ? '#FEF3C7' : '#F3F4F6',
      }}
    >
      {isAdmin ? 'Admin' : 'User'}
    </Box>
  );
}

function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => (await adminService.getUsers()).data,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const adminCount = useMemo(() => users.filter((u) => u.role === 'ADMIN').length, [users]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  if (isError) return <Alert severity="error">Failed to load users. Please try again.</Alert>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Manage Users</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{filteredUsers.length} users shown</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Box sx={{ px: 1.5, py: 0.5, borderRadius: 20, border: `1.5px solid ${BORDER}`, bgcolor: '#F3E8FF' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: PURPLE }}>{users.length} total</Typography>
          </Box>
          <Box sx={{ px: 1.5, py: 0.5, borderRadius: 20, border: `1.5px solid #FDE68A`, bgcolor: '#FEF3C7' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400E' }}>{adminCount} admins</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 40, bgcolor: 'background.paper', border: `1.5px solid ${BORDER}`, borderRadius: '10px', px: 1.75, flex: 1, maxWidth: { sm: 340 } }}>
          <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary', flexShrink: 0 }} />
          <Box
            component="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            sx={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.8125rem', color: 'text.primary', bgcolor: 'transparent', width: '100%' }}
          />
        </Box>
        <TextField
          select size="small" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          {ROLE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(26,16,53,0.07)', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: `2px solid ${BORDER}` }}>
              {['User', 'Email', 'Role', 'ID'].map((h, i) => (
                <TableCell key={h} align={i === 3 ? 'right' : 'left'} sx={{ bgcolor: 'white !important' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No users found.</Typography>
                </TableCell>
              </TableRow>
            ) : filteredUsers.map((user) => (
              <TableRow key={user.userId} sx={{ borderBottom: `1px solid ${BORDER}`, '&:hover': { bgcolor: '#FAFAFF' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <GradientAvatar name={user.name} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.name || '—'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: PURPLE }}>#{user.userId}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default AdminUsers;
