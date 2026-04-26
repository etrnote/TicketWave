package com.ticketwave.repository;

import com.ticketwave.entity.EventOccurrence;
import com.ticketwave.entity.EventOccurrenceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/** Event showtimes at a venue, overlap checks, and price aggregates. */
@Repository
public interface EventOccurrenceRepository extends JpaRepository<EventOccurrence, Long> {

    @Query("SELECT o.event.id, COUNT(o) FROM EventOccurrence o GROUP BY o.event.id")
    List<Object[]> countOccurrencesGroupedByEventId();

    List<EventOccurrence> findByEventId(Long eventId);

    List<EventOccurrence> findByEventIdAndStatusNot(Long eventId, EventOccurrenceStatus status);

    /**
     * Pessimistic-write lock on the occurrence row, used to serialize concurrent seat-lock
     * attempts so only one caller can win for a given seat.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM EventOccurrence o WHERE o.id = :id")
    Optional<EventOccurrence> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT o FROM EventOccurrence o WHERE o.venue.id = :venueId AND o.status != 'CANCELLED' AND o.event.isDeleted = false AND o.startTime < :endTime AND o.startTime > :startTime")
    List<EventOccurrence> findOverlapping(@Param("venueId") Long venueId,
                                          @Param("startTime") OffsetDateTime startTime,
                                          @Param("endTime") OffsetDateTime endTime);

    @Query("SELECT o FROM EventOccurrence o WHERE o.status = 'SCHEDULED' AND o.startTime > CURRENT_TIMESTAMP AND o.event.isDeleted = false ORDER BY o.startTime")
    List<EventOccurrence> findFutureScheduled();

    @Query("SELECT COUNT(o) > 0 FROM EventOccurrence o WHERE o.venue.id = :venueId AND o.status != 'CANCELLED' AND o.startTime > CURRENT_TIMESTAMP")
    boolean existsUpcomingByVenueId(@Param("venueId") Long venueId);

    @Query("SELECT COUNT(o) > 0 FROM EventOccurrence o " +
            "WHERE o.venue.id = :venueId " +
            "AND o.event.isDeleted = false " +
            "AND o.status <> 'CANCELLED' " +
            "AND o.startTime > CURRENT_TIMESTAMP")
    boolean existsActiveByVenueId(@Param("venueId") Long venueId);

    @Query("SELECT MIN(o.price) FROM EventOccurrence o WHERE o.event.id = :eventId AND o.status != 'CANCELLED'")
    BigDecimal findMinPriceByEventId(@Param("eventId") Long eventId);
}

