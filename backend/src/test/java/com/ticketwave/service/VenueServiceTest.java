package com.ticketwave.service;

import com.ticketwave.dto.VenueDto;
import com.ticketwave.dto.VenueRequest;
import com.ticketwave.entity.Seat;
import com.ticketwave.entity.SeatingType;
import com.ticketwave.entity.Venue;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.SeatRepository;
import com.ticketwave.repository.VenueRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VenueServiceTest {

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private SeatRepository seatRepository;

    @Mock
    private EventOccurrenceRepository eventOccurrenceRepository;

    @InjectMocks
    private VenueService venueService;

    private Venue buildVenue(Long id, String name, String city, SeatingType type, int capacity) {
        Venue v = new Venue();
        v.setId(id);
        v.setName(name);
        v.setCity(city);
        v.setAddress("123 Main St");
        v.setSeatingType(type);
        v.setCapacity(capacity);
        return v;
    }

    // getAllVenues

    @Test
    void getAllVenuesShouldReturnMappedDtos() {
        Venue v1 = buildVenue(1L, "Grand Hall", "Paris", SeatingType.RESERVED, 200);
        Venue v2 = buildVenue(2L, "Open Air", "Lyon", SeatingType.GENERAL, 500);
        when(venueRepository.findByIsDeletedFalse()).thenReturn(List.of(v1, v2));

        List<VenueDto> result = venueService.getAllVenues();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).name()).isEqualTo("Grand Hall");
        assertThat(result.get(0).seatingType()).isEqualTo("RESERVED");
        assertThat(result.get(1).id()).isEqualTo(2L);
        assertThat(result.get(1).seatingType()).isEqualTo("GENERAL");
    }

    @Test
    void getAllVenuesShouldReturnEmptyListWhenNoVenuesExist() {
        when(venueRepository.findByIsDeletedFalse()).thenReturn(List.of());

        List<VenueDto> result = venueService.getAllVenues();

        assertThat(result).isEmpty();
    }

    // createVenue — GENERAL seating

    @Test
    void createVenueShouldPersistAndReturnDtoForGeneralSeating() {
        VenueRequest request = new VenueRequest();
        request.setName("City Arena");
        request.setCity("Berlin");
        request.setAddress("5 Arena Blvd");
        request.setSeatingType("GENERAL");
        request.setCapacity(1000);

        when(venueRepository.save(any(Venue.class))).thenAnswer(inv -> {
            Venue v = inv.getArgument(0);
            v.setId(10L);
            return v;
        });

        VenueDto dto = venueService.createVenue(request);

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.name()).isEqualTo("City Arena");
        assertThat(dto.capacity()).isEqualTo(1000);
        assertThat(dto.seatingType()).isEqualTo("GENERAL");
    }

    // createVenue — RESERVED seating generates seats

    @Test
    void createVenueShouldGenerateSeatsForReservedSeating() {
        VenueRequest request = new VenueRequest();
        request.setName("Theater");
        request.setCity("Vienna");
        request.setAddress("1 Opera Sq");
        request.setSeatingType("RESERVED");
        request.setRows(3);
        request.setSeatsPerRow(4);

        when(venueRepository.save(any(Venue.class))).thenAnswer(inv -> {
            Venue v = inv.getArgument(0);
            v.setId(20L);
            return v;
        });

        VenueDto dto = venueService.createVenue(request);

        assertThat(dto.id()).isEqualTo(20L);
        assertThat(dto.capacity()).isEqualTo(12); // 3 rows × 4 seats
        verify(seatRepository, times(12)).save(any());
    }

    // updateVenue

    @Test
    void updateVenueShouldApplyChangesAndReturnDto() {
        Venue existing = buildVenue(5L, "Old Name", "Old City", SeatingType.GENERAL, 100);
        when(venueRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(venueRepository.save(any(Venue.class))).thenAnswer(inv -> inv.getArgument(0));

        VenueRequest request = new VenueRequest();
        request.setName("New Name");
        request.setCity("New City");

        VenueDto dto = venueService.updateVenue(5L, request);

        assertThat(dto.name()).isEqualTo("New Name");
        assertThat(dto.city()).isEqualTo("New City");

        ArgumentCaptor<Venue> captor = ArgumentCaptor.forClass(Venue.class);
        verify(venueRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("New Name");
    }

    @Test
    void updateVenueShouldThrowWhenVenueNotFound() {
        when(venueRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> venueService.updateVenue(99L, new VenueRequest()))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Venue not found");
    }

    @Test
    void deleteVenueSoftDeletesWhenNoRelatedEvents() {
        Venue venue = buildVenue(7L, "To Delete", "Rome", SeatingType.GENERAL, 120);
        when(venueRepository.findById(7L)).thenReturn(Optional.of(venue));
        when(eventOccurrenceRepository.existsActiveByVenueId(7L)).thenReturn(false);
        when(seatRepository.findByVenueId(7L)).thenReturn(List.of());

        venueService.deleteVenue(7L);

        assertThat(venue.isDeleted()).isTrue();
        verify(venueRepository).save(venue);
    }

    @Test
    void deleteVenueSoftDeletesWhenOnlyDeletedRelatedEvents() {
        Venue venue = buildVenue(8L, "Legacy Venue", "Prague", SeatingType.RESERVED, 80);
        Seat seat1 = new Seat();
        seat1.setId(101L);
        seat1.setIsActive(true);
        Seat seat2 = new Seat();
        seat2.setId(102L);
        seat2.setIsActive(true);
        when(venueRepository.findById(8L)).thenReturn(Optional.of(venue));
        when(eventOccurrenceRepository.existsActiveByVenueId(8L)).thenReturn(false);
        when(seatRepository.findByVenueId(8L)).thenReturn(List.of(seat1, seat2));

        venueService.deleteVenue(8L);

        assertThat(venue.isDeleted()).isTrue();
        assertThat(seat1.getIsActive()).isFalse();
        assertThat(seat2.getIsActive()).isFalse();
        verify(seatRepository).saveAll(List.of(seat1, seat2));
        verify(venueRepository).save(venue);
    }

    @Test
    void deleteVenueThrowsWhenActiveRelatedEventExists() {
        Venue venue = buildVenue(9L, "Busy Venue", "Madrid", SeatingType.GENERAL, 300);
        when(venueRepository.findById(9L)).thenReturn(Optional.of(venue));
        when(eventOccurrenceRepository.existsActiveByVenueId(9L)).thenReturn(true);

        assertThatThrownBy(() -> venueService.deleteVenue(9L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Venue cannot be deleted while it has active related events.");

        assertThat(venue.isDeleted()).isFalse();
        verify(venueRepository, never()).save(any(Venue.class));
    }

    @Test
    void deleteVenueNoopWhenAlreadyDeleted() {
        Venue venue = buildVenue(10L, "Archived Venue", "Lisbon", SeatingType.GENERAL, 150);
        venue.setDeleted(true);
        when(venueRepository.findById(10L)).thenReturn(Optional.of(venue));

        venueService.deleteVenue(10L);

        verify(eventOccurrenceRepository, never()).existsActiveByVenueId(any(Long.class));
        verify(venueRepository, never()).save(any(Venue.class));
    }

    @Test
    void isVenueDeletableShouldReturnFalseWhenFutureNonCancelledOccurrenceExists() {
        when(eventOccurrenceRepository.existsActiveByVenueId(77L)).thenReturn(true);

        boolean deletable = venueService.isVenueDeletable(77L);

        assertThat(deletable).isFalse();
        verify(eventOccurrenceRepository).existsActiveByVenueId(77L);
    }

    @Test
    void isVenueDeletableShouldReturnTrueWhenNoActiveFutureOccurrencesExist() {
        when(eventOccurrenceRepository.existsActiveByVenueId(78L)).thenReturn(false);

        boolean deletable = venueService.isVenueDeletable(78L);

        assertThat(deletable).isTrue();
        verify(eventOccurrenceRepository).existsActiveByVenueId(78L);
    }

    @Test
    void getAllVenuesExcludesDeletedVenues() {
        Venue active = buildVenue(11L, "Active Venue", "Berlin", SeatingType.GENERAL, 220);
        when(venueRepository.findByIsDeletedFalse()).thenReturn(List.of(active));

        List<VenueDto> result = venueService.getAllVenues();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(11L);
    }
}
