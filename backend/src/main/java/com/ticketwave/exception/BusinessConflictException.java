package com.ticketwave.exception;

import java.util.Map;

/** Conflict with machine-readable code and counts for admin UX decisions. */
public class BusinessConflictException extends RuntimeException {
    private final String code;
    private final Map<String, Long> blockingCounts;

    public BusinessConflictException(String code, String message, Map<String, Long> blockingCounts) {
        super(message);
        this.code = code;
        this.blockingCounts = blockingCounts;
    }

    public String getCode() {
        return code;
    }

    public Map<String, Long> getBlockingCounts() {
        return blockingCounts;
    }
}
