package com.ticketwave.service;

import com.ticketwave.dto.AdminEventListDto;
import com.ticketwave.dto.EventDto;
import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.EventRequest;
import com.ticketwave.dto.OccurrenceCancellationEligibilityDto;
import com.ticketwave.dto.OccurrenceRequest;
import com.ticketwave.entity.*;
import com.ticketwave.exception.BusinessConflictException;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.EventRepository;
import com.ticketwave.repository.OrderRepository;
import com.ticketwave.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Admin-only writes for events and occurrences, including non-overlapping schedule validation.
 */
@Service
public class AdminEventService {

    /** When event duration is unknown, assume this length (minutes) for overlap checks. */
    private static final int DEFAULT_EVENT_DURATION_MINUTES = 120;
    /** Padding around a requested slot when querying for conflicting occurrences. */
    private static final int OCCURRENCE_OVERLAP_BUFFER_MINUTES = 1;
    /** Maximum years ahead allowed for scheduling an occurrence. */
    private static final int MAX_OCCURRENCE_YEARS_AHEAD = 3;
    private static final String OCCURRENCE_IN_PAST_MESSAGE =
            "Occurrence start time must be in the future.";
    private static final String OCCURRENCE_TOO_FAR_MESSAGE =
            "Occurrence start time cannot be more than 3 years in the future.";

    private final EventRepository eventRepository;
    private final EventOccurrenceRepository occurrenceRepository;
    private final VenueRepository venueRepository;
    private final OrderRepository orderRepository;

    public AdminEventService(EventRepository eventRepository, EventOccurrenceRepository occurrenceRepository,
                             VenueRepository venueRepository,
                             OrderRepository orderRepository) {
        this.eventRepository = eventRepository;
        this.occurrenceRepository = occurrenceRepository;
        this.venueRepository = venueRepository;
        this.orderRepository = orderRepository;
    }

    private EventDto toDto(Event e) {
        BigDecimal minPrice = occurrenceRepository.findMinPriceByEventId(e.getId());
        return new EventDto(e.getId(), e.getTitle(), e.getDescription(), e.getCategory(),
                e.getGenre(), e.getDurationMinutes(), e.getImage(), e.getImageContentType(), minPrice);
    }

    private EventOccurrenceDto toOccurrenceDto(EventOccurrence o) {
        return new EventOccurrenceDto(
                o.getId(),
                o.getEvent().getId(),
                o.getVenue().getId(),
                o.getVenue().getName(),
                o.getVenue().getCity(),
                o.getVenue().getAddress(),
                o.getVenue().getSeatingType().name(),
                o.getVenue().getCapacity(),
                o.getStartTime(),
                o.getPrice(),
                o.getStatus().name());
    }

    public EventDto createEvent(EventRequest request) {
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setCategory(request.getCategory());
        event.setGenre(request.getGenre() != null ? request.getGenre() : "");
        event.setDurationMinutes(request.getDurationMinutes());
        event.setImage(request.getImage());
        event.setImageContentType(request.getImageContentType());
        return toDto(eventRepository.save(event));
    }

    public List<AdminEventListDto> listEventsForAdmin() {
        List<Event> events = eventRepository.findByIsDeletedFalse();
        Map<Long, Long> countByEventId = new HashMap<>();
        for (Object[] row : occurrenceRepository.countOccurrencesGroupedByEventId()) {
            countByEventId.put((Long) row[0], (Long) row[1]);
        }
        return events.stream()
                .map(e -> {
                    EventDto dto = toDto(e);
                    long n = countByEventId.getOrDefault(e.getId(), 0L);
                    return new AdminEventListDto(
                            dto.id(), dto.title(), dto.description(), dto.category(), dto.genre(),
                            dto.durationMinutes(), dto.image(), dto.imageContentType(), dto.minPrice(), n);
                })
                .toList();
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NoSuchElementException("Event not found"));
        if (event.isDeleted()) {
            return;
        }
        if (!isEventDeletable(eventId)) {
            throw new BusinessConflictException(
                    "EVENT_HAS_ACTIVE_OCCURRENCES",
                    "Event has active occurrences.",
                    Map.of()
            );
        }
        event.setDeleted(true);
        eventRepository.save(event);
    }

    public EventDto updateEvent(Long eventId, EventRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NoSuchElementException("Event not found"));
        if (request.getTitle() != null) event.setTitle(request.getTitle());
        if (request.getDescription() != null) event.setDescription(request.getDescription());
        if (request.getCategory() != null) event.setCategory(request.getCategory());
        if (request.getGenre() != null) event.setGenre(request.getGenre());
        if (request.getDurationMinutes() != null) event.setDurationMinutes(request.getDurationMinutes());
        if (request.getImage() != null) event.setImage(request.getImage());
        if (request.getImageContentType() != null) event.setImageContentType(request.getImageContentType());
        return toDto(eventRepository.save(event));
    }

    @Transactional
    public EventOccurrenceDto createOccurrence(Long eventId, OccurrenceRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NoSuchElementException("Event not found"));
        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new NoSuchElementException("Venue not found"));

        OffsetDateTime startTime = request.getStartTime();
        validateOccurrenceStartTime(startTime);
        int durationMins = event.getDurationMinutes() != null ? event.getDurationMinutes() : DEFAULT_EVENT_DURATION_MINUTES;
        OffsetDateTime endTime = startTime.plusMinutes(durationMins);
        List<EventOccurrence> overlapping = occurrenceRepository.findOverlapping(venue.getId(),
                startTime.minusMinutes(OCCURRENCE_OVERLAP_BUFFER_MINUTES),
                endTime.plusMinutes(OCCURRENCE_OVERLAP_BUFFER_MINUTES));
        if (!overlapping.isEmpty()) {
            throw new IllegalStateException("Overlapping occurrence at this venue");
        }

        EventOccurrence occ = new EventOccurrence();
        occ.setEvent(event);
        occ.setVenue(venue);
        occ.setStartTime(startTime);
        occ.setPrice(request.getPrice());
        occ.setStatus(EventOccurrenceStatus.SCHEDULED);
        return toOccurrenceDto(occurrenceRepository.save(occ));
    }

    @Transactional
    public EventOccurrenceDto updateOccurrence(Long occurrenceId, OccurrenceRequest request) {
        EventOccurrence occ = occurrenceRepository.findById(occurrenceId)
                .orElseThrow(() -> new NoSuchElementException("Occurrence not found"));
        OffsetDateTime now = OffsetDateTime.now();
        if (occ.getStartTime() != null && !occ.getStartTime().isAfter(now)) {
            throw new IllegalStateException("Past occurrences cannot be edited.");
        }
        Event event = occ.getEvent();

        Venue targetVenue = occ.getVenue();
        if (request.getVenueId() != null) {
            targetVenue = venueRepository.findById(request.getVenueId())
                    .orElseThrow(() -> new NoSuchElementException("Venue not found"));
        }

        OffsetDateTime targetStart = request.getStartTime() != null ? request.getStartTime() : occ.getStartTime();
        validateOccurrenceStartTime(targetStart);
        int durationMins = event.getDurationMinutes() != null ? event.getDurationMinutes() : DEFAULT_EVENT_DURATION_MINUTES;
        OffsetDateTime endTime = targetStart.plusMinutes(durationMins);
        List<EventOccurrence> overlapping = new ArrayList<>(occurrenceRepository.findOverlapping(
                targetVenue.getId(),
                targetStart.minusMinutes(OCCURRENCE_OVERLAP_BUFFER_MINUTES),
                endTime.plusMinutes(OCCURRENCE_OVERLAP_BUFFER_MINUTES)));
        overlapping.removeIf(o -> o.getId().equals(occurrenceId));
        if (!overlapping.isEmpty()) {
            throw new IllegalStateException("Overlapping occurrence at this venue");
        }

        if (request.getVenueId() != null) {
            occ.setVenue(targetVenue);
        }
        if (request.getStartTime() != null) {
            occ.setStartTime(request.getStartTime());
        }
        if (request.getPrice() != null) {
            occ.setPrice(request.getPrice());
        }
        return toOccurrenceDto(occurrenceRepository.save(occ));
    }

    public List<EventOccurrenceDto> getOccurrencesForAdminEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NoSuchElementException("Event not found"));
        if (event.isDeleted()) {
            throw new NoSuchElementException("Event not found");
        }
        return occurrenceRepository.findByEventId(eventId)
                .stream()
                .map(this::toOccurrenceDto)
                .toList();
    }

    public OccurrenceCancellationEligibilityDto getOccurrenceCancellationEligibility(Long occurrenceId) {
        EventOccurrence occ = occurrenceRepository.findById(occurrenceId)
                .orElseThrow(() -> new NoSuchElementException("Occurrence not found"));
        if (occ.getStatus() == EventOccurrenceStatus.CANCELLED) {
            return new OccurrenceCancellationEligibilityDto(false, "ALREADY_CANCELLED",
                    "Occurrence is already cancelled.", 0, 0);
        }
        if (!isEventOccurrenceCancellable(occ)) {
            long completedOrders = orderRepository.countByEventOccurrenceIdAndStatus(occurrenceId, OrderStatus.COMPLETED);
            return new OccurrenceCancellationEligibilityDto(
                    false,
                    "ACTIVE_PURCHASES_EXIST",
                    "Occurrence cannot be cancelled while it has active future orders.",
                    completedOrders,
                    0
            );
        }

        return new OccurrenceCancellationEligibilityDto(true, "CANCELLABLE", "Occurrence can be cancelled.", 0, 0);
    }

    public EventOccurrenceDto cancelOccurrence(Long occurrenceId) {
        EventOccurrence occ = occurrenceRepository.findById(occurrenceId)
                .orElseThrow(() -> new NoSuchElementException("Occurrence not found"));
        OccurrenceCancellationEligibilityDto eligibility = getOccurrenceCancellationEligibility(occurrenceId);
        if (!eligibility.cancellable()) {
            throw new BusinessConflictException(
                    eligibility.code(),
                    eligibility.message(),
                    Map.of(
                            "completedOrders", eligibility.blockingCompletedOrders(),
                            "validTickets", eligibility.blockingValidTickets()
                    )
            );
        }
        occ.setStatus(EventOccurrenceStatus.CANCELLED);
        return toOccurrenceDto(occurrenceRepository.save(occ));
    }

    private boolean isEventDeletable(Long eventId) {
        List<EventOccurrence> occurrences = occurrenceRepository.findByEventId(eventId);
        if (occurrences.isEmpty()) {
            return true;
        }
        return occurrences.stream().allMatch(this::isEventOccurrenceCancellable);
    }

    private boolean isEventOccurrenceCancellable(EventOccurrence occurrence) {
        OffsetDateTime now = OffsetDateTime.now();
        if (occurrence.getStatus() == EventOccurrenceStatus.CANCELLED) {
            return true;
        }
        if (occurrence.getStartTime() == null || !occurrence.getStartTime().isAfter(now)) {
            return true;
        }
        long completedOrders = orderRepository.countByEventOccurrenceIdAndStatus(
                occurrence.getId(), OrderStatus.COMPLETED);
        return completedOrders == 0;
    }

    private void validateOccurrenceStartTime(OffsetDateTime startTime) {
        if (startTime == null) {
            throw new IllegalArgumentException("Occurrence start time is required.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (!startTime.isAfter(now)) {
            throw new IllegalArgumentException(OCCURRENCE_IN_PAST_MESSAGE);
        }

        OffsetDateTime maxAllowedStart = now.plusYears(MAX_OCCURRENCE_YEARS_AHEAD);
        if (startTime.isAfter(maxAllowedStart)) {
            throw new IllegalArgumentException(OCCURRENCE_TOO_FAR_MESSAGE);
        }
    }
}
