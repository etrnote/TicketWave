package com.ticketwave.dto;

/** One seat in the admin venue grid. */
public record VenueSeatDto(
        Long id,
        Integer row,
        Integer number,
        Boolean isActive
) {}
