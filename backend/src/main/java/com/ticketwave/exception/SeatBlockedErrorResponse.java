package com.ticketwave.exception;

import java.time.Instant;
import java.util.List;

/** Returned when a seat cannot be disabled because it still has valid tickets. */
public record SeatBlockedErrorResponse(String error, List<Long> ticketIds, Instant timestamp) {
}
