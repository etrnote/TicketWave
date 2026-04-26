package com.ticketwave.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;

/**
 * HS256 JWT creation and parsing for authenticated API access.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret:ticketwave-secret-key-must-be-at-least-256-bits-long-for-hs256}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private long expiration;

    private Key getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /** Issues a signed token including subject (user id), role, and display name. */
    public String generateToken(Long userId, String role, String name) {
        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("role", role)
                .claim("name", name)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Subject is the numeric user id as a string. */
    public Long extractUserId(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    /** Role claim (e.g. USER, ADMIN) without the Spring {@code ROLE_} prefix. */
    public String extractRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    /** @return true if the signature and expiry are valid and the subject is a numeric user id. */
    public boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            Long.parseLong(claims.getSubject());
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
