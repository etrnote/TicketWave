package com.ticketwave.dto;

/** JWT and role for the authenticated session. */
public class LoginResponse {
    private final String token;
    private final String role;
    public LoginResponse(String token, String role) { this.token = token; this.role = role; }
    public String getToken() { return token; }
    public String getRole() { return role; }
}
