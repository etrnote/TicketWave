import { AppBar, Toolbar, Button, Box, Avatar, IconButton, Divider } from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PURPLE = '#8B2FBE';
const GRAD = 'linear-gradient(135deg, #4ECDE4 0%, #8B2FBE 55%, #E040A8 100%)';

function TicketWaveLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <svg width={28} height={28} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="twLogo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ECDE4" />
            <stop offset="55%" stopColor="#8B2FBE" />
            <stop offset="100%" stopColor="#E040A8" />
          </linearGradient>
        </defs>
        <path d="M6 20 C6 14 10 8 16 8 C22 8 26 13 26 18 C26 22 23 25 20 24 C17 23 18 19 15 18 C12 17 10 20 8 22 Z" fill="url(#twLogo)" opacity="0.9" />
        <path d="M10 24 C12 20 15 17 19 18 C22 19 22 23 25 22" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <Box
        component="span"
        sx={{
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '-0.5px',
          background: GRAD,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        TicketWave
      </Box>
    </Box>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      sx={{
        color: active ? PURPLE : 'text.secondary',
        fontWeight: active ? 600 : 400,
        fontSize: '0.875rem',
        px: 1.75,
        py: 0.75,
        borderRadius: 2,
        bgcolor: active ? 'primary.light' : 'transparent',
        '&:hover': { bgcolor: active ? 'primary.light' : '#F8F6FF', color: 'text.primary' },
      }}
    >
      {label}
    </Button>
  );
}

function Navbar() {
  const { isAuthenticated, isAdmin, name, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 12px rgba(139,47,190,0.07)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: '60px !important', gap: 0 }}>
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', mr: 4 }}>
          <TicketWaveLogo />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
          <NavLink to="/" label="Home" active={location.pathname === '/'} />
          {isAuthenticated && (
            <NavLink to="/my-orders" label="My Orders" active={location.pathname === '/my-orders'} />
          )}
          {isAuthenticated && (
            <NavLink to="/profile" label="Profile" active={location.pathname === '/profile'} />
          )}
          {isAuthenticated && isAdmin && (
            <NavLink to="/admin/events" label="Admin" active={isAdminPath} />
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 2, my: 1.5 }} />

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton component={RouterLink} to="/profile" sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 36, height: 36, background: GRAD, fontSize: '0.85rem', fontWeight: 700 }}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </Avatar>
            </IconButton>
            <Button
              onClick={handleLogout}
              variant="outlined"
              size="small"
              sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: PURPLE, color: PURPLE } }}
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="small"
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#7A1FAE' } }}
          >
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
