package com.ticketwave.exception;

import java.time.Instant;

/** Standard error JSON body for most API failures. */
public record ErrorResponse(String error, Instant timestamp) {
}

