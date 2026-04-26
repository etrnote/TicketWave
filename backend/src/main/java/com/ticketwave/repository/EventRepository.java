package com.ticketwave.repository;

import com.ticketwave.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/** Event catalog and filter queries (category, city, name). */
@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT DISTINCT e.category FROM Event e WHERE e.isDeleted = false ORDER BY e.category")
    List<String> findDistinctCategories();

    List<Event> findByIsDeletedFalse();

    Optional<Event> findByIdAndIsDeletedFalse(Long id);

    @Query(value = "SELECT e.* FROM events e " +
           "WHERE e.is_deleted = false AND " +
           "(CAST(:category AS TEXT) IS NULL OR LOWER(e.category) = LOWER(CAST(:category AS TEXT))) AND " +
           "(CAST(:genre AS TEXT) IS NULL OR LOWER(e.genre) = LOWER(CAST(:genre AS TEXT))) AND " +
           "(CAST(:name AS TEXT) IS NULL OR LOWER(e.title) LIKE LOWER('%' || CAST(:name AS TEXT) || '%')) AND " +
           "(CAST(:city AS TEXT) IS NULL OR EXISTS (" +
           "SELECT 1 FROM event_occurrences eo " +
           "JOIN venues v ON eo.venue_id = v.id " +
           "WHERE eo.event_id = e.id AND LOWER(v.city) = LOWER(CAST(:city AS TEXT))))",
           nativeQuery = true)
    List<Event> findByFilters(@Param("category") String category,
                              @Param("genre") String genre,
                              @Param("name") String name,
                              @Param("city") String city);

}

