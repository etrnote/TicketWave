import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography, IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

const PURPLE = '#8B2FBE';
const PINK = '#E040A8';
const TEAL = '#40C9E0';
const BORDER = '#EDE9F8';

const RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'All Time', value: 'all' },
];

const STATUS_STYLES = {
  COMPLETED: { bg: '#DCFCE7', text: '#166534', label: 'completed' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B', label: 'cancelled' },
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));
}
function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

function rangeLabel(rangeKey) {
  if (rangeKey === '7') return 'last 7 days';
  if (rangeKey === '30') return 'last 30 days';
  return 'all time';
}

function StatCard({ title, value, change, icon, comparisonLabel }) {
  const showChange = change !== null && change !== undefined;
  const number = Number(change ?? 0);
  const up = number >= 0;
  return (
    <Paper
      elevation={0}
      sx={{
        p: '24px 28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
        boxShadow: '0 2px 12px rgba(26,16,53,0.07)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>{title}</Typography>
          <Typography sx={{ fontSize: '1.875rem', fontWeight: 800, color: 'text.primary', letterSpacing: '-1px' }}>
            {value}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, minHeight: 20 }}>
            {showChange ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700, color: up ? 'success.main' : 'error.main' }}>
                  {up ? '↑' : '↓'} {Math.abs(number).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">{comparisonLabel}</Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">cumulative total</Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

function TimeSeriesBarChart({ data, valueKey = 'sales', height = 180 }) {
  if (!data || data.length === 0) {
    return <Typography variant="body2" color="text.secondary">No data for selected range.</Typography>;
  }
  const W = 520, H = height, PAD_L = 36, PAD_R = 12, PAD_B = 28;
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_B;
  const slot = innerW / data.length;
  const barW = Math.max(Math.min(slot - 4, 28), 2);

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((max / tickCount) * i));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 4}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PURPLE} />
          <stop offset="100%" stopColor={TEAL} />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => {
        const y = innerH - (t / max) * innerH;
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={BORDER} strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end" fill="#7C7298" fontSize="10" fontFamily="Poppins, sans-serif">{t}</text>
          </g>
        );
      })}
      {data.map((item, i) => {
        const v = Number(item[valueKey]) || 0;
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const bh = (v / max) * innerH;
        const y = innerH - bh;
        return (
          <g key={i}>
            <title>{`${item.label}: ${v}`}</title>
            <rect x={x} y={y} width={barW} height={Math.max(bh, 1)} rx={3} fill="url(#barGradient)" />
            {i % labelStep === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill="#7C7298" fontSize="10" fontFamily="Poppins, sans-serif">
                {item.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={PAD_L} y1={innerH} x2={W - PAD_R} y2={innerH} stroke={BORDER} strokeWidth="1.5" />
    </svg>
  );
}

function HorizontalBarChart({ data, format = (v) => v }) {
  if (!data || data.length === 0) {
    return <Typography variant="body2" color="text.secondary">No data for selected range.</Typography>;
  }
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  return (
    <Stack spacing={1.5}>
      {data.map((d) => {
        const pct = (Number(d.value) || 0) / max * 100;
        return (
          <Box key={d.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }} title={d.label}>
                {d.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: PURPLE }}>{format(d.value)}</Typography>
            </Box>
            <Box sx={{ height: 8, bgcolor: BORDER, borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${PURPLE}, ${PINK})`, borderRadius: 4 }} />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#F3F4F6', text: '#374151', label: status };
  return (
    <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, bgcolor: style.bg, color: style.text }}>
      {style.label}
    </Box>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [rangeKey, setRangeKey] = useState('30');

  const { data: insights, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['adminDashboardInsights'],
    queryFn: async () => (await adminService.getDashboardInsights()).data,
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: PURPLE }} /></Box>;
  }
  if (isError) {
    return <Alert severity="error">Failed to load dashboard data. Please try again.</Alert>;
  }

  const range = insights?.ranges?.[rangeKey] ?? { kpis: {}, salesSeries: [], topEvents: [], categoryBreakdown: [] };
  const kpis = range.kpis || {};
  const recentOrders = insights?.recentOrders || [];
  const periodLabel = rangeLabel(rangeKey);
  const comparisonLabel = rangeKey === 'all' ? '' : `vs previous ${periodLabel.replace('last ', '')}`;
  const granularity = range.seriesGranularity === 'month' ? 'monthly' : 'daily';

  const salesChartTitle = `Sales — ${periodLabel}`;
  const salesChartDesc = rangeKey === 'all'
    ? 'Total revenue per month across all completed orders'
    : `Daily revenue from completed orders over the ${periodLabel}`;

  const ticketsChartDesc = rangeKey === 'all'
    ? 'Tickets sold per month across all completed orders'
    : `Daily tickets sold over the ${periodLabel}`;

  const topEventsDesc = `Top events by revenue during the ${periodLabel}`;
  const categoryDesc = `Revenue distribution by category during the ${periodLabel}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Dashboard Insights</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sales, tickets, and user activity for the {periodLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Refresh data">
            <span>
              <IconButton
                onClick={() => refetch()}
                disabled={isFetching}
                sx={{
                  border: `1px solid ${BORDER}`, borderRadius: '10px',
                  '&:hover': { borderColor: PURPLE, color: PURPLE },
                }}
              >
                {isFetching ? <CircularProgress size={18} sx={{ color: PURPLE }} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <TextField
            select size="small" value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value)}
            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontWeight: 600 } }}
          >
            {RANGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Stack>
      </Box>

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2.5, mb: 4 }}>
        <StatCard
          title={`Sales (${periodLabel})`}
          value={formatCurrency(kpis.totalSales)}
          change={kpis.totalSalesChangePct}
          comparisonLabel={comparisonLabel}
          icon="💰"
        />
        <StatCard
          title={`Tickets Sold (${periodLabel})`}
          value={formatNumber(kpis.ticketsSold)}
          change={kpis.ticketsSoldChangePct}
          comparisonLabel={comparisonLabel}
          icon="🎟"
        />
        <StatCard
          title={`Orders (${periodLabel})`}
          value={formatNumber(kpis.ordersCount)}
          change={kpis.ordersCountChangePct}
          comparisonLabel={comparisonLabel}
          icon="🧾"
        />
        <StatCard
          title={rangeKey === 'all' ? 'Total Users' : `New Users (${periodLabel})`}
          value={formatNumber(kpis.newUsers)}
          change={kpis.newUsersChangePct}
          comparisonLabel={comparisonLabel}
          icon="👥"
        />
      </Box>

      {/* Time series — sales and tickets */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 4 }}>
        <Paper elevation={0} sx={{ p: '24px 28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{salesChartTitle}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{salesChartDesc} ({granularity})</Typography>
          <TimeSeriesBarChart data={range.salesSeries} valueKey="sales" />
        </Paper>

        <Paper elevation={0} sx={{ p: '24px 28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Tickets Sold — {periodLabel}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{ticketsChartDesc} ({granularity})</Typography>
          <TimeSeriesBarChart data={range.salesSeries} valueKey="tickets" />
        </Paper>
      </Box>

      {/* Top events + category breakdown */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 4 }}>
        <Paper elevation={0} sx={{ p: '24px 28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Top Events by Revenue</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{topEventsDesc}</Typography>
          <HorizontalBarChart data={range.topEvents} format={formatCurrency} />
        </Paper>

        <Paper elevation={0} sx={{ p: '24px 28px', borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Revenue by Category</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{categoryDesc}</Typography>
          <HorizontalBarChart data={range.categoryBreakdown} format={formatCurrency} />
        </Paper>
      </Box>

      {/* Recent Orders */}
      <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(26,16,53,0.07)', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 3, pb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Recent Orders</Typography>
            <Typography variant="body2" color="text.secondary">Latest 5 orders across the platform (all time)</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/admin/orders')}
            sx={{
              borderColor: BORDER, color: 'text.primary', fontWeight: 600, borderRadius: '8px',
              textTransform: 'none', px: 2,
              '&:hover': { borderColor: PURPLE, color: PURPLE },
            }}
          >
            View All
          </Button>
        </Box>

        {recentOrders.length === 0 ? (
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography variant="body2" color="text.secondary">No orders yet.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ borderBottom: `2px solid ${BORDER}` }}>
                  {['ORDER ID', 'CUSTOMER', 'EVENT', 'TOTAL', 'STATUS'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.5px', color: 'text.secondary', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} sx={{ borderBottom: `1px solid ${BORDER}`, '&:hover': { bgcolor: '#FAFAFF' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: PURPLE }}>ORD-{order.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {order.userName || order.userEmail || `User #${order.userId}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{order.eventTitle ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(order.totalPrice)}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

export default AdminDashboard;
