package com.ticketwave.messaging;

import com.ticketwave.dto.SeatLockFreeAsyncMessage;
import com.ticketwave.entity.SeatLock;
import com.ticketwave.repository.SeatLockRepository;
import com.ticketwave.service.SeatLockSseService;
import com.ticketwave.service.UserNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Handles seat-lock release: expiry sweeps, order cancellation, or user unselecting seats.
 * Notifies users when locks expire and pushes SSE updates when rows were removed.
 */
@Component
public class SeatLockFreeMessageListener {

    private static final Logger log = LoggerFactory.getLogger(SeatLockFreeMessageListener.class);

    private final SeatLockRepository seatLockRepository;
    private final SeatLockSseService seatLockSseService;
    private final UserNotificationService userNotificationService;

    public SeatLockFreeMessageListener(SeatLockRepository seatLockRepository,
                                       SeatLockSseService seatLockSseService,
                                       UserNotificationService userNotificationService) {
        this.seatLockRepository = seatLockRepository;
        this.seatLockSseService = seatLockSseService;
        this.userNotificationService = userNotificationService;
    }

    @JmsListener(destination = MessagingConstants.SEAT_LOCK_FREE_REQUESTS)
    @Transactional
    public void processFreeLockRequest(SeatLockFreeAsyncMessage message) {
        if (message.getOccurrenceId() == null) {
            return;
        }

        int deleted;
        Set<Long> expiredUserIds = new HashSet<>();
        if (MessagingConstants.FREE_REASON_EXPIRED.equalsIgnoreCase(message.getReason())) {
            List<SeatLock> expiredLocks = seatLockRepository
                    .findByEventOccurrenceIdAndExpiresAtBefore(message.getOccurrenceId(), OffsetDateTime.now());
            for (SeatLock lock : expiredLocks) {
                if (lock.getUser() != null && lock.getUser().getUserId() != null) {
                    expiredUserIds.add(lock.getUser().getUserId());
                }
            }
            deleted = seatLockRepository.deleteExpiredLocksByOccurrence(message.getOccurrenceId(), OffsetDateTime.now());
        } else if (MessagingConstants.FREE_REASON_CANCELLED.equalsIgnoreCase(message.getReason())) {
            if (message.getUserId() == null) {
                return;
            }
            deleted = seatLockRepository.deleteByOccurrenceAndUser(message.getOccurrenceId(), message.getUserId());
        } else {
            List<Long> seatIds = message.getSeatIds();
            if (message.getUserId() == null || seatIds == null || seatIds.isEmpty()) {
                return;
            }
            deleted = seatLockRepository.deleteUserReservedLocks(message.getOccurrenceId(), message.getUserId(), seatIds);
        }

        if (deleted > 0) {
            log.info("Freed {} lock(s) for occurrence {} via {}", deleted, message.getOccurrenceId(),
                    Objects.toString(message.getReason(), MessagingConstants.SSE_REASON_UNKNOWN));
            seatLockSseService.publishSeatLockUpdate(
                    message.getOccurrenceId(),
                    MessagingConstants.SSE_CORRELATION_FREE_LOCK,
                    MessagingConstants.SSE_STATUS_FREED,
                    Objects.toString(message.getReason(), MessagingConstants.SSE_REASON_UNKNOWN)
            );
            if (MessagingConstants.FREE_REASON_EXPIRED.equalsIgnoreCase(message.getReason())) {
                for (Long userId : expiredUserIds) {
                    userNotificationService.publishLockExpired(userId, message.getOccurrenceId());
                }
            }
        }
    }
}
