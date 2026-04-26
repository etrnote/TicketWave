package com.ticketwave.service;

import com.ticketwave.entity.*;
import com.ticketwave.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregated KPIs, time-windowed insights, and per-occurrence admin stats.
 */
@Service
public class AdminDashboardService {

    private static final int DASHBOARD_TREND_WINDOW_DAYS = 30;
    private static final int INSIGHTS_SHORT_RANGE_DAYS = 7;
    private static final int INSIGHTS_MEDIUM_RANGE_DAYS = 30;
    private static final int RECENT_ORDERS_PAGE_SIZE = 5;
    private static final int TOP_EVENTS_LIMIT = 6;
    private static final double OCCUPANCY_PERCENT_SCALE = 10.0;

    private static final String DEFAULT_CHART_EVENT_TITLE = "Untitled";
    private static final String DEFAULT_CHART_CATEGORY = "Other";

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("MMM yyyy");

    private final EventOccurrenceRepository occurrenceRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    public AdminDashboardService(EventOccurrenceRepository occurrenceRepository, OrderRepository orderRepository,
                                 TicketRepository ticketRepository, UserRepository userRepository) {
        this.occurrenceRepository = occurrenceRepository;
        this.orderRepository = orderRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> getOccurrenceStats() {
        List<EventOccurrence> occurrences = occurrenceRepository.findFutureScheduled();
        List<Map<String, Object>> result = new ArrayList<>();
        for (EventOccurrence occ : occurrences) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("occurrenceId", occ.getId());
            stat.put("eventId", occ.getEvent().getId());
            stat.put("eventTitle", occ.getEvent().getTitle());
            stat.put("startTime", occ.getStartTime());
            stat.put("venueName", occ.getVenue().getName());
            int capacity = occ.getVenue().getCapacity() != null ? occ.getVenue().getCapacity() : 0;
            List<Ticket> tickets = ticketRepository.findByOrderEventOccurrenceId(occ.getId());
            int sold = tickets.size();
            double pct = capacity > 0 ? (sold * 100.0 / capacity) : 0;
            BigDecimal salesAmount = orderRepository.sumCompletedSalesByOccurrenceId(occ.getId());
            stat.put("totalCapacity", capacity);
            stat.put("ticketsSold", sold);
            stat.put("salesAmount", salesAmount);
            stat.put("occupancyPercentage", Math.round(pct * OCCUPANCY_PERCENT_SCALE) / OCCUPANCY_PERCENT_SCALE);
            result.add(stat);
        }
        return result;
    }

    public Map<String, Object> getDashboardKpis() {
        BigDecimal totalSales = orderRepository.sumTotalSales();
        Long ticketsSold = orderRepository.sumTicketsSold();
        long activeUsers = userRepository.count();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime currentStart = now.minusDays(DASHBOARD_TREND_WINDOW_DAYS);
        OffsetDateTime previousStart = currentStart.minusDays(DASHBOARD_TREND_WINDOW_DAYS);

        BigDecimal currentSales = orderRepository.sumTotalSalesBetween(currentStart, now);
        BigDecimal previousSales = orderRepository.sumTotalSalesBetween(previousStart, currentStart);

        long currentTickets = Optional.ofNullable(orderRepository.sumTicketsSoldBetween(currentStart, now)).orElse(0L);
        long previousTickets = Optional.ofNullable(orderRepository.sumTicketsSoldBetween(previousStart, currentStart)).orElse(0L);

        long currentActiveUsers = userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(currentStart, now);
        long previousActiveUsers = userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(previousStart, currentStart);

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalSales", totalSales);
        kpis.put("ticketsSold", ticketsSold);
        kpis.put("activeUsers", activeUsers);
        kpis.put("totalSalesChangePct", percentageChange(currentSales, previousSales));
        kpis.put("ticketsSoldChangePct", percentageChange(currentTickets, previousTickets));
        kpis.put("activeUsersChangePct", percentageChange(currentActiveUsers, previousActiveUsers));
        return kpis;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInsights() {
        List<Order> orders = orderRepository.findAllCompletedWithDetails();
        OffsetDateTime now = OffsetDateTime.now();
        long totalUsers = userRepository.count();

        Map<String, Object> ranges = new LinkedHashMap<>();
        ranges.put("7", buildRange(orders, now, INSIGHTS_SHORT_RANGE_DAYS, totalUsers));
        ranges.put("30", buildRange(orders, now, INSIGHTS_MEDIUM_RANGE_DAYS, totalUsers));
        ranges.put("all", buildRange(orders, now, null, totalUsers));

        List<Order> recent = orderRepository.findRecentWithDetails(PageRequest.of(0, RECENT_ORDERS_PAGE_SIZE));
        List<Map<String, Object>> recentOrders = recent.stream().map(this::toRecentOrder).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ranges", ranges);
        result.put("recentOrders", recentOrders);
        result.put("generatedAt", now);
        return result;
    }

    private BigDecimal sumSales(List<Order> orders) {
        return orders.stream().map(Order::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long sumTickets(List<Order> orders) {
        return orders.stream().mapToLong(this::getTicketCount).sum();
    }

    private long getTicketCount(Order o) {
        return o.getTotalTickets() == null ? 0L : o.getTotalTickets().longValue();
    }

    private Map<String, Object> buildRange(List<Order> allCompleted, OffsetDateTime now, Integer days, long totalUsers) {
        OffsetDateTime start = days == null ? null : now.minusDays(days);
        OffsetDateTime prevStart = days == null ? null : start.minusDays(days);

        List<Order> inRange = days == null
                ? allCompleted
                : allCompleted.stream().filter(o -> !o.getCreatedAt().isBefore(start) && o.getCreatedAt().isBefore(now)).toList();

        BigDecimal sales = sumSales(inRange);
        long tickets = sumTickets(inRange);
        long ordersCount = inRange.size();

        long newUsers;
        if (days == null) {
            newUsers = totalUsers;
        } else {
            newUsers = userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, now);
        }

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("totalSales", sales);
        kpis.put("ticketsSold", tickets);
        kpis.put("ordersCount", ordersCount);
        kpis.put("newUsers", newUsers);

        if (days != null) {
            List<Order> prev = allCompleted.stream()
                    .filter(o -> !o.getCreatedAt().isBefore(prevStart) && o.getCreatedAt().isBefore(start)).toList();
            BigDecimal prevSales = sumSales(prev);
            long prevTickets = sumTickets(prev);
            long prevOrders = prev.size();
            long prevNewUsers = userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(prevStart, start);

            kpis.put("totalSalesChangePct", percentageChange(sales, prevSales));
            kpis.put("ticketsSoldChangePct", percentageChange(tickets, prevTickets));
            kpis.put("ordersCountChangePct", percentageChange(ordersCount, prevOrders));
            kpis.put("newUsersChangePct", percentageChange(newUsers, prevNewUsers));
        } else {
            kpis.put("totalSalesChangePct", null);
            kpis.put("ticketsSoldChangePct", null);
            kpis.put("ordersCountChangePct", null);
            kpis.put("newUsersChangePct", null);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kpis", kpis);
        result.put("salesSeries", buildSalesSeries(inRange, now, days));
        result.put("topEvents", buildTopEvents(inRange));
        result.put("categoryBreakdown", buildCategoryBreakdown(inRange));
        result.put("seriesGranularity", days == null ? "month" : "day");
        return result;
    }

    private List<Map<String, Object>> buildSalesSeries(List<Order> orders, OffsetDateTime now, Integer days) {
        List<Map<String, Object>> series = new ArrayList<>();
        if (days != null) {
            Map<LocalDate, BigDecimal> salesByDay = new HashMap<>();
            Map<LocalDate, Long> ticketsByDay = new HashMap<>();
            for (Order o : orders) {
                LocalDate d = o.getCreatedAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
                salesByDay.merge(d, o.getTotalPrice(), BigDecimal::add);
                ticketsByDay.merge(d, getTicketCount(o), Long::sum);
            }
            LocalDate today = now.atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
            for (int i = days - 1; i >= 0; i--) {
                LocalDate day = today.minusDays(i);
                Map<String, Object> bin = new LinkedHashMap<>();
                bin.put("label", day.format(DAY_FMT));
                bin.put("date", day.toString());
                bin.put("sales", salesByDay.getOrDefault(day, BigDecimal.ZERO));
                bin.put("tickets", ticketsByDay.getOrDefault(day, 0L));
                series.add(bin);
            }
            return series;
        }

        if (orders.isEmpty()) return series;
        Map<YearMonth, BigDecimal> salesByMonth = new HashMap<>();
        Map<YearMonth, Long> ticketsByMonth = new HashMap<>();
        for (Order o : orders) {
            YearMonth ym = YearMonth.from(o.getCreatedAt().atZoneSameInstant(ZoneOffset.UTC));
            salesByMonth.merge(ym, o.getTotalPrice(), BigDecimal::add);
            ticketsByMonth.merge(ym, getTicketCount(o), Long::sum);
        }
        YearMonth firstMonth = YearMonth.from(orders.get(0).getCreatedAt().atZoneSameInstant(ZoneOffset.UTC));
        YearMonth lastMonth = YearMonth.from(now.atZoneSameInstant(ZoneOffset.UTC));
        for (YearMonth ym = firstMonth; !ym.isAfter(lastMonth); ym = ym.plusMonths(1)) {
            Map<String, Object> bin = new LinkedHashMap<>();
            bin.put("label", ym.format(MONTH_FMT));
            bin.put("date", ym.toString());
            bin.put("sales", salesByMonth.getOrDefault(ym, BigDecimal.ZERO));
            bin.put("tickets", ticketsByMonth.getOrDefault(ym, 0L));
            series.add(bin);
        }
        return series;
    }

    private Event getEventSafe(Order o) {
        return o.getEventOccurrence() != null ? o.getEventOccurrence().getEvent() : null;
    }

    private String getEventTitle(Order o) {
        Event e = getEventSafe(o);
        return e != null && e.getTitle() != null ? e.getTitle() : DEFAULT_CHART_EVENT_TITLE;
    }

    private String getEventCategory(Order o) {
        Event e = getEventSafe(o);
        return e != null && e.getCategory() != null ? e.getCategory() : DEFAULT_CHART_CATEGORY;
    }

    private List<Map<String, Object>> buildTopEvents(List<Order> orders) {
        Map<String, BigDecimal> sales = new HashMap<>();
        Map<String, Long> tickets = new HashMap<>();
        for (Order o : orders) {
            String title = getEventTitle(o);
            sales.merge(title, o.getTotalPrice(), BigDecimal::add);
            tickets.merge(title, getTicketCount(o), Long::sum);
        }
        return sales.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(TOP_EVENTS_LIMIT)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("label", e.getKey());
                    m.put("sales", e.getValue());
                    m.put("tickets", tickets.getOrDefault(e.getKey(), 0L));
                    m.put("value", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildCategoryBreakdown(List<Order> orders) {
        Map<String, BigDecimal> sales = new HashMap<>();
        for (Order o : orders) {
            String category = getEventCategory(o);
            sales.merge(category, o.getTotalPrice(), BigDecimal::add);
        }
        return sales.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("label", e.getKey());
                    m.put("value", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> toRecentOrder(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("totalTickets", o.getTotalTickets());
        m.put("totalPrice", o.getTotalPrice());
        m.put("status", o.getStatus().name());
        m.put("createdAt", o.getCreatedAt());
        if (o.getUser() != null) {
            m.put("userId", o.getUser().getUserId());
            m.put("userName", o.getUser().getName());
            m.put("userEmail", o.getUser().getEmail());
        }
        if (o.getEventOccurrence() != null) {
            m.put("occurrenceId", o.getEventOccurrence().getId());
            Event e = getEventSafe(o);
            if (e != null && e.getTitle() != null) {
                m.put("eventTitle", e.getTitle());
            }
        }
        return m;
    }

    private BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(100) : BigDecimal.ZERO;
        }
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    private BigDecimal percentageChange(long current, long previous) {
        return percentageChange(BigDecimal.valueOf(current), BigDecimal.valueOf(previous));
    }
}
