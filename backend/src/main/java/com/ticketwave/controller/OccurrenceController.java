package com.ticketwave.controller;

import com.ticketwave.dto.SeatLockRequest;
import com.ticketwave.service.OccurrenceService;
import com.ticketwave.service.SeatLockSseService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * Per-occurrence seat layout, synchronous lock/unlock, and live seat-map SSE stream.
 */
@RestController
@RequestMapping("/api/occurrences")
@CrossOrigin(origins = "*")
public class OccurrenceController {

    private static final String ANONYMOUS_USER = "anonymousUser";

    private final OccurrenceService occurrenceService;
    private final SeatLockSseService seatLockSseService;

    public OccurrenceController(OccurrenceService occurrenceService, SeatLockSseService seatLockSseService) {
        this.occurrenceService = occurrenceService;
        this.seatLockSseService = seatLockSseService;
    }

    @GetMapping("/{occurrenceId}/seats")
    public ResponseEntity<Map<String, Object>> getSeats(@PathVariable Long occurrenceId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (auth != null && auth.isAuthenticated() && !ANONYMOUS_USER.equals(auth.getName())
                && auth.getPrincipal() instanceof Long)
                ? (Long) auth.getPrincipal() : null;
        return ResponseEntity.ok(occurrenceService.getSeats(occurrenceId, userId));
    }

    @PostMapping("/{occurrenceId}/lock")
    public ResponseEntity<Map<String, List<Long>>> lockSeats(@PathVariable Long occurrenceId,
                                                             @RequestBody SeatLockRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<Long> lockIds = occurrenceService.lockSeats(occurrenceId, request, userId);
        return ResponseEntity.ok(Map.of("lockIds", lockIds));
    }

    @PostMapping("/{occurrenceId}/unlock")
    public ResponseEntity<Void> freeLocks(@PathVariable Long occurrenceId,
                                          @RequestBody SeatLockRequest request) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        occurrenceService.freeLocksAsync(occurrenceId, request.getSeatIds(), userId);
        return ResponseEntity.accepted().build();
    }

    @GetMapping(path = "/{occurrenceId}/seats/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamSeatUpdates(@PathVariable Long occurrenceId) {
        SseEmitter emitter = seatLockSseService.subscribe(occurrenceId);
        try {
            emitter.send(SseEmitter.event().name("connected").data(Map.of("occurrenceId", occurrenceId)));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return ResponseEntity.ok(emitter);
    }
}
