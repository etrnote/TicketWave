package com.ticketwave.dto;

/** A ticket the user can open (barcode, seat label, validity). */
public record TicketDto(
        Long id,
        Long orderId,
        Long occurrenceId,
        Long seatId,
        String seatLabel,
        String barcode,
        Boolean isValid
) {}
