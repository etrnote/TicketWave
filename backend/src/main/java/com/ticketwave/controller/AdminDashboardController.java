package com.ticketwave.controller;

import com.ticketwave.dto.OrderDto;
import com.ticketwave.service.AdminDashboardService;
import com.ticketwave.service.OrderService;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/** Admin: dashboard KPIs, insights, user list, orders, and cancellation. */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;
    private final OrderService orderService;
    private final UserService userService;

    public AdminDashboardController(AdminDashboardService adminDashboardService, OrderService orderService, UserService userService) {
        this.adminDashboardService = adminDashboardService;
        this.orderService = orderService;
        this.userService = userService;
    }

    @GetMapping("/occurrences/stats")
    public ResponseEntity<List<Map<String, Object>>> getOccurrenceStats() {
        return ResponseEntity.ok(adminDashboardService.getOccurrenceStats());
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<OrderDto> cancelOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminDashboardService.getDashboardKpis());
    }

    @GetMapping("/dashboard/insights")
    public ResponseEntity<Map<String, Object>> getDashboardInsights() {
        return ResponseEntity.ok(adminDashboardService.getInsights());
    }
}
