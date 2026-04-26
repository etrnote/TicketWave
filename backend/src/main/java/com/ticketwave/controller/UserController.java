package com.ticketwave.controller;

import com.ticketwave.dto.OrderDto;
import com.ticketwave.dto.PaymentMethodDto;
import com.ticketwave.dto.PaymentMethodRequest;
import com.ticketwave.dto.TicketDto;
import com.ticketwave.dto.UpdateProfileRequest;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
import java.util.Map;

import com.ticketwave.service.UserNotificationService;

/** Current user profile, orders, tickets, payment methods, and notification SSE. */
@RestController
@RequestMapping("/api/users/me")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final UserNotificationService userNotificationService;

    public UserController(UserService userService, UserNotificationService userNotificationService) {
        this.userService = userService;
        this.userNotificationService = userNotificationService;
    }

    private Long currentUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<UserResponse> getProfile() {
        return ResponseEntity.ok(userService.getProfile(currentUserId()));
    }

    @PutMapping
    public ResponseEntity<UserResponse> updateProfile(@RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(currentUserId(), request));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getOrders() {
        return ResponseEntity.ok(userService.getUserOrders(currentUserId()));
    }

    @GetMapping("/orders/{orderId}/tickets")
    public ResponseEntity<List<TicketDto>> getOrderTickets(@PathVariable Long orderId) {
        return ResponseEntity.ok(userService.getOrderTickets(currentUserId(), orderId));
    }

    @GetMapping("/tickets/{ticketId}")
    public ResponseEntity<TicketDto> getTicket(@PathVariable Long ticketId) {
        return ResponseEntity.ok(userService.getTicket(currentUserId(), ticketId));
    }

    @GetMapping("/payment-methods")
    public ResponseEntity<List<PaymentMethodDto>> getPaymentMethods() {
        return ResponseEntity.ok(userService.getPaymentMethods(currentUserId()));
    }

    @PostMapping("/payment-methods")
    public ResponseEntity<PaymentMethodDto> addPaymentMethod(@RequestBody PaymentMethodRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.addPaymentMethod(currentUserId(), request));
    }

    @DeleteMapping("/payment-methods/{methodId}")
    public ResponseEntity<Void> deletePaymentMethod(@PathVariable Long methodId) {
        userService.deletePaymentMethod(currentUserId(), methodId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications/stream")
    public ResponseEntity<SseEmitter> streamNotifications() {
        Long userId = currentUserId();
        SseEmitter emitter = userNotificationService.subscribe(userId);
        try {
            emitter.send(SseEmitter.event().name("connected").data(Map.of("userId", userId)));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return ResponseEntity.ok(emitter);
    }
}
