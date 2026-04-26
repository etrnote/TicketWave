package com.ticketwave.exception;

import java.util.List;

/**
 * Thrown when an admin deactivates a seat that still has blocking tickets; {@link #getTicketIds()}
 * lists the affected ticket ids.
 */
public class SeatDeactivationBlockedException extends RuntimeException {
    private final List<Long> ticketIds;

    public SeatDeactivationBlockedException(List<Long> ticketIds) {
        super("Seat has active tickets for upcoming occurrences");
        this.ticketIds = ticketIds;
    }

    public List<Long> getTicketIds() {
        return ticketIds;
    }
}
