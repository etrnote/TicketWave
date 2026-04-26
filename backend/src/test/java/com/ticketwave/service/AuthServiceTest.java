package com.ticketwave.service;

import com.ticketwave.dto.LoginRequest;
import com.ticketwave.dto.LoginResponse;
import com.ticketwave.dto.RegisterRequest;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.entity.User;
import com.ticketwave.entity.UserRole;
import com.ticketwave.repository.UserRepository;
import com.ticketwave.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerShouldCreateUserWhenEmailIsAvailable() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("alice@example.com");
        request.setPassword("plain-password");
        request.setName("Alice");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("plain-password")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setUserId(10L);
            return user;
        });

        UserResponse response = authService.register(request);

        assertThat(response.getUserId()).isEqualTo(10L);
        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getName()).isEqualTo("Alice");
        assertThat(response.getRole()).isEqualTo(UserRole.USER.name());
        verify(passwordEncoder).encode("plain-password");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerShouldThrowWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("alice@example.com");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Email already exists");
    }

    @Test
    void loginShouldReturnTokenForValidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("plain-password");

        User user = new User();
        user.setUserId(10L);
        user.setEmail("alice@example.com");
        user.setPassword("encoded-password");
        user.setRole(UserRole.USER);
        user.setName("Alice");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-password", "encoded-password")).thenReturn(true);
        when(jwtUtil.generateToken(10L, UserRole.USER.name(), "Alice")).thenReturn("jwt-token");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getRole()).isEqualTo(UserRole.USER.name());
    }

    @Test
    void loginShouldThrowForBadPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("wrong");

        User user = new User();
        user.setEmail("alice@example.com");
        user.setPassword("encoded-password");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid credentials");
    }
}

