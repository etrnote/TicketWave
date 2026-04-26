package com.ticketwave.repository;

import com.ticketwave.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** {@link com.ticketwave.entity.Ticket} persistence: orders, seat linkage, and reporting helpers. */
@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByOrderId(Long orderId);

    List<Ticket> findByOrderIdAndOrderUserUserId(Long orderId, Long userId);

    List<Ticket> findByOrderUserUserId(Long userId);

    Optional<Ticket> findByIdAndOrderUserUserId(Long ticketId, Long userId);

    List<Ticket> findByOrderEventOccurrenceId(Long occurrenceId);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.occurrence.id = :occurrenceId AND t.isValid = true")
    long countValidByOccurrenceId(@Param("occurrenceId") Long occurrenceId);

    @Query("SELECT t FROM Ticket t WHERE t.occurrence.id = :occurrenceId AND t.seat.id IN :seatIds AND t.isValid = true")
    List<Ticket> findValidTicketsForSeats(@Param("occurrenceId") Long occurrenceId,
                                          @Param("seatIds") List<Long> seatIds);

    @Modifying
    @Query("UPDATE Ticket t SET t.seat = null WHERE t.seat.id IN :seatIds")
    void clearSeatBySeatIdIn(@Param("seatIds") List<Long> seatIds);

    @Query("SELECT t FROM Ticket t WHERE t.seat.id = :seatId AND t.isValid = true AND t.occurrence.status != 'CANCELLED' AND t.occurrence.startTime > CURRENT_TIMESTAMP")
    List<Ticket> findBlockingTicketsForSeat(@Param("seatId") Long seatId);
}
