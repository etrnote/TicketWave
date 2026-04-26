package com.ticketwave.dto;

/** Venue details for admin and derived UI. */
public record VenueDto(
        Long id,
        String name,
        String city,
        String address,
        String seatingType,
        Integer capacity,
        Integer rows,
        Integer seatsPerRow
) {}
