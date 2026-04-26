package com.ticketwave.dto;

import java.math.BigDecimal;

/** Admin event list row: catalog fields plus how many showtime rows exist for delete rules. */
public record AdminEventListDto(
        Long id,
        String title,
        String description,
        String category,
        String genre,
        Integer durationMinutes,
        byte[] image,
        String imageContentType,
        BigDecimal minPrice,
        long occurrenceCount
) {}
