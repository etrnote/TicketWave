import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 200;
const ADMIN_BG = '#0E0A20';
const ADMIN_SURFACE = '#1A1438';
const ADMIN_BORDER = '#2A2050';
const ADMIN_MUTED = '#9B96C0';
const PURPLE = '#8B2FBE';

const NAV_ITEMS = [
  { label: 'Events', icon: <EventIcon fontSize="small" />, path: '/admin/events' },
  { label: 'Venues', icon: <PlaceIcon fontSize="small" />, path: '/admin/venues' },
  { label: 'Orders', icon: <ReceiptLongIcon fontSize="small" />, path: '/admin/orders' },
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/admin/dashboard' },
  { label: 'Users', icon: <PeopleIcon fontSize="small" />, path: '/admin/users' },
];

function AdminLayout() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: ADMIN_BG,
            borderRight: `1px solid ${ADMIN_BORDER}`,
            top: 60,
            height: 'calc(100% - 60px)',
          },
        }}
      >
        <List sx={{ pt: 3, px: 0 }}>
          {NAV_ITEMS.map(({ label, icon, path }) => {
            const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
            return (
              <ListItem key={label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(path)}
                  sx={{
                    py: 1.625,
                    px: 3,
                    gap: 1.5,
                    borderRight: `3px solid ${active ? PURPLE : 'transparent'}`,
                    bgcolor: active ? 'rgba(139,47,190,0.15)' : 'transparent',
                    '&:hover': { bgcolor: active ? 'rgba(139,47,190,0.2)' : 'rgba(255,255,255,0.05)' },
                    transition: 'all 0.15s',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: active ? 'white' : ADMIN_MUTED }}>
                    {icon}
                  </ListItemIcon>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: active ? 600 : 400,
                      color: active ? 'white' : ADMIN_MUTED,
                      fontSize: '0.875rem',
                    }}
                  >
                    {label}
                  </Typography>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 3, md: 6 },
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 60px)',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default AdminLayout;
