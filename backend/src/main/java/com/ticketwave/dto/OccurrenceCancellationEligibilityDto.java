package com.ticketwave.dto;

/** Admin cancellation eligibility state with machine-readable reason codes. */
public record OccurrenceCancellationEligibilityDto(
        boolean cancellable,
        String code,
        String message,
        long blockingCompletedOrders,
        long blockingValidTickets
) {
}
