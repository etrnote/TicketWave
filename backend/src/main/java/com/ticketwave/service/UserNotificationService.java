package com.ticketwave.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * User-scoped SSE channel for expiring holds and order cancellation notifications.
 */
@Service
public class UserNotificationService {

    private static final Logger log = LoggerFactory.getLogger(UserNotificationService.class);

    public static final String EVENT_NAME = "user-notification";
    public static final String TYPE_LOCK_EXPIRED = "LOCK_EXPIRED";
    public static final String TYPE_ORDER_CANCELLED = "ORDER_CANCELLED";

    private final Map<Long, Set<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        userEmitters
                .computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet())
                .add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(ex -> remove(userId, emitter));

        return emitter;
    }

    public void publish(Long userId, String type, Map<String, Object> data) {
        Set<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", type);
        if (data != null) {
            payload.putAll(data);
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(EVENT_NAME).data(payload));
            } catch (IOException | IllegalStateException e) {
                log.debug("Dropping dead user notification SSE for userId {}: {}", userId, e.toString());
                remove(userId, emitter);
            }
        }
    }

    public void publishLockExpired(Long userId, Long occurrenceId) {
        publish(userId, TYPE_LOCK_EXPIRED, Map.of("occurrenceId", occurrenceId));
    }

    public void publishOrderCancelled(Long userId, Long orderId) {
        publish(userId, TYPE_ORDER_CANCELLED, Map.of("orderId", orderId));
    }

    private void remove(Long userId, SseEmitter emitter) {
        Set<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            userEmitters.remove(userId);
        }
    }
}
