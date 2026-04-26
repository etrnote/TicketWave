package com.ticketwave.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Admin schedules or updates a single occurrence. */
public class OccurrenceRequest {
    private Long venueId;
    private OffsetDateTime startTime;
    private BigDecimal price;
    public Long getVenueId() { return venueId; }
    public void setVenueId(Long venueId) { this.venueId = venueId; }
    public OffsetDateTime getStartTime() { return startTime; }
    public void setStartTime(OffsetDateTime startTime) { this.startTime = startTime; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
