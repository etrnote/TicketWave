package com.ticketwave.service;

import com.ticketwave.dto.OrderDto;
import com.ticketwave.dto.PurchaseRequest;
import com.ticketwave.dto.SeatLockFreeAsyncMessage;
import com.ticketwave.entity.*;
import com.ticketwave.messaging.MessagingConstants;
import com.ticketwave.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Creates and cancels orders, issues {@link com.ticketwave.entity.Ticket} rows, and coordinates
 * seat-availability updates with JMS and SSE after cancellation.
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final SeatLockRepository seatLockRepository;
    private final SeatRepository seatRepository;
    private final TicketRepository ticketRepository;
    private final EventOccurrenceRepository occurrenceRepository;
    private final UserRepository userRepository;
    private final JmsOperations jmsTemplate;
    private final UserNotificationService userNotificationService;
    private final SeatLockSseService seatLockSseService;

    public OrderService(OrderRepository orderRepository, SeatLockRepository seatLockRepository,
                        SeatRepository seatRepository, TicketRepository ticketRepository,
                        EventOccurrenceRepository occurrenceRepository,
                        UserRepository userRepository, JmsOperations jmsTemplate,
                        UserNotificationService userNotificationService,
                        SeatLockSseService seatLockSseService) {
        this.orderRepository = orderRepository;
        this.seatLockRepository = seatLockRepository;
        this.seatRepository = seatRepository;
        this.ticketRepository = ticketRepository;
        this.occurrenceRepository = occurrenceRepository;
        this.userRepository = userRepository;
        this.jmsTemplate = jmsTemplate;
        this.userNotificationService = userNotificationService;
        this.seatLockSseService = seatLockSseService;
    }

    private OrderDto toDto(Order o) {
        return new OrderDto(o.getId(), o.getUser().getUserId(), o.getEventOccurrence().getId(),
                o.getTotalTickets(), o.getTotalPrice(), o.getStatus().name(), o.getCreatedAt());
    }

    /**
     * Completes a purchase for reserved, bypass (expired lock but seat still free), or general-admission flow.
     */
    @Transactional
    public OrderDto purchaseTickets(PurchaseRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        EventOccurrence occurrence = occurrenceRepository.findById(request.getOccurrenceId())
                .orElseThrow(() -> new NoSuchElementException("Occurrence not found"));

        List<Long> lockIds = request.getLockIds();
        boolean isReservedSeating = lockIds != null && !lockIds.isEmpty();

        List<SeatLock> locks = List.of();
        List<Seat> bypassSeats = List.of(); // populated when locks expired but seats are still free

        if (isReservedSeating) {
            locks = seatLockRepository.findAllById(lockIds);

            if (locks.size() != lockIds.size()) {
                // One or more locks have expired — check whether the seats are still available
                List<Long> seatIds = request.getSeatIds();
                if (seatIds == null || seatIds.isEmpty()) {
                    throw new IllegalStateException(
                            "Your seat reservation has expired. Please go back and select your seats again.");
                }

                OffsetDateTime now = OffsetDateTime.now();
                boolean takenByActiveLock = !seatLockRepository
                        .findActiveLocksForSeats(occurrence.getId(), seatIds, now).isEmpty();
                boolean alreadySold = !ticketRepository
                        .findValidTicketsForSeats(occurrence.getId(), seatIds).isEmpty();

                if (takenByActiveLock || alreadySold) {
                    throw new IllegalStateException(
                            "Looks like someone was a little quicker on the draw — your seats were snagged " +
                            "while you were making up your mind. Head back and pick new ones, we believe in you!");
                }

                // Seats are still free; proceed without the expired locks
                bypassSeats = seatRepository.findAllById(seatIds);
                locks = List.of();
            }
        }

        int totalQuantity;
        BigDecimal totalPrice;

        if (!locks.isEmpty()) {
            totalQuantity = locks.stream().mapToInt(l -> l.getQuantity() != null ? l.getQuantity() : 1).sum();
            totalPrice = occurrence.getPrice().multiply(BigDecimal.valueOf(totalQuantity));
        } else if (!bypassSeats.isEmpty()) {
            totalQuantity = bypassSeats.size();
            totalPrice = occurrence.getPrice().multiply(BigDecimal.valueOf(totalQuantity));
        } else {
            // Open-floor: use requested ticketCount
            totalQuantity = request.getTicketCount() != null && request.getTicketCount() > 0
                    ? request.getTicketCount() : 1;
            totalPrice = occurrence.getPrice().multiply(BigDecimal.valueOf(totalQuantity));
        }

        Order order = new Order();
        order.setUser(user);
        order.setEventOccurrence(occurrence);
        order.setTotalTickets(totalQuantity);
        order.setTotalPrice(totalPrice);
        order.setStatus(OrderStatus.COMPLETED);
        order.setCreatedAt(OffsetDateTime.now());
        Order savedOrder = orderRepository.save(order);
        log.info("Purchase completed: orderId={} userId={} occurrenceId={} tickets={}",
                savedOrder.getId(), userId, occurrence.getId(), totalQuantity);

        if (!locks.isEmpty()) {
            for (SeatLock lock : locks) {
                int qty = lock.getQuantity() != null ? lock.getQuantity() : 1;
                for (int i = 0; i < qty; i++) {
                    Ticket ticket = new Ticket();
                    ticket.setOrder(savedOrder);
                    ticket.setOccurrence(occurrence);
                    if (lock.getSeat() != null) ticket.setSeat(lock.getSeat());
                    ticket.setBarcode(UUID.randomUUID().toString());
                    ticket.setIsValid(true);
                    ticketRepository.save(ticket);
                }
            }
            seatLockRepository.deleteAll(locks);
        } else if (!bypassSeats.isEmpty()) {
            for (Seat seat : bypassSeats) {
                Ticket ticket = new Ticket();
                ticket.setOrder(savedOrder);
                ticket.setOccurrence(occurrence);
                ticket.setSeat(seat);
                ticket.setBarcode(UUID.randomUUID().toString());
                ticket.setIsValid(true);
                ticketRepository.save(ticket);
            }
        } else {
            for (int i = 0; i < totalQuantity; i++) {
                Ticket ticket = new Ticket();
                ticket.setOrder(savedOrder);
                ticket.setOccurrence(occurrence);
                ticket.setBarcode(UUID.randomUUID().toString());
                ticket.setIsValid(true);
                ticketRepository.save(ticket);
            }
        }

        return toDto(savedOrder);
    }

    /** Admin list of all orders, newest first. */
    public List<OrderDto> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto).collect(java.util.stream.Collectors.toList());
    }

    /** Voids tickets, optionally notifies the user, and requeues a free-lock message for the occurrence. */
    @Transactional
    public OrderDto cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found"));
        log.info("Cancelling order: orderId={}", orderId);
        order.setStatus(OrderStatus.CANCELLED);
        List<Ticket> tickets = ticketRepository.findByOrderId(orderId);
        for (Ticket t : tickets) { t.setIsValid(false); ticketRepository.save(t); }
        Order saved = orderRepository.save(order);
        if (saved.getUser() != null && saved.getUser().getUserId() != null) {
            userNotificationService.publishOrderCancelled(saved.getUser().getUserId(), saved.getId());
            jmsTemplate.convertAndSend(MessagingConstants.SEAT_LOCK_FREE_REQUESTS,
                    new SeatLockFreeAsyncMessage(
                            saved.getEventOccurrence().getId(),
                            saved.getUser().getUserId(),
                            null,
                            MessagingConstants.FREE_REASON_CANCELLED));
        }
        // Tickets are voided (isValid=false) so seats show available again; notify live UIs
        // (locks were already removed at purchase time, so the JMS free handler often deletes 0 rows).
        seatLockSseService.publishSeatLockUpdate(
                saved.getEventOccurrence().getId(),
                "order-" + saved.getId(),
                MessagingConstants.SSE_STATUS_FREED,
                MessagingConstants.FREE_REASON_CANCELLED);
        return toDto(saved);
    }
}
