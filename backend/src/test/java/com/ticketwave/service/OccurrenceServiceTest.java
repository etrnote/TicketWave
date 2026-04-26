package com.ticketwave.service;

import com.ticketwave.dto.SeatLockRequest;
import com.ticketwave.entity.EventOccurrence;
import com.ticketwave.entity.Seat;
import com.ticketwave.entity.SeatLock;
import com.ticketwave.entity.SeatingType;
import com.ticketwave.entity.Ticket;
import com.ticketwave.entity.User;
import com.ticketwave.entity.Venue;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.SeatLockRepository;
import com.ticketwave.repository.SeatRepository;
import com.ticketwave.repository.TicketRepository;
import com.ticketwave.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jms.core.JmsOperations;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OccurrenceServiceTest {

    @Mock
    private EventOccurrenceRepository occurrenceRepository;

    @Mock
    private SeatRepository seatRepository;

    @Mock
    private SeatLockRepository seatLockRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JmsOperations jmsTemplate;

    @Mock
    private SeatLockSseService seatLockSseService;

    @InjectMocks
    private OccurrenceService occurrenceService;

    @Test
    void getSeatsShouldReturnCapacityStatsForGeneralSeating() {
        Long occurrenceId = 1L;

        Venue venue = new Venue();
        venue.setId(10L);
        venue.setSeatingType(SeatingType.GENERAL);
        venue.setCapacity(10);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(occurrenceId);
        occurrence.setVenue(venue);
        occurrence.setPrice(BigDecimal.valueOf(45));

        SeatLock lock = new SeatLock();
        lock.setQuantity(2);

        when(occurrenceRepository.findById(occurrenceId)).thenReturn(Optional.of(occurrence));
        Ticket t1 = new Ticket(); t1.setIsValid(true);
        Ticket t2 = new Ticket(); t2.setIsValid(true);
        Ticket t3 = new Ticket(); t3.setIsValid(true);
        when(ticketRepository.findByOrderEventOccurrenceId(occurrenceId))
                .thenReturn(List.of(t1, t2, t3));
        when(seatLockRepository.findByEventOccurrenceId(occurrenceId)).thenReturn(List.of(lock));

        Map<String, Object> result = occurrenceService.getSeats(occurrenceId, null);

        assertThat(result.get("occurrenceId")).isEqualTo(1L);
        assertThat(result.get("seatingType")).isEqualTo("GENERAL");
        assertThat(result.get("totalCapacity")).isEqualTo(10);
        assertThat(result.get("sold")).isEqualTo(3);
        assertThat(result.get("locked")).isEqualTo(2);
        assertThat(result.get("available")).isEqualTo(5);
    }

    @Test
    void getSeatsShouldReturnSeatStatusForReservedSeating() {
        Long occurrenceId = 2L;

        Venue venue = new Venue();
        venue.setId(20L);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(occurrenceId);
        occurrence.setVenue(venue);
        occurrence.setPrice(BigDecimal.valueOf(60));

        Seat seat1 = new Seat();
        seat1.setId(1L);
        seat1.setRowNumber(1);
        seat1.setSeatNumber(1);

        Seat seat2 = new Seat();
        seat2.setId(2L);
        seat2.setRowNumber(1);
        seat2.setSeatNumber(2);

        Seat seat3 = new Seat();
        seat3.setId(3L);
        seat3.setRowNumber(1);
        seat3.setSeatNumber(3);

        Ticket soldTicket = new Ticket();
        soldTicket.setIsValid(true);
        soldTicket.setSeat(seat1);

        SeatLock lockedSeat = new SeatLock();
        lockedSeat.setSeat(seat2);

        when(occurrenceRepository.findById(occurrenceId)).thenReturn(Optional.of(occurrence));
        when(seatRepository.findByVenueId(20L)).thenReturn(List.of(seat1, seat2, seat3));
        when(ticketRepository.findByOrderEventOccurrenceId(occurrenceId)).thenReturn(List.of(soldTicket));
        when(seatLockRepository.findByEventOccurrenceIdAndSeatIsNotNull(occurrenceId)).thenReturn(List.of(lockedSeat));

        Map<String, Object> result = occurrenceService.getSeats(occurrenceId, null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> seats = (List<Map<String, Object>>) result.get("seats");

        assertThat(seats).hasSize(3);
        assertThat(seats.get(0).get("status")).isEqualTo("SOLD");
        assertThat(seats.get(1).get("status")).isEqualTo("LOCKED");
        assertThat(seats.get(2).get("status")).isEqualTo("AVAILABLE");
    }

    @Test
    void getSeatsShouldNotCountCancelledOrInvalidTicketsAsSold() {
        Long occurrenceId = 3L;

        Venue venue = new Venue();
        venue.setId(30L);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(occurrenceId);
        occurrence.setVenue(venue);
        occurrence.setPrice(BigDecimal.valueOf(50));

        Seat seat1 = new Seat();
        seat1.setId(1L);
        seat1.setRowNumber(1);
        seat1.setSeatNumber(1);

        Ticket cancelledTicket = new Ticket();
        cancelledTicket.setIsValid(false);
        cancelledTicket.setSeat(seat1);

        when(occurrenceRepository.findById(occurrenceId)).thenReturn(Optional.of(occurrence));
        when(seatRepository.findByVenueId(30L)).thenReturn(List.of(seat1));
        when(ticketRepository.findByOrderEventOccurrenceId(occurrenceId)).thenReturn(List.of(cancelledTicket));
        when(seatLockRepository.findByEventOccurrenceIdAndSeatIsNotNull(occurrenceId)).thenReturn(List.of());

        Map<String, Object> result = occurrenceService.getSeats(occurrenceId, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> seats = (List<Map<String, Object>>) result.get("seats");
        assertThat(seats.get(0).get("status")).isEqualTo("AVAILABLE");
    }

    @Test
    void lockSeatsReservedShouldPersistLocksAndPublishSse() {
        Venue venue = new Venue();
        venue.setId(20L);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(7L);
        occurrence.setVenue(venue);

        User user = new User();
        user.setUserId(42L);

        Seat s4 = new Seat(); s4.setId(4L); s4.setRowNumber(1); s4.setSeatNumber(1);
        Seat s5 = new Seat(); s5.setId(5L); s5.setRowNumber(1); s5.setSeatNumber(2);

        when(occurrenceRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(occurrence));
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(seatRepository.findAllById(List.of(4L, 5L))).thenReturn(List.of(s4, s5));
        when(seatLockRepository.findActiveReservedLocksForUser(eq(7L), eq(42L), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        when(seatLockRepository.findActiveLocksForSeats(eq(7L), eq(List.of(4L, 5L)), any(OffsetDateTime.class)))
                .thenReturn(List.of());

        ArgumentCaptor<SeatLock> savedCaptor = ArgumentCaptor.forClass(SeatLock.class);
        when(seatLockRepository.save(savedCaptor.capture())).thenAnswer(inv -> {
            SeatLock l = inv.getArgument(0);
            l.setId(savedCaptor.getAllValues().size() == 1 ? 100L : 101L);
            return l;
        });

        SeatLockRequest request = new SeatLockRequest();
        request.setSeatIds(List.of(4L, 5L));

        List<Long> lockIds = occurrenceService.lockSeats(7L, request, 42L);

        assertThat(lockIds).containsExactly(100L, 101L);
        verify(seatLockSseService).publishSeatLockUpdate(eq(7L), any(), eq("SUCCESS"), eq("LOCKED"));
    }

    @Test
    void lockSeatsReservedShouldRejectWhenSeatHeldByAnotherUser() {
        Venue venue = new Venue();
        venue.setId(20L);
        venue.setSeatingType(SeatingType.RESERVED);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(7L);
        occurrence.setVenue(venue);

        User caller = new User(); caller.setUserId(42L);
        User other = new User(); other.setUserId(99L);

        Seat seat = new Seat(); seat.setId(4L); seat.setRowNumber(2); seat.setSeatNumber(3);

        SeatLock othersLock = new SeatLock();
        othersLock.setId(500L);
        othersLock.setSeat(seat);
        othersLock.setUser(other);

        when(occurrenceRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(occurrence));
        when(userRepository.findById(42L)).thenReturn(Optional.of(caller));
        when(seatRepository.findAllById(List.of(4L))).thenReturn(List.of(seat));
        when(seatLockRepository.findActiveReservedLocksForUser(eq(7L), eq(42L), any(OffsetDateTime.class)))
                .thenReturn(List.of());
        when(seatLockRepository.findActiveLocksForSeats(eq(7L), eq(List.of(4L)), any(OffsetDateTime.class)))
                .thenReturn(List.of(othersLock));

        SeatLockRequest request = new SeatLockRequest();
        request.setSeatIds(List.of(4L));

        assertThatThrownBy(() -> occurrenceService.lockSeats(7L, request, 42L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no longer available");

        verify(seatLockRepository, never()).save(any());
        verify(seatLockSseService, never()).publishSeatLockUpdate(anyLong(), any(), any(), any());
    }

    @Test
    void lockSeatsGeneralShouldPersistQuantityLock() {
        Venue venue = new Venue();
        venue.setId(20L);
        venue.setSeatingType(SeatingType.GENERAL);
        venue.setCapacity(100);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(8L);
        occurrence.setVenue(venue);

        User user = new User();
        user.setUserId(42L);

        when(occurrenceRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(occurrence));
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(seatLockRepository.save(any(SeatLock.class))).thenAnswer(inv -> {
            SeatLock l = inv.getArgument(0);
            l.setId(200L);
            return l;
        });

        SeatLockRequest request = new SeatLockRequest();
        request.setQuantity(3);

        List<Long> lockIds = occurrenceService.lockSeats(8L, request, 42L);

        assertThat(lockIds).containsExactly(200L);
        verify(seatLockSseService).publishSeatLockUpdate(eq(8L), any(), eq("SUCCESS"), eq("LOCKED"));
    }

    @Test
    void freeLocksAsyncShouldPublishUnselectMessage() {
        SeatLockRequest req = new SeatLockRequest();
        req.setSeatIds(List.of(1L, 2L));

        occurrenceService.freeLocksAsync(9L, req.getSeatIds(), 42L);

        verify(jmsTemplate).convertAndSend(eq("seat.lock.free.requests"), any(Object.class));
    }

    @Test
    void freeLocksAsyncShouldNoOpWhenNoSeatIds() {
        occurrenceService.freeLocksAsync(9L, List.of(), 42L);
        verify(jmsTemplate, never()).convertAndSend(any(String.class), anyList());
    }
}
