package com.ticketwave.dto;

/** New review body for a public event. */
public class ReviewRequest {

    private Integer rating;
    private String comment;

    public ReviewRequest() {
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
}
