package com.ticketwave.dto;

import java.time.OffsetDateTime;

/** Review row with optional display name for the author. */
public class ReviewDto {

    private Long id;
    private Integer rating;
    private String comment;
    private OffsetDateTime createdAt;
    private String userName;

    public ReviewDto() {
    }

    public ReviewDto(Long id, Integer rating, String comment, OffsetDateTime createdAt, String userName) {
        this.id = id;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
        this.userName = userName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }
}
