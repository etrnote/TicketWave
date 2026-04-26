import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
};

export const eventService = {
  getAllEvents: () => api.get('/events'),
  getEventById: (id) => api.get(`/events/${id}`),
  getFilteredEvents: (params) => api.get('/events', { params }),
  getCategories: () => api.get('/events/categories'),
  getReviews: (eventId) => api.get(`/events/${eventId}/reviews`),
  addReview: (eventId, data) => api.post(`/events/${eventId}/reviews`, data),
  getOccurrences: (eventId) => api.get(`/events/${eventId}/occurrences`),
  getSeats: (occurrenceId) => api.get(`/occurrences/${occurrenceId}/seats`),
  lockSeats: (occurrenceId, data) => api.post(`/occurrences/${occurrenceId}/lock`, data),
  freeLocks: (occurrenceId, data) => api.post(`/occurrences/${occurrenceId}/unlock`, data),
  getSeatUpdatesStreamUrl: (occurrenceId) =>
    `${API_BASE_URL}/occurrences/${occurrenceId}/seats/stream`,
  purchaseTickets: (data) => api.post('/orders', data),
};

export const userService = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  getPaymentMethods: () => api.get('/users/me/payment-methods'),
  addPaymentMethod: (data) => api.post('/users/me/payment-methods', data),
  deletePaymentMethod: (id) => api.delete(`/users/me/payment-methods/${id}`),
};

export const ordersService = {
  getUserOrders: () => api.get('/users/me/orders'),
  getOrderTickets: (orderId) => api.get(`/users/me/orders/${orderId}/tickets`),
  getTicket: (id) => api.get(`/users/me/tickets/${id}`),
};

export const adminService = {
  getAdminEvents: () => api.get('/admin/events'),
  createEvent: (event) => api.post('/admin/events', event),
  deleteEvent: (eventId) => api.delete(`/admin/events/${eventId}`),
  getDashboard: () => api.get('/admin/dashboard'),
  getDashboardInsights: () => api.get('/admin/dashboard/insights'),
  getOccurrenceStats: () => api.get('/admin/occurrences/stats'),
  createOccurrence: (eventId, data) => api.post(`/admin/events/${eventId}/occurrences`, data),
  getEventOccurrencesForAdmin: (eventId) => api.get(`/admin/events/${eventId}/occurrences`),
  updateOccurrence: (occurrenceId, data) => api.put(`/admin/occurrences/${occurrenceId}`, data),
  cancelOccurrence: (occurrenceId) => api.delete(`/admin/occurrences/${occurrenceId}`),
  getOccurrenceCancellationEligibility: (occurrenceId) =>
    api.get(`/admin/occurrences/${occurrenceId}/cancellation-eligibility`),
  updateEvent: (eventId, data) => api.put(`/admin/events/${eventId}`, data),
  getVenues: () => api.get('/admin/venues'),
  createVenue: (data) => api.post('/admin/venues', data),
  updateVenue: (id, data) => api.put(`/admin/venues/${id}`, data),
  deleteVenue: (id) => api.delete(`/admin/venues/${id}`),
  getVenueSeats: (id) => api.get(`/admin/venues/${id}/seats`),
  toggleVenueSeat: (venueId, seatId, isActive) => api.patch(`/admin/venues/${venueId}/seats/${seatId}`, { isActive }),
  getOrders: () => api.get('/admin/orders'),
  cancelOrder: (id) => api.post(`/admin/orders/${id}/cancel`),
  getUsers: () => api.get('/admin/users'),
};

export const venueService = {
  getAllVenues: () => api.get('/venues'),
};

export default api;
