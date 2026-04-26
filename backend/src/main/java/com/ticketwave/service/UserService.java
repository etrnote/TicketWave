package com.ticketwave.service;

import com.ticketwave.dto.OrderDto;
import com.ticketwave.dto.PaymentMethodDto;
import com.ticketwave.dto.PaymentMethodRequest;
import com.ticketwave.dto.TicketDto;
import com.ticketwave.dto.UpdateProfileRequest;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.entity.*;
import com.ticketwave.repository.*;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * User profile, orders, tickets, and saved payment methods.
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final PaymentMethodRepository paymentMethodRepository;

    public UserService(UserRepository userRepository, OrderRepository orderRepository,
                       TicketRepository ticketRepository, PaymentMethodRepository paymentMethodRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.ticketRepository = ticketRepository;
        this.paymentMethodRepository = paymentMethodRepository;
    }

    public UserResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return new UserResponse(user.getUserId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserResponse(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole().name()))
                .sorted(Comparator.comparingLong(UserResponse::getUserId))
                .toList();
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        User saved = userRepository.save(user);
        return new UserResponse(saved.getUserId(), saved.getName(), saved.getEmail(), saved.getRole().name());
    }

    public List<OrderDto> getUserOrders(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return orderRepository.findByUserUserIdOrderByCreatedAtDesc(userId).stream()
                .map(o -> new OrderDto(o.getId(), o.getUser().getUserId(), o.getEventOccurrence().getId(),
                        o.getTotalTickets(), o.getTotalPrice(), o.getStatus().name(), o.getCreatedAt()))
                .collect(Collectors.toList());
    }

    public TicketDto getTicket(Long userId, Long ticketId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        Ticket ticket = ticketRepository.findByIdAndOrderUserUserId(ticketId, userId)
                .orElseThrow(() -> new NoSuchElementException("Ticket not found"));
        return toTicketDto(ticket);
    }

    public List<TicketDto> getOrderTickets(Long userId, Long orderId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ticketRepository.findByOrderIdAndOrderUserUserId(orderId, userId).stream()
                .map(this::toTicketDto)
                .collect(Collectors.toList());
    }

    private TicketDto toTicketDto(Ticket ticket) {
        Seat seat = ticket.getSeat();
        String seatLabel = seat != null
                ? "Row " + seat.getRowNumber() + ", Seat " + seat.getSeatNumber()
                : null;
        return new TicketDto(
                ticket.getId(),
                ticket.getOrder().getId(),
                ticket.getOccurrence().getId(),
                seat != null ? seat.getId() : null,
                seatLabel,
                ticket.getBarcode(),
                ticket.getIsValid());
    }

    private PaymentMethodDto toPaymentMethodDto(PaymentMethod pm) {
        return new PaymentMethodDto(pm.getId(), pm.getCardType(), pm.getLastFour(), pm.getCreatedAt());
    }

    public List<PaymentMethodDto> getPaymentMethods(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return paymentMethodRepository.findByUserUserId(userId).stream()
                .map(this::toPaymentMethodDto).collect(Collectors.toList());
    }

    @Transactional
    public PaymentMethodDto addPaymentMethod(Long userId, PaymentMethodRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        PaymentMethod pm = new PaymentMethod();
        pm.setUser(user);
        pm.setCardType(request.getCardType());
        pm.setLastFour(request.getLastFour());
        pm.setToken(request.getToken());
        pm.setCreatedAt(OffsetDateTime.now());
        return toPaymentMethodDto(paymentMethodRepository.save(pm));
    }

    @Transactional
    public void deletePaymentMethod(Long userId, Long methodId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        PaymentMethod pm = paymentMethodRepository.findById(methodId)
                .orElseThrow(() -> new NoSuchElementException("Payment method not found"));
        if (!pm.getUser().getUserId().equals(userId)) {
            throw new SecurityException("Not authorized");
        }
        paymentMethodRepository.delete(pm);
        log.info("Payment method removed: userId={} methodId={}", userId, methodId);
    }
}
