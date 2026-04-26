package com.ticketwave.service;

import com.ticketwave.dto.EventDto;
import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.EventRequest;
import com.ticketwave.dto.ReviewDto;
import com.ticketwave.dto.ReviewRequest;
import com.ticketwave.entity.Event;
import com.ticketwave.entity.EventOccurrence;
import com.ticketwave.entity.EventOccurrenceStatus;
import com.ticketwave.entity.Review;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.EventRepository;
import com.ticketwave.repository.ReviewRepository;
import com.ticketwave.repository.SeatLockRepository;
import com.ticketwave.repository.TicketRepository;
import com.ticketwave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Public catalog: events, reviews, and occurrences with availability derived from
 * tickets and active seat locks.
 */
@Service
public class EventService {

    private static final String ANONYMOUS_REVIEWER = "Anonymous";

    private final EventRepository eventRepository;
    private final EventOccurrenceRepository occurrenceRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final SeatLockRepository seatLockRepository;

    public EventService(EventRepository eventRepository, EventOccurrenceRepository occurrenceRepository,
                        ReviewRepository reviewRepository, UserRepository userRepository,
                        TicketRepository ticketRepository, SeatLockRepository seatLockRepository) {
        this.eventRepository = eventRepository;
        this.occurrenceRepository = occurrenceRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.seatLockRepository = seatLockRepository;
    }

    private EventDto toDto(Event e) {
        BigDecimal minPrice = occurrenceRepository.findMinPriceByEventId(e.getId());
        return new EventDto(e.getId(), e.getTitle(), e.getDescription(), e.getCategory(),
                e.getGenre(), e.getDurationMinutes(), e.getImage(), e.getImageContentType(), minPrice);
    }

    public List<EventDto> getFilteredEvents(String category, String genre, String city, String name) {
        return eventRepository.findByFilters(category, genre, name, city).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<String> getAllCategories() {
        return eventRepository.findDistinctCategories();
    }

    public Optional<EventDto> getEventById(Long id) {
        return eventRepository.findByIdAndIsDeletedFalse(id).map(this::toDto);
    }

    public List<ReviewDto> getReviewsByEvent(Long eventId) {
        return reviewRepository.findByEventId(eventId).stream()
                .map(r -> new ReviewDto(
                        r.getId(),
                        r.getRating(),
                        r.getComment(),
                        r.getCreatedAt(),
                        r.getUser() != null ? r.getUser().getName() : ANONYMOUS_REVIEWER))
                .collect(Collectors.toList());
    }

    public ReviewDto addReview(Long eventId, ReviewRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));
        Review review = new Review();
        review.setEvent(event);
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setCreatedAt(OffsetDateTime.now());
        userRepository.findTop1ByOrderByUserId().ifPresent(review::setUser);
        Review saved = reviewRepository.save(review);
        return new ReviewDto(
                saved.getId(),
                saved.getRating(),
                saved.getComment(),
                saved.getCreatedAt(),
                saved.getUser() != null ? saved.getUser().getName() : ANONYMOUS_REVIEWER);
    }

    public List<EventOccurrenceDto> getOccurrencesByEvent(Long eventId) {
        return occurrenceRepository.findByEventIdAndStatusNot(eventId, EventOccurrenceStatus.CANCELLED)
                .stream()
                .map(this::toOccurrenceDtoWithCounts)
                .collect(Collectors.toList());
    }

    private EventOccurrenceDto toOccurrenceDtoWithCounts(EventOccurrence occurrence) {
        int totalCount = Objects.requireNonNullElse(occurrence.getVenue().getCapacity(), 0);
        long soldCount = ticketRepository.countValidByOccurrenceId(occurrence.getId());
        long lockedCount = seatLockRepository.sumActiveLockedCount(occurrence.getId(), OffsetDateTime.now());
        int availableCount = (int) Math.max(0L, totalCount - soldCount - lockedCount);

        return new EventOccurrenceDto(
                occurrence.getId(),
                occurrence.getEvent().getId(),
                occurrence.getVenue().getId(),
                occurrence.getVenue().getName(),
                occurrence.getVenue().getCity(),
                occurrence.getVenue().getAddress(),
                occurrence.getVenue().getSeatingType().name(),
                occurrence.getVenue().getCapacity(),
                occurrence.getStartTime(),
                occurrence.getPrice(),
                occurrence.getStatus().name(),
                totalCount,
                availableCount
        );
    }
}
