package com.ticketwave.dto;

/** Non-sensitive user fields for API responses. */
public class UserResponse {
    private final Long userId;
    private final String name;
    private final String email;
    private final String role;
    public UserResponse(Long userId, String name, String email, String role) {
        this.userId = userId; this.name = name; this.email = email; this.role = role;
    }
    public Long getUserId() { return userId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
}
