package com.ticketwave.repository;

import com.ticketwave.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.Optional;

/** App users, login lookup, and signup-time analytics. */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findTop1ByOrderByUserId();
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(OffsetDateTime start, OffsetDateTime end);
}
