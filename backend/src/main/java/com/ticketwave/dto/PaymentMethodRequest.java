package com.ticketwave.dto;

/** Client token and display fields for a new saved card (demo). */
public class PaymentMethodRequest {
    private String cardType;
    private String lastFour;
    private String token;
    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }
    public String getLastFour() { return lastFour; }
    public void setLastFour(String lastFour) { this.lastFour = lastFour; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
