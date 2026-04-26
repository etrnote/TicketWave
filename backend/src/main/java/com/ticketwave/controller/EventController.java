package com.ticketwave.controller;

import com.ticketwave.dto.EventDto;
import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.ReviewDto;
import com.ticketwave.dto.ReviewRequest;
import com.ticketwave.service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public event catalog, reviews, and occurrences. */
@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<List<EventDto>> getAllEvents(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(eventService.getFilteredEvents(category, genre, city, name));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(eventService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDto> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{eventId}/reviews")
    public ResponseEntity<List<ReviewDto>> getReviews(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getReviewsByEvent(eventId));
    }

    @PostMapping("/{eventId}/reviews")
    public ResponseEntity<ReviewDto> addReview(@PathVariable Long eventId, @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.addReview(eventId, request));
    }

    @GetMapping("/{eventId}/occurrences")
    public ResponseEntity<List<EventOccurrenceDto>> getOccurrences(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getOccurrencesByEvent(eventId));
    }

}
