package com.ticketwave.service;

import com.ticketwave.dto.OrderDto;
import com.ticketwave.dto.PurchaseRequest;
import com.ticketwave.entity.*;
import com.ticketwave.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jms.core.JmsOperations;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private SeatLockRepository seatLockRepository;
    @Mock private SeatRepository seatRepository;
    @Mock private TicketRepository ticketRepository;
    @Mock private EventOccurrenceRepository occurrenceRepository;
    @Mock private UserRepository userRepository;
    @Mock private SeatLockSseService seatLockSseService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private JmsOperations jmsTemplate;

    @InjectMocks
    private OrderService orderService;

    // ── helpers ──────────────────────────────────────────────────────────────

    private User makeUser(long id, String email) {
        User u = new User();
        u.setUserId(id);
        u.setEmail(email);
        return u;
    }

    private EventOccurrence makeOccurrence(long id, double price) {
        EventOccurrence o = new EventOccurrence();
        o.setId(id);
        o.setPrice(BigDecimal.valueOf(price));
        return o;
    }

    private Seat makeSeat(long id) {
        Seat s = new Seat();
        s.setId(id);
        return s;
    }

    private SeatLock makeLock(long id, Seat seat, int quantity, User user) {
        SeatLock l = new SeatLock();
        l.setId(id);
        l.setSeat(seat);
        l.setQuantity(quantity);
        l.setUser(user);
        l.setExpiresAt(OffsetDateTime.now().plusMinutes(10));
        return l;
    }

    /** Stubs orderRepository. save to assign a given id and return the order. */
    private void stubOrderSave(long orderId) {
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(orderId);
            return o;
        });
    }

    // ── normal reserved-seating path ─────────────────────────────────────────

    @Test
    void purchaseTickets_validLocks_createsOrderAndTickets() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 50);
        Seat seat = makeSeat(501L);

        SeatLock lockA = makeLock(100L, seat, 2, user);   // contributes 2 tickets
        SeatLock lockB = makeLock(101L, null, 1, user);   // contributes 1 ticket (no specific seat)

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(100L, 101L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        when(seatLockRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(lockA, lockB));
        stubOrderSave(77L);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.purchaseTickets(req, 1L);

        assertThat(result.id()).isEqualTo(77L);
        assertThat(result.totalTickets()).isEqualTo(3);
        assertThat(result.totalPrice()).isEqualByComparingTo("150");
        assertThat(result.status()).isEqualTo(OrderStatus.COMPLETED.name());

        verify(ticketRepository, times(3)).save(any(Ticket.class));
        verify(seatLockRepository).deleteAll(List.of(lockA, lockB));
    }

    // ── expired-lock, seats still available (bypass path) ────────────────────

    @Test
    void purchaseTickets_expiredLocks_seatsStillFree_completesWithoutLocks() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 40);
        Seat seat = makeSeat(501L);

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(200L));
        req.setSeatIds(List.of(501L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        // Lock record is gone (expired)
        when(seatLockRepository.findAllById(List.of(200L))).thenReturn(List.of());
        // Nobody else holds an active lock on this seat
        when(seatLockRepository.findActiveLocksForSeats(eq(9L), eq(List.of(501L)), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        // Seat not yet sold
        when(ticketRepository.findValidTicketsForSeats(9L, List.of(501L))).thenReturn(List.of());
        when(seatRepository.findAllById(List.of(501L))).thenReturn(List.of(seat));
        stubOrderSave(88L);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.purchaseTickets(req, 1L);

        assertThat(result.id()).isEqualTo(88L);
        assertThat(result.totalTickets()).isEqualTo(1);
        assertThat(result.totalPrice()).isEqualByComparingTo("40");

        // One ticket created and linked to the seat
        verify(ticketRepository, times(1)).save(any(Ticket.class));
        // No locks to delete — they were already gone
        verify(seatLockRepository, never()).deleteAll(any());
    }

    @Test
    void purchaseTickets_expiredLocks_multipleSeatsStillFree_createsTicketPerSeat() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 30);
        Seat seatA = makeSeat(601L);
        Seat seatB = makeSeat(602L);

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(300L, 301L));
        req.setSeatIds(List.of(601L, 602L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        when(seatLockRepository.findAllById(List.of(300L, 301L))).thenReturn(List.of()); // both expired
        when(seatLockRepository.findActiveLocksForSeats(eq(9L), eq(List.of(601L, 602L)), any()))
                .thenReturn(List.of());
        when(ticketRepository.findValidTicketsForSeats(9L, List.of(601L, 602L))).thenReturn(List.of());
        when(seatRepository.findAllById(List.of(601L, 602L))).thenReturn(List.of(seatA, seatB));
        stubOrderSave(89L);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.purchaseTickets(req, 1L);

        assertThat(result.totalTickets()).isEqualTo(2);
        assertThat(result.totalPrice()).isEqualByComparingTo("60");
        verify(ticketRepository, times(2)).save(any(Ticket.class));
    }

    // ── expired-lock, seats taken ─────────────────────────────────────────────

    @Test
    void purchaseTickets_expiredLocks_seatsLockedByOther_throwsWithHumorousMessage() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 50);
        SeatLock competingLock = makeLock(999L, makeSeat(501L), 1, makeUser(2L, "faster@example.com"));

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(200L));
        req.setSeatIds(List.of(501L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        when(seatLockRepository.findAllById(List.of(200L))).thenReturn(List.of());
        when(seatLockRepository.findActiveLocksForSeats(eq(9L), eq(List.of(501L)), any()))
                .thenReturn(List.of(competingLock)); // someone else grabbed it

        assertThatThrownBy(() -> orderService.purchaseTickets(req, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("quicker on the draw");

        verify(orderRepository, never()).save(any());
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void purchaseTickets_expiredLocks_seatsAlreadySold_throwsWithHumorousMessage() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 50);
        Ticket existingTicket = new Ticket();

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(200L));
        req.setSeatIds(List.of(501L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        when(seatLockRepository.findAllById(List.of(200L))).thenReturn(List.of());
        when(seatLockRepository.findActiveLocksForSeats(eq(9L), eq(List.of(501L)), any()))
                .thenReturn(List.of()); // no active lock ...
        when(ticketRepository.findValidTicketsForSeats(9L, List.of(501L)))
                .thenReturn(List.of(existingTicket)); // ... but already sold

        assertThatThrownBy(() -> orderService.purchaseTickets(req, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("quicker on the draw");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void purchaseTickets_expiredLocks_noSeatIdsFallback_throwsExpiredMessage() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 50);

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of(200L));
        // seatIds intentionally omitted — legacy client or corrupted state

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        when(seatLockRepository.findAllById(List.of(200L))).thenReturn(List.of());

        assertThatThrownBy(() -> orderService.purchaseTickets(req, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("expired");
    }

    // ── open-floor path (no seat locks) ──────────────────────────────────────

    @Test
    void purchaseTickets_openFloor_createsUnseatedTickets() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 25);

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(List.of()); // open floor
        req.setTicketCount(3);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        stubOrderSave(55L);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.purchaseTickets(req, 1L);

        assertThat(result.totalTickets()).isEqualTo(3);
        assertThat(result.totalPrice()).isEqualByComparingTo("75");

        verify(ticketRepository, times(3)).save(any(Ticket.class));
        verify(seatLockRepository, never()).deleteAll(any());
    }

    @Test
    void purchaseTickets_openFloor_nullTicketCount_defaultsToOne() {
        User user = makeUser(1L, "buyer@example.com");
        EventOccurrence occurrence = makeOccurrence(9L, 20);

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(9L);
        req.setLockIds(null);
        req.setTicketCount(null); // not provided

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(occurrenceRepository.findById(9L)).thenReturn(Optional.of(occurrence));
        stubOrderSave(56L);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.purchaseTickets(req, 1L);

        assertThat(result.totalTickets()).isEqualTo(1);
        assertThat(result.totalPrice()).isEqualByComparingTo("20");
        verify(ticketRepository, times(1)).save(any(Ticket.class));
    }

    // ── entity-not-found guards ───────────────────────────────────────────────

    @Test
    void purchaseTickets_unknownUser_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(1L);

        assertThatThrownBy(() -> orderService.purchaseTickets(req, 99L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("User not found");
    }

    @Test
    void purchaseTickets_unknownOccurrence_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, "buyer@example.com")));
        when(occurrenceRepository.findById(999L)).thenReturn(Optional.empty());

        PurchaseRequest req = new PurchaseRequest();
        req.setOccurrenceId(999L);

        assertThatThrownBy(() -> orderService.purchaseTickets(req, 1L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Occurrence not found");
    }

    // ── cancel order ──────────────────────────────────────────────────────────

    @Test
    void cancelOrder_invalidatesTicketsAndSetsStatusCancelled() {
        User user = makeUser(7L, "u@u.com");
        EventOccurrence occurrence = makeOccurrence(8L, 50);

        Order order = new Order();
        order.setId(50L);
        order.setStatus(OrderStatus.COMPLETED);
        order.setCreatedAt(OffsetDateTime.now());
        order.setUser(user);
        order.setEventOccurrence(occurrence);

        Ticket t1 = new Ticket(); t1.setIsValid(true);
        Ticket t2 = new Ticket(); t2.setIsValid(true);

        when(orderRepository.findById(50L)).thenReturn(Optional.of(order));
        when(ticketRepository.findByOrderId(50L)).thenReturn(List.of(t1, t2));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto result = orderService.cancelOrder(50L);

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED.name());
        assertThat(t1.getIsValid()).isFalse();
        assertThat(t2.getIsValid()).isFalse();
        verify(ticketRepository, times(2)).save(any(Ticket.class));
        verify(seatLockSseService).publishSeatLockUpdate(eq(8L), eq("order-50"), eq("FREED"), eq("CANCELLED"));
    }

    @Test
    void cancelOrder_unknownOrder_throws() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.cancelOrder(999L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Order not found");
    }
}
