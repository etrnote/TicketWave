package com.ticketwave.entity;

/** Purchase outcome; voided tickets on {@link #CANCELLED} still exist but are invalid. */
public enum OrderStatus {
    COMPLETED,
    CANCELLED
}

