package com.ticketwave.service;

import com.ticketwave.entity.Event;
import com.ticketwave.entity.EventOccurrence;
import com.ticketwave.entity.Venue;
import com.ticketwave.repository.EventOccurrenceRepository;
import com.ticketwave.repository.OrderRepository;
import com.ticketwave.repository.TicketRepository;
import com.ticketwave.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock
    private EventOccurrenceRepository occurrenceRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminDashboardService adminDashboardService;

    @Test
    void getOccurrenceStatsShouldIncludeSalesAmount() {
        Event event = new Event();
        event.setTitle("Jazz Night");

        Venue venue = new Venue();
        venue.setName("Main Hall");
        venue.setCapacity(200);

        EventOccurrence occurrence = new EventOccurrence();
        occurrence.setId(10L);
        occurrence.setEvent(event);
        occurrence.setVenue(venue);
        occurrence.setStartTime(OffsetDateTime.parse("2026-05-10T19:00:00Z"));

        when(occurrenceRepository.findFutureScheduled()).thenReturn(List.of(occurrence));
        when(ticketRepository.findByOrderEventOccurrenceId(10L)).thenReturn(List.of(new com.ticketwave.entity.Ticket(), new com.ticketwave.entity.Ticket()));
        when(orderRepository.sumCompletedSalesByOccurrenceId(10L)).thenReturn(BigDecimal.valueOf(320));

        List<Map<String, Object>> stats = adminDashboardService.getOccurrenceStats();

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0)).containsEntry("salesAmount", BigDecimal.valueOf(320));
        assertThat(stats.get(0)).containsEntry("ticketsSold", 2);
    }

    @Test
    void getDashboardKpisShouldIncludeChangePercentages() {
        when(orderRepository.sumTotalSales()).thenReturn(BigDecimal.valueOf(5000));
        when(orderRepository.sumTicketsSold()).thenReturn(250L);
        when(userRepository.count()).thenReturn(80L);

        when(orderRepository.sumTotalSalesBetween(any(), any())).thenReturn(BigDecimal.valueOf(3000), BigDecimal.valueOf(2000));
        when(orderRepository.sumTicketsSoldBetween(any(), any())).thenReturn(150L, 100L);
        when(userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(any(), any())).thenReturn(30L, 20L);

        Map<String, Object> kpis = adminDashboardService.getDashboardKpis();

        assertThat(kpis).containsEntry("totalSales", BigDecimal.valueOf(5000));
        assertThat(kpis).containsEntry("ticketsSold", 250L);
        assertThat(kpis).containsEntry("activeUsers", 80L);
        assertThat(kpis).containsEntry("totalSalesChangePct", BigDecimal.valueOf(50.0));
        assertThat(kpis).containsEntry("ticketsSoldChangePct", BigDecimal.valueOf(50.0));
        assertThat(kpis).containsEntry("activeUsersChangePct", BigDecimal.valueOf(50.0));
    }
}
