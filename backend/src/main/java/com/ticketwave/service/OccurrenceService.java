package com.ticketwave.service;

import com.ticketwave.dto.SeatLockFreeAsyncMessage;
import com.ticketwave.dto.SeatLockRequest;
import com.ticketwave.entity.*;
import com.ticketwave.messaging.MessagingConstants;
import com.ticketwave.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Per-occurrence seat snapshots, synchronous seat locking, and async release.
 *
 * <p>Locks are taken inside a transaction guarded by a pessimistic write on the
 * {@link EventOccurrence} row, so concurrent attempts on the same occurrence
 * serialize and only the first caller can hold a given seat. SSE updates are
 * fired only after the transaction commits, so other browsers see the new
 * state immediately and consistently.</p>
 */
@Service
public class OccurrenceService {

    private static final Logger log = LoggerFactory.getLogger(OccurrenceService.class);

    private final EventOccurrenceRepository occurrenceRepository;
    private final SeatRepository seatRepository;
    private final SeatLockRepository seatLockRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final JmsOperations jmsTemplate;
    private final SeatLockSseService seatLockSseService;

    public OccurrenceService(EventOccurrenceRepository occurrenceRepository, SeatRepository seatRepository,
                             SeatLockRepository seatLockRepository, TicketRepository ticketRepository,
                             UserRepository userRepository, JmsOperations jmsTemplate,
                             SeatLockSseService seatLockSseService) {
        this.occurrenceRepository = occurrenceRepository;
        this.seatRepository = seatRepository;
        this.seatLockRepository = seatLockRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.jmsTemplate = jmsTemplate;
        this.seatLockSseService = seatLockSseService;
    }

    /**
     * Seat map for reserved venues, or GA capacity snapshot; includes {@code lockedByMe} for the given user.
     */
    public Map<String, Object> getSeats(Long occurrenceId, Long userId) {
        EventOccurrence occurrence = occurrenceRepository.findById(occurrenceId)
                .orElseThrow(() -> new NoSuchElementException("Occurrence not found"));
        Venue venue = occurrence.getVenue();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("occurrenceId", occurrenceId);
        result.put("seatingType", venue.getSeatingType().name());
        result.put("price", occurrence.getPrice());

        if (venue.getSeatingType() == SeatingType.GENERAL) {
            int capacity = venue.getCapacity() != null ? venue.getCapacity() : 0;
            List<Ticket> tickets = ticketRepository.findByOrderEventOccurrenceId(occurrenceId);
            List<SeatLock> locks = seatLockRepository.findByEventOccurrenceId(occurrenceId);
            int sold = (int) tickets.stream().filter(t -> Boolean.TRUE.equals(t.getIsValid())).count();
            int locked = locks.stream().mapToInt(l -> l.getQuantity() != null ? l.getQuantity() : 0).sum();
            result.put("totalCapacity", capacity);
            result.put("sold", sold);
            result.put("locked", locked);
            result.put("available", Math.max(0, capacity - sold - locked));
        } else {
            List<Seat> seats = seatRepository.findByVenueId(venue.getId());
            List<Ticket> tickets = ticketRepository.findByOrderEventOccurrenceId(occurrenceId);
            List<SeatLock> locks = seatLockRepository.findByEventOccurrenceIdAndSeatIsNotNull(occurrenceId);

            Set<Long> soldSeatIds = new HashSet<>();
            for (Ticket t : tickets) {
                if (Boolean.TRUE.equals(t.getIsValid()) && t.getSeat() != null)
                    soldSeatIds.add(t.getSeat().getId());
            }

            Set<Long> lockedSeatIds = new HashSet<>();
            for (SeatLock l : locks) {
                if (l.getSeat() != null)
                    lockedSeatIds.add(l.getSeat().getId());
            }

            OffsetDateTime now = OffsetDateTime.now();
            // Seats with an active lock owned by this user that have not been purchased
            // yet.
            Set<Long> myActiveLockSeatIds = (userId != null)
                    ? new HashSet<>(
                    seatLockRepository.findActiveSeatIdsByOccurrenceAndUserId(occurrenceId, userId, now))
                    : new HashSet<>();
            myActiveLockSeatIds.removeAll(soldSeatIds); // purchased seats are SOLD, not mine to re-select

            List<Map<String, Object>> seatList = new ArrayList<>();
            for (Seat seat : seats) {
                Map<String, Object> s = new LinkedHashMap<>();
                s.put("id", seat.getId());
                s.put("row", seat.getRowNumber());
                s.put("number", seat.getSeatNumber());
                String status = soldSeatIds.contains(seat.getId()) ? "SOLD"
                        : lockedSeatIds.contains(seat.getId()) ? "LOCKED" : "AVAILABLE";
                s.put("status", status);
                s.put("lockedByMe", myActiveLockSeatIds.contains(seat.getId()));
                s.put("isActive", seat.getIsActive());
                seatList.add(s);
            }
            result.put("seats", seatList);
        }
        return result;
    }

    /**
     * Synchronously lock the requested seats (or GA quantity) for the user and
     * return the new lock ids. Throws {@link IllegalStateException} (mapped to
     * HTTP 409) if any seat is already held by someone else.
     */
    @Transactional
    public List<Long> lockSeats(Long occurrenceId, SeatLockRequest request, Long userId) {
        // Pessimistic lock on the occurrence row serializes concurrent lock attempts
        // for the same occurrence: only the first transaction sees an empty seat.
        EventOccurrence occurrence = occurrenceRepository.findByIdForUpdate(occurrenceId)
                .orElseThrow(() -> new IllegalArgumentException("Occurrence not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Venue venue = occurrence.getVenue();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusMinutes(MessagingConstants.SEAT_LOCK_DURATION_MINUTES);
        List<Long> lockIds = new ArrayList<>();

        if (venue.getSeatingType() == SeatingType.GENERAL) {
            SeatLock lock = new SeatLock();
            lock.setEventOccurrence(occurrence);
            lock.setUser(user);
            lock.setQuantity(request.getQuantity());
            lock.setExpiresAt(expiresAt);
            lockIds.add(seatLockRepository.save(lock).getId());
        } else {
            List<Long> requestedSeatIds = request.getSeatIds() == null ? List.of() : request.getSeatIds();
            if (requestedSeatIds.isEmpty()) {
                throw new IllegalArgumentException("No seats requested");
            }
            List<Seat> seats = seatRepository.findAllById(requestedSeatIds);
            if (seats.size() != requestedSeatIds.size()) {
                throw new IllegalStateException("One or more seats not found.");
            }

            // Reuse the user's own active locks rather than failing on them.
            Map<Long, SeatLock> myLockBySeatId = new HashMap<>();
            for (SeatLock l : seatLockRepository.findActiveReservedLocksForUser(occurrenceId, user.getUserId(), now)) {
                myLockBySeatId.put(l.getSeat().getId(), l);
            }

            // Any other active lock on a requested seat is a conflict.
            List<SeatLock> activeLocks = seatLockRepository.findActiveLocksForSeats(occurrenceId, requestedSeatIds, now);
            for (SeatLock l : activeLocks) {
                if (l.getSeat() != null && !myLockBySeatId.containsKey(l.getSeat().getId())) {
                    Seat s = l.getSeat();
                    throw new IllegalStateException(
                            "Seat " + s.getRowNumber() + "-" + s.getSeatNumber() + " is no longer available.");
                }
            }

            for (Seat seat : seats) {
                SeatLock lock = myLockBySeatId.getOrDefault(seat.getId(), new SeatLock());
                lock.setEventOccurrence(occurrence);
                lock.setUser(user);
                lock.setSeat(seat);
                lock.setQuantity(1);
                lock.setExpiresAt(expiresAt);
                lockIds.add(seatLockRepository.save(lock).getId());
            }
        }

        broadcastAfterCommit(occurrenceId, MessagingConstants.SSE_STATUS_SUCCESS,
                MessagingConstants.SSE_REASON_LOCKED);
        log.debug("Locked seats: occurrenceId={} userId={} lockIds={}", occurrenceId, userId, lockIds);
        return lockIds;
    }

    /**
     * Releases the caller's reserved locks for the given seat ids (no-op if empty).
     */
    public void freeLocksAsync(Long occurrenceId, List<Long> seatIds, Long userId) {
        if (seatIds == null || seatIds.isEmpty()) {
            return;
        }
        SeatLockFreeAsyncMessage message = new SeatLockFreeAsyncMessage(
                occurrenceId, userId, seatIds, MessagingConstants.FREE_REASON_UNSELECTED);
        jmsTemplate.convertAndSend(MessagingConstants.SEAT_LOCK_FREE_REQUESTS, message);
    }

    private void broadcastAfterCommit(Long occurrenceId, String status, String reason) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    seatLockSseService.publishSeatLockUpdate(occurrenceId,
                            MessagingConstants.SSE_CORRELATION_FREE_LOCK, status, reason);
                }
            });
        } else {
            seatLockSseService.publishSeatLockUpdate(occurrenceId,
                    MessagingConstants.SSE_CORRELATION_FREE_LOCK, status, reason);
        }
    }
}
