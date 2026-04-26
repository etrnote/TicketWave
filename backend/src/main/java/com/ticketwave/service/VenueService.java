package com.ticketwave.service;

import com.ticketwave.dto.VenueDto;
import com.ticketwave.dto.VenueSeatDto;
import com.ticketwave.dto.VenueRequest;
import com.ticketwave.exception.SeatDeactivationBlockedException;
import com.ticketwave.entity.*;
import com.ticketwave.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Venue CRUD, reserved-seat layout, and per-seat active flag with ticket-based guardrails.
 */
@Service
public class VenueService {

    private static final Logger log = LoggerFactory.getLogger(VenueService.class);

    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final SeatLockRepository seatLockRepository;
    private final TicketRepository ticketRepository;
    private final EventOccurrenceRepository eventOccurrenceRepository;

    public VenueService(VenueRepository venueRepository, SeatRepository seatRepository,
                        SeatLockRepository seatLockRepository, TicketRepository ticketRepository,
                        EventOccurrenceRepository eventOccurrenceRepository) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.seatLockRepository = seatLockRepository;
        this.ticketRepository = ticketRepository;
        this.eventOccurrenceRepository = eventOccurrenceRepository;
    }

    private VenueDto toDto(Venue v) {
        return new VenueDto(v.getId(), v.getName(), v.getCity(), v.getAddress(),
                v.getSeatingType().name(), v.getCapacity(), v.getRows(), v.getSeatsPerRow());
    }

    @Transactional
    public VenueDto createVenue(VenueRequest request) {
        Venue venue = new Venue();
        venue.setName(request.getName());
        venue.setCity(request.getCity());
        venue.setAddress(request.getAddress() != null ? request.getAddress() : "");
        SeatingType type = SeatingType.valueOf(request.getSeatingType().toUpperCase());
        venue.setSeatingType(type);

        if (type == SeatingType.RESERVED) {
            int rows = request.getRows() != null ? request.getRows() : 0;
            int seatsPerRow = request.getSeatsPerRow() != null ? request.getSeatsPerRow() : 0;
            venue.setRows(rows);
            venue.setSeatsPerRow(seatsPerRow);
            venue.setCapacity(rows * seatsPerRow);
            Venue saved = venueRepository.save(venue);
            createSeats(saved, rows, seatsPerRow);
            log.info("Venue created (reserved): id={} name={} rows={} x seatsPerRow={}", saved.getId(), saved.getName(), rows, seatsPerRow);
            return toDto(saved);
        } else {
            venue.setCapacity(request.getCapacity());
            Venue saved = venueRepository.save(venue);
            log.info("Venue created (general): id={} name={} capacity={}", saved.getId(), saved.getName(), saved.getCapacity());
            return toDto(saved);
        }
    }

    @Transactional
    public VenueDto updateVenue(Long venueId, VenueRequest request) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new NoSuchElementException("Venue not found"));
        if (request.getName() != null) venue.setName(request.getName());
        if (request.getCity() != null) venue.setCity(request.getCity());
        if (request.getAddress() != null) venue.setAddress(request.getAddress());

        if (venue.getSeatingType() == SeatingType.RESERVED
                && (request.getRows() != null || request.getSeatsPerRow() != null)) {
            int targetRows = request.getRows() != null ? request.getRows() : venue.getRows();
            int targetSeatsPerRow = request.getSeatsPerRow() != null ? request.getSeatsPerRow() : venue.getSeatsPerRow();
            boolean seatsChanging = targetRows != venue.getRows() || targetSeatsPerRow != venue.getSeatsPerRow();
            if (seatsChanging && eventOccurrenceRepository.existsUpcomingByVenueId(venueId)) {
                throw new IllegalStateException(
                        "Cannot change seat configuration while upcoming occurrences exist for this venue. " +
                        "Please cancel all upcoming occurrences first, then make the changes.");
            }
            rebuildSeats(venue, targetRows, targetSeatsPerRow);
        } else if (request.getCapacity() != null) {
            venue.setCapacity(request.getCapacity());
        }

        return toDto(venueRepository.save(venue));
    }

    private void deleteSeats(Long venueId, List<Seat> seats) {
        if (!seats.isEmpty()) {
            List<Long> seatIds = seats.stream().map(Seat::getId).collect(Collectors.toList());
            seatLockRepository.deleteBySeatIdIn(seatIds);
            ticketRepository.clearSeatBySeatIdIn(seatIds);
            seatRepository.deleteAllByVenueId(venueId);
        }
    }

    private void createSeats(Venue venue, int rows, int seatsPerRow) {
        for (int r = 1; r <= rows; r++) {
            for (int s = 1; s <= seatsPerRow; s++) {
                Seat seat = new Seat();
                seat.setVenue(venue);
                seat.setRowNumber(r);
                seat.setSeatNumber(s);
                seat.setIsActive(true);
                seatRepository.save(seat);
            }
        }
    }

    private void rebuildSeats(Venue venue, int targetRows, int targetSeatsPerRow) {
        List<Seat> existing = seatRepository.findByVenueId(venue.getId());
        deleteSeats(venue.getId(), existing);
        createSeats(venue, targetRows, targetSeatsPerRow);

        venue.setRows(targetRows);
        venue.setSeatsPerRow(targetSeatsPerRow);
        venue.setCapacity(targetRows * targetSeatsPerRow);
    }

    public List<VenueDto> getAllVenues() {
        return venueRepository.findByIsDeletedFalse().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<VenueSeatDto> getVenueSeats(Long venueId) {
        return seatRepository.findByVenueId(venueId).stream()
                .map(s -> new VenueSeatDto(s.getId(), s.getRowNumber(), s.getSeatNumber(), s.getIsActive()))
                .collect(Collectors.toList());
    }

    @Transactional
    public VenueSeatDto toggleSeatActive(Long venueId, Long seatId, boolean isActive) {
        Seat seat = seatRepository.findById(seatId)
                .filter(s -> s.getVenue().getId().equals(venueId))
                .orElseThrow(() -> new NoSuchElementException("Seat not found"));

        if (!isActive) {
            List<Long> blockingIds = ticketRepository.findBlockingTicketsForSeat(seatId)
                    .stream().map(Ticket::getId).collect(Collectors.toList());
            if (!blockingIds.isEmpty()) {
                throw new SeatDeactivationBlockedException(blockingIds);
            }
        }

        seat.setIsActive(isActive);
        Seat saved = seatRepository.save(seat);
        return new VenueSeatDto(saved.getId(), saved.getRowNumber(), saved.getSeatNumber(), saved.getIsActive());
    }

    @Transactional
    public void deleteVenue(Long venueId) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new NoSuchElementException("Venue not found"));
        if (venue.isDeleted()) {
            return;
        }
        if (!isVenueDeletable(venueId)) {
            throw new IllegalStateException("Venue cannot be deleted while it has active related events.");
        }
        List<Seat> seats = seatRepository.findByVenueId(venueId);
        for (Seat seat : seats) {
            seat.setIsActive(false);
        }
        if (!seats.isEmpty()) {
            seatRepository.saveAll(seats);
        }
        log.info("Soft deleting venue: id={}", venueId);
        venue.setDeleted(true);
        venueRepository.save(venue);
    }

    public boolean isVenueDeletable(Long venueId) {
        return !eventOccurrenceRepository.existsActiveByVenueId(venueId);
    }
}
