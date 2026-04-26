package com.ticketwave.service;

import com.ticketwave.dto.EventDto;
import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.ReviewDto;
import com.ticketwave.dto.ReviewRequest;
import com.ticketwave.entity.*;
import com.ticketwave.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventOccurrenceRepository occurrenceRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private SeatLockRepository seatLockRepository;

    @InjectMocks
    private EventService eventService;

    @Test
    void getFilteredEventsShouldMapEventsToDto() {
        Event event = new Event();
        event.setId(1L);
        event.setTitle("Live Jazz");
        event.setDescription("Evening show");
        event.setCategory("MUSIC");
        event.setGenre("JAZZ");
        event.setDurationMinutes(90);

        when(eventRepository.findByFilters("MUSIC", "JAZZ", "Live", "Paris")).thenReturn(List.of(event));

        List<EventDto> result = eventService.getFilteredEvents("MUSIC", "JAZZ", "Paris", "Live");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).title()).isEqualTo("Live Jazz");
        assertThat(result.get(0).category()).isEqualTo("MUSIC");
    }

    @Test
    void addReviewShouldPersistAndReturnReviewDtoWhenEventExists() {
        Long eventId = 5L;
        Event event = new Event();
        event.setId(eventId);

        User user = new User();
        user.setName("Reviewer");

        ReviewRequest request = new ReviewRequest();
        request.setRating(4);
        request.setComment("Great event");

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(userRepository.findTop1ByOrderByUserId()).thenReturn(Optional.of(user));
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> {
            Review review = invocation.getArgument(0);
            review.setId(99L);
            return review;
        });

        ReviewDto result = eventService.addReview(eventId, request);

        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getRating()).isEqualTo(4);
        assertThat(result.getComment()).isEqualTo("Great event");
        assertThat(result.getUserName()).isEqualTo("Reviewer");
    }

    @Test
    void addReviewShouldThrowWhenEventDoesNotExist() {
        when(eventRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.addReview(999L, new ReviewRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Event not found: 999");
    }

    @Test
    void getOccurrencesByEventShouldReturnAvailabilityCounts() {
        Event event = new Event();
        event.setId(1L);

        com.ticketwave.entity.Venue venue = new com.ticketwave.entity.Venue();
        venue.setId(2L);
        venue.setName("Main Hall");
        venue.setCity("Paris");
        venue.setAddress("1 Rue A");
        venue.setCapacity(100);
        venue.setSeatingType(SeatingType.GENERAL);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(10L);
        occurrence.setEvent(event);
        occurrence.setVenue(venue);
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);

        when(occurrenceRepository.findByEventIdAndStatusNot(1L, EventOccurrenceStatus.CANCELLED))
                .thenReturn(List.of(occurrence));
        when(ticketRepository.countValidByOccurrenceId(10L)).thenReturn(30L);
        when(seatLockRepository.sumActiveLockedCount(org.mockito.ArgumentMatchers.eq(10L), any()))
                .thenReturn(5L);

        List<EventOccurrenceDto> result = eventService.getOccurrencesByEvent(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).totalCount()).isEqualTo(100);
        assertThat(result.get(0).availableCount()).isEqualTo(65);
    }
}

