package com.ticketwave.repository;

import com.ticketwave.entity.Order;
import com.ticketwave.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Order listing and financial aggregates for dashboards and reports. */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o WHERE o.status = 'COMPLETED'")
    BigDecimal sumTotalSales();

    @Query("SELECT COALESCE(SUM(o.totalTickets), 0) FROM Order o WHERE o.status = 'COMPLETED'")
    Long sumTicketsSold();

    @Query("""
            SELECT COALESCE(SUM(o.totalPrice), 0)
            FROM Order o
            WHERE o.status = 'COMPLETED'
              AND o.createdAt >= :start
              AND o.createdAt < :end
            """)
    BigDecimal sumTotalSalesBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("""
            SELECT COALESCE(SUM(o.totalTickets), 0)
            FROM Order o
            WHERE o.status = 'COMPLETED'
              AND o.createdAt >= :start
              AND o.createdAt < :end
            """)
    Long sumTicketsSoldBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("""
            SELECT COALESCE(SUM(o.totalPrice), 0)
            FROM Order o
            WHERE o.status = 'COMPLETED'
              AND o.eventOccurrence.id = :occurrenceId
            """)
    BigDecimal sumCompletedSalesByOccurrenceId(@Param("occurrenceId") Long occurrenceId);

    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.user
            LEFT JOIN FETCH o.eventOccurrence eo
            LEFT JOIN FETCH eo.event
            WHERE o.status = 'COMPLETED'
            ORDER BY o.createdAt ASC
            """)
    List<Order> findAllCompletedWithDetails();

    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.user
            LEFT JOIN FETCH o.eventOccurrence eo
            LEFT JOIN FETCH eo.event
            ORDER BY o.createdAt DESC
            """)
    List<Order> findRecentWithDetails(org.springframework.data.domain.Pageable pageable);

    long countByEventOccurrenceIdAndStatus(Long occurrenceId, OrderStatus status);
}
