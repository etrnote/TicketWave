package com.ticketwave.service;

import com.ticketwave.dto.LoginRequest;
import com.ticketwave.dto.LoginResponse;
import com.ticketwave.dto.RegisterRequest;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.entity.User;
import com.ticketwave.entity.UserRole;
import com.ticketwave.repository.UserRepository;
import com.ticketwave.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;

/**
 * Registration and password-based login; issues JWTs via {@link JwtUtil}.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public UserResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalStateException("Email already exists");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setRole(UserRole.USER);
        user.setCreatedAt(OffsetDateTime.now());
        User saved = userRepository.save(user);
        log.info("User registered: userId={}", saved.getUserId());
        return new UserResponse(saved.getUserId(), saved.getName(), saved.getEmail(), saved.getRole().name());
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.debug("Login failed: email not found");
                    return new IllegalArgumentException("Invalid credentials");
                });
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.debug("Login failed: bad password");
            throw new IllegalArgumentException("Invalid credentials");
        }
        String token = jwtUtil.generateToken(user.getUserId(), user.getRole().name(), user.getName());
        return new LoginResponse(token, user.getRole().name());
    }
}
