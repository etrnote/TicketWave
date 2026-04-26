import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import GlobalNotifications from './components/GlobalNotifications';
import Home from './pages/Home';
import EventsList from './pages/EventsList';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import BookOccurrence from './pages/BookOccurrence';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AdminEvents from './pages/admin/AdminEvents';
import AdminVenues from './pages/admin/AdminVenues';
import AdminOrders from './pages/admin/AdminOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8B2FBE',
      dark: '#7A1FAE',
      light: '#F3E8FF',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4ECDE4',
    },
    background: {
      default: '#F8F6FF',
      paper: '#ffffff',
    },
    text: {
      primary: '#18103A',
      secondary: '#7C7298',
    },
    divider: '#EDE9F8',
    success: { main: '#22C55E' },
    error: { main: '#EF4444' },
    warning: { main: '#F97316' },
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: '#8B2FBE',
          '&:hover': { background: '#7A1FAE' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 20 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#7C7298',
        },
      },
    },
  },
});

function AppContent() {
  return (
    <>
      <Navbar />
      <GlobalNotifications />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/:id/book" element={<BookOccurrence />} />
        <Route path="/occurrences/:id/seats" element={<SeatSelection />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation/:orderId" element={<Confirmation />} />
        <Route path="/create" element={<Navigate to="/admin/events/create" replace />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events/:id/edit" element={<CreateEvent />} />
          <Route path="venues" element={<AdminVenues />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
