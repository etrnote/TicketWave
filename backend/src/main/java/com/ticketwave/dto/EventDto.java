package com.ticketwave.dto;

import java.math.BigDecimal;

/** Event card for the catalog, including a poster and minimum occurrence price. */
public record EventDto(
        Long id,
        String title,
        String description,
        String category,
        String genre,
        Integer durationMinutes,
        byte[] image,
        String imageContentType,
        BigDecimal minPrice
) {}
