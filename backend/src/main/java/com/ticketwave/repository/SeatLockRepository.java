package com.ticketwave.repository;

import com.ticketwave.entity.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;

/** Time-boxed holds on general capacity or specific seats, plus bulk delete helpers. */
@Repository
public interface SeatLockRepository extends JpaRepository<SeatLock, Long> {

    List<SeatLock> findByExpiresAtBefore(OffsetDateTime now);
    List<SeatLock> findByEventOccurrenceIdAndExpiresAtBefore(Long occurrenceId, OffsetDateTime now);

    List<SeatLock> findByEventOccurrenceId(Long occurrenceId);

    List<SeatLock> findByEventOccurrenceIdAndSeatIsNotNull(Long occurrenceId);

    @Query("SELECT s FROM SeatLock s WHERE s.eventOccurrence.id = :occurrenceId AND s.seat.id IN :seatIds AND s.expiresAt > :now")
    List<SeatLock> findActiveLocksForSeats(@Param("occurrenceId") Long occurrenceId,
                                           @Param("seatIds") List<Long> seatIds,
                                           @Param("now") OffsetDateTime now);

    @Query("SELECT s.seat.id FROM SeatLock s WHERE s.eventOccurrence.id = :occurrenceId AND s.seat IS NOT NULL AND s.user.userId = :userId AND s.expiresAt > :now")
    List<Long> findActiveSeatIdsByOccurrenceAndUserId(@Param("occurrenceId") Long occurrenceId,
                                                      @Param("userId") Long userId,
                                                      @Param("now") OffsetDateTime now);

    @Query("SELECT s FROM SeatLock s WHERE s.eventOccurrence.id = :occurrenceId AND s.seat IS NOT NULL AND s.user.userId = :userId AND s.expiresAt > :now")
    List<SeatLock> findActiveReservedLocksForUser(@Param("occurrenceId") Long occurrenceId,
                                                   @Param("userId") Long userId,
                                                   @Param("now") OffsetDateTime now);

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.quantity IS NOT NULL THEN s.quantity ELSE 1 END), 0)
            FROM SeatLock s
            WHERE s.eventOccurrence.id = :occurrenceId
              AND s.expiresAt > :now
            """)
    long sumActiveLockedCount(@Param("occurrenceId") Long occurrenceId, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.seat.id IN :seatIds")
    void deleteBySeatIdIn(@Param("seatIds") List<Long> seatIds);

    @Modifying
    @Query("""
            DELETE FROM SeatLock sl
            WHERE sl.eventOccurrence.id = :occurrenceId
              AND sl.user.userId = :userId
              AND sl.seat IS NOT NULL
              AND sl.seat.id IN :seatIds
            """)
    int deleteUserReservedLocks(@Param("occurrenceId") Long occurrenceId,
                                @Param("userId") Long userId,
                                @Param("seatIds") List<Long> seatIds);

    @Modifying
    @Query("""
            DELETE FROM SeatLock sl
            WHERE sl.eventOccurrence.id = :occurrenceId
              AND sl.expiresAt < :now
            """)
    int deleteExpiredLocksByOccurrence(@Param("occurrenceId") Long occurrenceId,
                                       @Param("now") OffsetDateTime now);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.eventOccurrence.id = :occurrenceId AND sl.user.userId = :userId")
    int deleteByOccurrenceAndUser(@Param("occurrenceId") Long occurrenceId, @Param("userId") Long userId);
}
