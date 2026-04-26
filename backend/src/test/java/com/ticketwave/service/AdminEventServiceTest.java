package com.ticketwave.service;

import com.ticketwave.dto.EventOccurrenceDto;
import com.ticketwave.dto.EventRequest;
import com.ticketwave.dto.OccurrenceRequest;
import com.ticketwave.entity.Event;
import com.ticketwave.entity.EventOccurrence;
import com.ticketwave.entity.EventOccurrenceStatus;
import com.ticketwave.entity.OrderStatus;
import com.ticketwave.entity.SeatingType;
import com.ticketwave.entity.Venue;
import com.ticketwave.exception.BusinessConflictException;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.EventRepository;
import com.ticketwave.repository.OrderRepository;
import com.ticketwave.repository.VenueRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminEventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventOccurrenceRepository occurrenceRepository;

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private AdminEventService adminEventService;

    @Test
    void createEventShouldSucceedWithoutOccurrences() {
        EventRequest request = new EventRequest();
        request.setTitle("Jazz Night");
        request.setDescription("Live jazz concert");
        request.setCategory("Concert");
        request.setGenre("Jazz");
        request.setDurationMinutes(120);

        Event saved = new Event();
        saved.setId(101L);
        saved.setTitle(request.getTitle());
        saved.setDescription(request.getDescription());
        saved.setCategory(request.getCategory());
        saved.setGenre(request.getGenre());
        saved.setDurationMinutes(request.getDurationMinutes());

        when(eventRepository.save(any(Event.class))).thenReturn(saved);
        when(occurrenceRepository.findMinPriceByEventId(101L)).thenReturn(null);

        var result = adminEventService.createEvent(request);

        assertThat(result.id()).isEqualTo(101L);
        assertThat(result.title()).isEqualTo("Jazz Night");
        assertThat(result.durationMinutes()).isEqualTo(120);
    }

    @Test
    void createEventThenCreateOccurrencesShouldSucceed() {
        EventRequest request = new EventRequest();
        request.setTitle("Comedy Gala");
        request.setDescription("Standup night");
        request.setCategory("Show");
        request.setGenre("Comedy");
        request.setDurationMinutes(90);

        Event event = new Event();
        event.setId(202L);
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setCategory(request.getCategory());
        event.setGenre(request.getGenre());
        event.setDurationMinutes(request.getDurationMinutes());

        Venue venue = new Venue();
        venue.setId(2L);
        venue.setName("Main Hall");
        venue.setCity("Paris");
        venue.setAddress("1 Rue A");
        venue.setCapacity(500);
        venue.setSeatingType(SeatingType.RESERVED);

        when(eventRepository.save(any(Event.class))).thenReturn(event);
        when(occurrenceRepository.findMinPriceByEventId(202L)).thenReturn(null);
        when(eventRepository.findById(202L)).thenReturn(Optional.of(event));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(venue));
        when(occurrenceRepository.findOverlapping(any(Long.class), any(OffsetDateTime.class), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        when(occurrenceRepository.save(any(EventOccurrence.class))).thenAnswer(invocation -> {
            EventOccurrence occurrence = invocation.getArgument(0);
            occurrence.setId(303L);
            return occurrence;
        });

        var eventResult = adminEventService.createEvent(request);
        OccurrenceRequest occurrenceRequest = new OccurrenceRequest();
        occurrenceRequest.setVenueId(2L);
        occurrenceRequest.setStartTime(OffsetDateTime.parse("2026-08-20T19:00:00Z"));
        occurrenceRequest.setPrice(BigDecimal.valueOf(60));
        var occurrenceResult = adminEventService.createOccurrence(eventResult.id(), occurrenceRequest);

        assertThat(eventResult.id()).isEqualTo(202L);
        assertThat(occurrenceResult.id()).isEqualTo(303L);
        assertThat(occurrenceResult.eventId()).isEqualTo(202L);
        assertThat(occurrenceResult.status()).isEqualTo(EventOccurrenceStatus.SCHEDULED.name());
    }

    @Test
    void createOccurrenceShouldThrowWhenOverlapDetected() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(120);

        Venue venue = new Venue();
        venue.setId(2L);

        OccurrenceRequest request = new OccurrenceRequest();
        request.setVenueId(2L);
        request.setStartTime(OffsetDateTime.parse("2026-06-01T18:00:00Z"));
        request.setPrice(BigDecimal.valueOf(65));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(venue));
        when(occurrenceRepository.findOverlapping(any(Long.class), any(OffsetDateTime.class), any(OffsetDateTime.class)))
                .thenReturn(List.of(new EventOccurrence()));

        assertThatThrownBy(() -> adminEventService.createOccurrence(1L, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Overlapping occurrence at this venue");
    }

    @Test
    void createOccurrenceShouldPersistScheduledOccurrenceWhenNoOverlap() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(90);

        Venue venue = new Venue();
        venue.setId(2L);
        venue.setName("Main Hall");
        venue.setCity("Paris");
        venue.setAddress("1 Rue A");
        venue.setCapacity(500);
        venue.setSeatingType(SeatingType.RESERVED);

        OffsetDateTime start = OffsetDateTime.parse("2026-07-01T19:30:00Z");

        OccurrenceRequest request = new OccurrenceRequest();
        request.setVenueId(2L);
        request.setStartTime(start);
        request.setPrice(BigDecimal.valueOf(80));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(venue));
        when(occurrenceRepository.findOverlapping(any(Long.class), any(OffsetDateTime.class), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        when(occurrenceRepository.save(any(EventOccurrence.class))).thenAnswer(invocation -> {
            EventOccurrence occurrence = invocation.getArgument(0);
            occurrence.setId(55L);
            return occurrence;
        });

        EventOccurrenceDto dto = adminEventService.createOccurrence(1L, request);

        assertThat(dto.id()).isEqualTo(55L);
        assertThat(dto.eventId()).isEqualTo(1L);
        assertThat(dto.venueId()).isEqualTo(2L);
        assertThat(dto.status()).isEqualTo(EventOccurrenceStatus.SCHEDULED.name());
        assertThat(dto.price()).isEqualByComparingTo("80");

        ArgumentCaptor<EventOccurrence> captor = ArgumentCaptor.forClass(EventOccurrence.class);
        verify(occurrenceRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(EventOccurrenceStatus.SCHEDULED);
    }

    @Test
    void createOccurrenceShouldThrowWhenStartTimeIsInThePast() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(90);

        Venue venue = new Venue();
        venue.setId(2L);

        OccurrenceRequest request = new OccurrenceRequest();
        request.setVenueId(2L);
        request.setStartTime(OffsetDateTime.now().minusMinutes(5));
        request.setPrice(BigDecimal.valueOf(50));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(venue));

        assertThatThrownBy(() -> adminEventService.createOccurrence(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Occurrence start time must be in the future.");
    }

    @Test
    void createOccurrenceShouldThrowWhenStartTimeIsMoreThanThreeYearsAhead() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(90);

        Venue venue = new Venue();
        venue.setId(2L);

        OccurrenceRequest request = new OccurrenceRequest();
        request.setVenueId(2L);
        request.setStartTime(OffsetDateTime.now().plusYears(3).plusMinutes(1));
        request.setPrice(BigDecimal.valueOf(50));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(venue));

        assertThatThrownBy(() -> adminEventService.createOccurrence(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Occurrence start time cannot be more than 3 years in the future.");
    }

    @Test
    void cancelOccurrenceShouldSetStatusToCancelled() {
        Event event = new Event();
        event.setId(1L);

        Venue venue = new Venue();
        venue.setId(2L);
        venue.setName("Main Hall");
        venue.setCity("Paris");
        venue.setAddress("1 Rue A");
        venue.setCapacity(500);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(11L);
        occurrence.setEvent(event);
        occurrence.setVenue(venue);
        occurrence.setPrice(BigDecimal.valueOf(40));
        occurrence.setStartTime(OffsetDateTime.parse("2026-08-10T20:00:00Z"));
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);

        when(occurrenceRepository.findById(11L)).thenReturn(Optional.of(occurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(11L, OrderStatus.COMPLETED)).thenReturn(0L);
        when(occurrenceRepository.save(any(EventOccurrence.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EventOccurrenceDto result = adminEventService.cancelOccurrence(11L);

        assertThat(result.status()).isEqualTo(EventOccurrenceStatus.CANCELLED.name());
        assertThat(occurrence.getStatus()).isEqualTo(EventOccurrenceStatus.CANCELLED);
    }

    @Test
    void cancelOccurrenceShouldThrowBusinessConflictWhenNotCancellable() {
        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(12L);
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);
        occurrence.setStartTime(OffsetDateTime.now().plusDays(3));

        when(occurrenceRepository.findById(12L)).thenReturn(Optional.of(occurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(12L, OrderStatus.COMPLETED)).thenReturn(2L);

        assertThatThrownBy(() -> adminEventService.cancelOccurrence(12L))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("Occurrence cannot be cancelled while it has active future orders.")
                .satisfies(ex -> {
                    BusinessConflictException conflict = (BusinessConflictException) ex;
                    assertThat(conflict.getCode()).isEqualTo("ACTIVE_PURCHASES_EXIST");
                    assertThat(conflict.getBlockingCounts()).containsEntry("completedOrders", 2L);
                });
    }

    @Test
    void cancelOccurrenceShouldThrowWhenOccurrenceMissing() {
        when(occurrenceRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminEventService.cancelOccurrence(404L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Occurrence not found");
    }

    @Test
    void deleteEventShouldRemoveWhenNoOccurrences() {
        Event event = new Event();
        event.setId(9L);
        when(eventRepository.findById(9L)).thenReturn(Optional.of(event));
        when(occurrenceRepository.findByEventId(9L)).thenReturn(List.of());

        adminEventService.deleteEvent(9L);

        verify(eventRepository).save(event);
        assertThat(event.isDeleted()).isTrue();
    }

    @Test
    void deleteEventShouldSoftDeleteEvenWhenOccurrencesExist() {
        Event event = new Event();
        event.setId(3L);
        when(eventRepository.findById(3L)).thenReturn(Optional.of(event));
        EventOccurrence cancelledOccurrence = new EventOccurrence();
        cancelledOccurrence.setId(300L);
        cancelledOccurrence.setStatus(EventOccurrenceStatus.CANCELLED);
        cancelledOccurrence.setStartTime(OffsetDateTime.now().plusDays(5));
        when(occurrenceRepository.findByEventId(3L)).thenReturn(List.of(cancelledOccurrence));

        adminEventService.deleteEvent(3L);

        verify(eventRepository).save(event);
        assertThat(event.isDeleted()).isTrue();
    }

    @Test
    void deleteEventShouldSoftDeleteWhenAllOccurrencesAreCancellable() {
        Event event = new Event();
        event.setId(5L);
        when(eventRepository.findById(5L)).thenReturn(Optional.of(event));

        EventOccurrence scheduledFutureOccurrence = new EventOccurrence();
        scheduledFutureOccurrence.setId(501L);
        scheduledFutureOccurrence.setStatus(EventOccurrenceStatus.SCHEDULED);
        scheduledFutureOccurrence.setStartTime(OffsetDateTime.now().plusDays(7));

        when(occurrenceRepository.findByEventId(5L)).thenReturn(List.of(scheduledFutureOccurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(501L, OrderStatus.COMPLETED)).thenReturn(0L);

        adminEventService.deleteEvent(5L);

        verify(eventRepository).save(event);
        assertThat(event.isDeleted()).isTrue();
    }

    @Test
    void deleteEventShouldThrowWhenEventMissing() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminEventService.deleteEvent(99L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Event not found");
    }

    @Test
    void deleteEventShouldBlockWhenFutureOccurrenceHasActivePurchases() {
        Event event = new Event();
        event.setId(12L);
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));
        EventOccurrence futureScheduledOccurrence = new EventOccurrence();
        futureScheduledOccurrence.setId(21L);
        futureScheduledOccurrence.setStatus(EventOccurrenceStatus.SCHEDULED);
        futureScheduledOccurrence.setStartTime(OffsetDateTime.now().plusDays(10));
        when(occurrenceRepository.findByEventId(12L)).thenReturn(List.of(futureScheduledOccurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(21L, OrderStatus.COMPLETED)).thenReturn(1L);

        assertThatThrownBy(() -> adminEventService.deleteEvent(12L))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage("Event has active occurrences.")
                .satisfies(ex -> {
                    BusinessConflictException conflict = (BusinessConflictException) ex;
                    assertThat(conflict.getCode()).isEqualTo("EVENT_HAS_ACTIVE_OCCURRENCES");
                });
    }

    @Test
    void updateOccurrenceShouldChangeVenue() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(120);

        Venue oldVenue = new Venue();
        oldVenue.setId(1L);
        oldVenue.setName("Old Hall");
        oldVenue.setCity("X");
        oldVenue.setAddress("A");
        oldVenue.setCapacity(200);
        oldVenue.setSeatingType(SeatingType.RESERVED);

        Venue newVenue = new Venue();
        newVenue.setId(2L);
        newVenue.setName("New Hall");
        newVenue.setCity("Y");
        newVenue.setAddress("B");
        newVenue.setCapacity(300);
        newVenue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(50L);
        occurrence.setEvent(event);
        occurrence.setVenue(oldVenue);
        OffsetDateTime start = OffsetDateTime.parse("2026-10-10T20:00:00Z");
        occurrence.setStartTime(start);
        occurrence.setPrice(BigDecimal.valueOf(45));
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);

        OccurrenceRequest request = new OccurrenceRequest();
        request.setVenueId(2L);
        request.setStartTime(start);
        request.setPrice(BigDecimal.valueOf(45));

        when(occurrenceRepository.findById(50L)).thenReturn(Optional.of(occurrence));
        when(venueRepository.findById(2L)).thenReturn(Optional.of(newVenue));
        when(occurrenceRepository.findOverlapping(any(Long.class), any(OffsetDateTime.class), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        when(occurrenceRepository.save(any(EventOccurrence.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminEventService.updateOccurrence(50L, request);

        assertThat(occurrence.getVenue().getId()).isEqualTo(2L);
    }

    @Test
    void updateOccurrenceShouldThrowWhenOccurrenceIsInPast() {
        Event event = new Event();
        event.setId(1L);
        event.setDurationMinutes(120);

        Venue venue = new Venue();
        venue.setId(1L);
        venue.setName("Old Hall");
        venue.setCity("X");
        venue.setAddress("A");
        venue.setCapacity(200);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(51L);
        occurrence.setEvent(event);
        occurrence.setVenue(venue);
        occurrence.setStartTime(OffsetDateTime.now().minusHours(2));
        occurrence.setPrice(BigDecimal.valueOf(45));
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);

        OccurrenceRequest request = new OccurrenceRequest();
        request.setPrice(BigDecimal.valueOf(50));

        when(occurrenceRepository.findById(51L)).thenReturn(Optional.of(occurrence));

        assertThatThrownBy(() -> adminEventService.updateOccurrence(51L, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Past occurrences cannot be edited.");
    }

    @Test
    void cancellationEligibilityShouldAllowFutureOccurrenceWhenCommerceAlreadyCancelled() {
        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(22L);
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);
        occurrence.setStartTime(OffsetDateTime.now().plusDays(4));

        when(occurrenceRepository.findById(22L)).thenReturn(Optional.of(occurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(22L, OrderStatus.COMPLETED)).thenReturn(0L);

        var eligibility = adminEventService.getOccurrenceCancellationEligibility(22L);

        assertThat(eligibility.cancellable()).isTrue();
        assertThat(eligibility.code()).isEqualTo("CANCELLABLE");
    }

    @Test
    void cancellationEligibilityShouldBlockWhenCompletedOrdersExist() {
        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(23L);
        occurrence.setStatus(EventOccurrenceStatus.SCHEDULED);
        occurrence.setStartTime(OffsetDateTime.now().plusDays(2));

        when(occurrenceRepository.findById(23L)).thenReturn(Optional.of(occurrence));
        when(orderRepository.countByEventOccurrenceIdAndStatus(23L, OrderStatus.COMPLETED)).thenReturn(2L);

        var eligibility = adminEventService.getOccurrenceCancellationEligibility(23L);

        assertThat(eligibility.cancellable()).isFalse();
        assertThat(eligibility.code()).isEqualTo("ACTIVE_PURCHASES_EXIST");
        assertThat(eligibility.blockingCompletedOrders()).isEqualTo(2L);
    }
}

