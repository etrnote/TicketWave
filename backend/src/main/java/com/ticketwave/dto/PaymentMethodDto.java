package com.ticketwave.dto;

import java.time.OffsetDateTime;

/** Masked card metadata for the wallet UI. */
public record PaymentMethodDto(
        Long id,
        String cardType,
        String lastFour,
        OffsetDateTime createdAt
) {}
