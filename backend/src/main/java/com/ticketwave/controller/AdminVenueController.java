package com.ticketwave.controller;

import com.ticketwave.dto.VenueDto;
import com.ticketwave.dto.VenueSeatDto;
import com.ticketwave.dto.VenueRequest;
import com.ticketwave.dto.SeatToggleRequest;
import com.ticketwave.service.VenueService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin: venues, seat layout, and seat activation. */
@RestController
@RequestMapping("/api/admin/venues")
@CrossOrigin(origins = "*")
public class AdminVenueController {

    private final VenueService venueService;

    public AdminVenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @GetMapping
    public ResponseEntity<List<VenueDto>> getAllVenues() {
        return ResponseEntity.ok(venueService.getAllVenues());
    }

    @PostMapping
    public ResponseEntity<VenueDto> addVenue(@RequestBody VenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(venueService.createVenue(request));
    }

    @PutMapping("/{venueId}")
    public ResponseEntity<VenueDto> updateVenue(@PathVariable Long venueId, @RequestBody VenueRequest request) {
        return ResponseEntity.ok(venueService.updateVenue(venueId, request));
    }

    @DeleteMapping("/{venueId}")
    public ResponseEntity<Void> deleteVenue(@PathVariable Long venueId) {
        venueService.deleteVenue(venueId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{venueId}/seats")
    public ResponseEntity<List<VenueSeatDto>> getVenueSeats(@PathVariable Long venueId) {
        return ResponseEntity.ok(venueService.getVenueSeats(venueId));
    }

    @PatchMapping("/{venueId}/seats/{seatId}")
    public ResponseEntity<VenueSeatDto> toggleSeat(
            @PathVariable Long venueId,
            @PathVariable Long seatId,
            @RequestBody SeatToggleRequest request) {
        return ResponseEntity.ok(venueService.toggleSeatActive(venueId, seatId, request.isActive()));
    }
}
