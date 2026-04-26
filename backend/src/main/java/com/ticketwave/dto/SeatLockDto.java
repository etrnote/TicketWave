package com.ticketwave.dto;

import java.time.OffsetDateTime;

/** Client-facing seat-hold (if exposed directly). */
public record SeatLockDto(
        Long id,
        Long occurrenceId,
        Long seatId,
        Integer quantity,
        Long userId,
        OffsetDateTime expiresAt
) {}
