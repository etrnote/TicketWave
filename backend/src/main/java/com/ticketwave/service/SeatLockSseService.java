package com.ticketwave.service;

import com.ticketwave.messaging.MessagingConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-occurrence {@link SseEmitter} registries and broadcast of seat-lock lifecycle events to connected browsers.
 */
@Service
public class SeatLockSseService {

    private static final Logger log = LoggerFactory.getLogger(SeatLockSseService.class);

    private final Map<Long, Set<SseEmitter>> emittersByOccurrence = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long occurrenceId) {
        SseEmitter emitter = new SseEmitter(0L);
        emittersByOccurrence
                .computeIfAbsent(occurrenceId, key -> ConcurrentHashMap.newKeySet())
                .add(emitter);

        emitter.onCompletion(() -> removeEmitter(occurrenceId, emitter));
        emitter.onTimeout(() -> removeEmitter(occurrenceId, emitter));
        emitter.onError(ex -> removeEmitter(occurrenceId, emitter));

        return emitter;
    }

    public void publishSeatLockUpdate(Long occurrenceId, String correlationId, String status, String reason) {
        Set<SseEmitter> emitters = emittersByOccurrence.get(occurrenceId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payload = Map.of(
                "occurrenceId", occurrenceId,
                "correlationId", correlationId,
                "status", status,
                "reason", reason != null ? reason : MessagingConstants.SSE_REASON_UNKNOWN
        );

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("seat-lock-updated").data(payload));
            } catch (IOException | IllegalStateException e) {
                log.debug("Dropping dead SSE client for occurrence {}: {}", occurrenceId, e.toString());
                removeEmitter(occurrenceId, emitter);
            }
        }
    }

    private void removeEmitter(Long occurrenceId, SseEmitter emitter) {
        Set<SseEmitter> emitters = emittersByOccurrence.get(occurrenceId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByOccurrence.remove(occurrenceId);
        }
    }
}
