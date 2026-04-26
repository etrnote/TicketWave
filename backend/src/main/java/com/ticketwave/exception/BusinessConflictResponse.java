package com.ticketwave.exception;

import java.time.Instant;
import java.util.Map;

/** Extended 409 payload with code + blocking counters. */
public record BusinessConflictResponse(
        String error,
        String code,
        Map<String, Long> blockingCounts,
        Instant timestamp
) {
}
