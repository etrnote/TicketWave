package com.ticketwave.scheduler;

import com.ticketwave.dto.SeatLockFreeAsyncMessage;
import com.ticketwave.entity.SeatLock;
import com.ticketwave.messaging.MessagingConstants;
import com.ticketwave.repository.SeatLockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Periodically finds expired {@link com.ticketwave.entity.SeatLock} rows and enqueues
 * a single free-lock message per affected occurrence.
 */
@Component
public class SeatLockScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeatLockScheduler.class);
    private final SeatLockRepository seatLockRepository;
    private final JmsOperations jmsTemplate;

    public SeatLockScheduler(SeatLockRepository seatLockRepository, JmsOperations jmsTemplate) {
        this.seatLockRepository = seatLockRepository;
        this.jmsTemplate = jmsTemplate;
    }

    @Scheduled(fixedRate = MessagingConstants.EXPIRED_LOCK_SWEEP_INTERVAL_MS)
    @Transactional
    public void removeExpiredLocks() {
        OffsetDateTime now = OffsetDateTime.now();
        List<SeatLock> expiredLocks = seatLockRepository.findByExpiresAtBefore(now);
        if (expiredLocks.isEmpty()) {
            return;
        }

        Map<Long, List<SeatLock>> byOccurrence = expiredLocks.stream()
                .collect(Collectors.groupingBy(lock -> lock.getEventOccurrence().getId()));

        byOccurrence.keySet().forEach(occurrenceId -> {
            SeatLockFreeAsyncMessage message = new SeatLockFreeAsyncMessage(
                    occurrenceId, null, null, MessagingConstants.FREE_REASON_EXPIRED);
            jmsTemplate.convertAndSend(MessagingConstants.SEAT_LOCK_FREE_REQUESTS, message);
        });

        log.info("Queued free-lock events for {} occurrence(s) with expired locks", byOccurrence.size());
    }
}
