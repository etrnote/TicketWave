package com.ticketwave.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Occurrence for API responses; may include live availability counts for the public list.
 */
public record EventOccurrenceDto(
        Long id,
        Long eventId,
        Long venueId,
        String venueName,
        String venueCity,
        String venueAddress,
        String seatingType,
        Integer venueCapacity,
        OffsetDateTime startTime,
        BigDecimal price,
        String status,
        Integer totalCount,
        Integer availableCount
) {
    public EventOccurrenceDto(
            Long id,
            Long eventId,
            Long venueId,
            String venueName,
            String venueCity,
            String venueAddress,
            String seatingType,
            Integer venueCapacity,
            OffsetDateTime startTime,
            BigDecimal price,
            String status
    ) {
        this(id, eventId, venueId, venueName, venueCity, venueAddress, seatingType, venueCapacity, startTime, price, status, null, null);
    }
}
