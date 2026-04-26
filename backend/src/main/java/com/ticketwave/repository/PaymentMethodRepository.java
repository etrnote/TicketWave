package com.ticketwave.repository;

import com.ticketwave.entity.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Saved payment method tokens (demo card metadata) per user. */
@Repository
public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Long> {
    List<PaymentMethod> findByUserUserId(Long userId);
}
