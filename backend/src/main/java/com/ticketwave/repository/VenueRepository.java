package com.ticketwave.repository;

import com.ticketwave.entity.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Venues: general or reserved layout metadata. */
@Repository
public interface VenueRepository extends JpaRepository<Venue, Long> {
    List<Venue> findByIsDeletedFalse();
}

