import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQueries, useQuery } from '@tanstack/react-query';
import { eventService, ordersService } from '../services/api';

function formatPrice(value) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numericValue);
}

function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable';
  }

  return parsedDate.toLocaleString();
}

function getStatusColor(status) {
  if (status === 'COMPLETED') {
    return 'success';
  }
  if (status === 'CANCELLED') {
    return 'error';
  }
  return 'default';
}

function OrderTickets({ order }) {
  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: ['orderTickets', order.id],
    queryFn: async () => {
      const response = await ordersService.getOrderTickets(order.id);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        Failed to load tickets for this order.
      </Alert>
    );
  }

  if (tickets.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tickets found for this order.
      </Typography>
    );
  }

  const isSeated = tickets[0].seatLabel != null;

  if (!isSeated) {
    return (
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {tickets.length} general admission {tickets.length === 1 ? 'ticket' : 'tickets'}
        </Typography>
        {tickets.map((ticket) => (
          <Card key={ticket.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="subtitle2">Ticket #{ticket.id}</Typography>
              <Typography variant="body2" color="text.secondary">
                Barcode: {ticket.barcode}
              </Typography>
              <Typography variant="body2" color={ticket.isValid ? 'success.main' : 'error.main'}>
                {ticket.isValid ? 'Valid' : 'Invalid'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {tickets.map((ticket) => (
        <Card key={ticket.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: '12px !important' }}>
            <Typography variant="subtitle2">{ticket.seatLabel}</Typography>
            <Typography variant="body2" color="text.secondary">
              Barcode: {ticket.barcode}
            </Typography>
            <Typography variant="body2" color={ticket.isValid ? 'success.main' : 'error.main'}>
              {ticket.isValid ? 'Valid' : 'Invalid'}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function MyOrders() {
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    isError: isOrdersError,
  } = useQuery({
    queryKey: ['userOrders'],
    queryFn: async () => {
      const response = await ordersService.getUserOrders();
      return response.data;
    },
  });

  const {
    data: events = [],
    isLoading: isEventsLoading,
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventService.getAllEvents();
      return response.data;
    },
    enabled: orders.length > 0,
  });

  const occurrenceQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ['eventOccurrences', event.id],
      queryFn: async () => {
        const response = await eventService.getOccurrences(event.id);
        return response.data;
      },
      enabled: events.length > 0,
    })),
  });

  const isOccurrencesLoading = occurrenceQueries.some((query) => query.isLoading);
  const occurrenceLookup = new Map();
  events.forEach((event, index) => {
    const occurrences = occurrenceQueries[index]?.data ?? [];
    occurrences.forEach((occurrence) => {
      occurrenceLookup.set(occurrence.id, {
        eventName: event.title,
        startTime: occurrence.startTime,
      });
    });
  });

  const isLoading = isOrdersLoading || isEventsLoading || isOccurrencesLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isOrdersError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load your orders. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          My Orders
        </Typography>

        {orders.length === 0 ? (
          <Alert severity="info">You have no orders yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {orders.map((order) => {
              const occurrence = occurrenceLookup.get(order.occurrenceId);
              const eventName = occurrence?.eventName ?? 'Event details unavailable';
              const occurrenceDate = occurrence?.startTime;

              return (
                <Accordion key={order.id} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Order ID
                        </Typography>
                        <Typography variant="body1">#{order.id}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Event
                        </Typography>
                        <Typography variant="body1">{eventName}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Date
                        </Typography>
                        <Typography variant="body1">{formatDate(occurrenceDate)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {formatPrice(order.totalPrice)}
                          </Typography>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                      Tickets
                    </Typography>
                    <OrderTickets order={order} />
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default MyOrders;
