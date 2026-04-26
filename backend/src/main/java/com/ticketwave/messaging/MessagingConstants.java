package com.ticketwave.messaging;

/**
 * Shared JMS destination names, seat-hold duration, and reasons carried on
 * free-lock messages so producers and consumers stay aligned.
 */
public final class MessagingConstants {

    private MessagingConstants() {
    }

    public static final String SEAT_LOCK_FREE_REQUESTS = "seat.lock.free.requests";

    /** Duration applied when creating or refreshing a {@link com.ticketwave.entity.SeatLock}. */
    public static final int SEAT_LOCK_DURATION_MINUTES = 5;

    /** Scheduler: expired-lock sweep interval. */
    public static final long EXPIRED_LOCK_SWEEP_INTERVAL_MS = 60_000L;

    public static final String FREE_REASON_EXPIRED = "EXPIRED";
    public static final String FREE_REASON_CANCELLED = "CANCELLED";
    public static final String FREE_REASON_UNSELECTED = "UNSELECTED";

    /** Correlation id placeholder for non-async free-lock work. */
    public static final String SSE_CORRELATION_FREE_LOCK = "free-lock";

    /** {@code status} / {@code reason} values on the seat-lock SSE event payload. */
    public static final String SSE_STATUS_SUCCESS = "SUCCESS";
    public static final String SSE_STATUS_FREED = "FREED";
    public static final String SSE_REASON_LOCKED = "LOCKED";
    public static final String SSE_REASON_UNKNOWN = "UNKNOWN";
}
