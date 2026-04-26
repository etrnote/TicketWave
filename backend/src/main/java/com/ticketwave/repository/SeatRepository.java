package com.ticketwave.repository;

import com.ticketwave.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Physical seats in a reserved-seating venue. */
@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByVenueId(Long venueId);

    @Modifying
    @Query("DELETE FROM Seat s WHERE s.venue.id = :venueId")
    void deleteAllByVenueId(@Param("venueId") Long venueId);
}

