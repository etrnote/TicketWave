package com.ticketwave.dto;

import java.util.List;
import java.util.Map;

/** Checkout: occurrence, optional active lock ids, seat ids for recovery, or GA ticket count. */
public class PurchaseRequest {
    private Long occurrenceId;
    private List<Long> lockIds;
    private List<Long> seatIds;
    private Integer ticketCount;
    private Map<String, Object> paymentDetails;
    public Long getOccurrenceId() { return occurrenceId; }
    public void setOccurrenceId(Long occurrenceId) { this.occurrenceId = occurrenceId; }
    public List<Long> getLockIds() { return lockIds; }
    public void setLockIds(List<Long> lockIds) { this.lockIds = lockIds; }
    public List<Long> getSeatIds() { return seatIds; }
    public void setSeatIds(List<Long> seatIds) { this.seatIds = seatIds; }
    public Integer getTicketCount() { return ticketCount; }
    public void setTicketCount(Integer ticketCount) { this.ticketCount = ticketCount; }
    public Map<String, Object> getPaymentDetails() { return paymentDetails; }
    public void setPaymentDetails(Map<String, Object> paymentDetails) { this.paymentDetails = paymentDetails; }
}
