package com.ticketwave.dto;

import java.io.Serializable;
import java.util.List;

/** JMS payload to remove holds: expiry, cancel, or user unselect (see free-lock queue). */
public class SeatLockFreeAsyncMessage implements Serializable {

    private Long occurrenceId;
    private Long userId;
    private List<Long> seatIds;
    private String reason;

    public SeatLockFreeAsyncMessage() {
    }

    public SeatLockFreeAsyncMessage(Long occurrenceId, Long userId, List<Long> seatIds, String reason) {
        this.occurrenceId = occurrenceId;
        this.userId = userId;
        this.seatIds = seatIds;
        this.reason = reason;
    }

    public Long getOccurrenceId() {
        return occurrenceId;
    }

    public void setOccurrenceId(Long occurrenceId) {
        this.occurrenceId = occurrenceId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<Long> getSeatIds() {
        return seatIds;
    }

    public void setSeatIds(List<Long> seatIds) {
        this.seatIds = seatIds;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
