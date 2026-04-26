package com.ticketwave.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Order summary returned from API (no JPA graph). */
public record OrderDto(
        Long id,
        Long userId,
        Long occurrenceId,
        Integer totalTickets,
        BigDecimal totalPrice,
        String status,
        OffsetDateTime createdAt
) {}
