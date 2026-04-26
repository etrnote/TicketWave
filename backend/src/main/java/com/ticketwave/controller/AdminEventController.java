package com.ticketwave.controller;

import com.ticketwave.dto.AdminEventListDto;
import com.ticketwave.dto.EventDto;
import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.EventRequest;
import com.ticketwave.dto.OccurrenceCancellationEligibilityDto;
import com.ticketwave.dto.OccurrenceRequest;
import com.ticketwave.service.AdminEventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin: events and occurrence lifecycle. */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminEventController {

    private final AdminEventService adminEventService;

    public AdminEventController(AdminEventService adminEventService) {
        this.adminEventService = adminEventService;
    }

    @GetMapping("/events")
    public ResponseEntity<List<AdminEventListDto>> listEvents() {
        return ResponseEntity.ok(adminEventService.listEventsForAdmin());
    }

    @PostMapping("/events")
    public ResponseEntity<EventDto> createEvent(@RequestBody EventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminEventService.createEvent(request));
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        adminEventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<EventDto> updateEvent(@PathVariable Long eventId, @RequestBody EventRequest request) {
        return ResponseEntity.ok(adminEventService.updateEvent(eventId, request));
    }

    @PostMapping("/events/{eventId}/occurrences")
    public ResponseEntity<EventOccurrenceDto> createOccurrence(@PathVariable Long eventId,
                                                                @RequestBody OccurrenceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminEventService.createOccurrence(eventId, request));
    }

    @GetMapping("/events/{eventId}/occurrences")
    public ResponseEntity<List<EventOccurrenceDto>> getOccurrencesForAdminEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(adminEventService.getOccurrencesForAdminEvent(eventId));
    }

    @PutMapping("/occurrences/{occurrenceId}")
    public ResponseEntity<EventOccurrenceDto> updateOccurrence(@PathVariable Long occurrenceId,
                                                                @RequestBody OccurrenceRequest request) {
        return ResponseEntity.ok(adminEventService.updateOccurrence(occurrenceId, request));
    }

    @DeleteMapping("/occurrences/{occurrenceId}")
    public ResponseEntity<EventOccurrenceDto> cancelOccurrence(@PathVariable Long occurrenceId) {
        return ResponseEntity.ok(adminEventService.cancelOccurrence(occurrenceId));
    }

    @GetMapping("/occurrences/{occurrenceId}/cancellation-eligibility")
    public ResponseEntity<OccurrenceCancellationEligibilityDto> getCancellationEligibility(@PathVariable Long occurrenceId) {
        return ResponseEntity.ok(adminEventService.getOccurrenceCancellationEligibility(occurrenceId));
    }
}
