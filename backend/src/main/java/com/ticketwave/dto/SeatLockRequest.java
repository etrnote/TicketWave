package com.ticketwave.dto;

import java.util.List;

/** Request to lock specific seats and/or a GA quantity. */
public class SeatLockRequest {
    private List<Long> seatIds;
    private Integer quantity;
    public List<Long> getSeatIds() { return seatIds; }
    public void setSeatIds(List<Long> seatIds) { this.seatIds = seatIds; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
