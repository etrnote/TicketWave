package com.ticketwave.service;

import com.ticketwave.dto.PaymentMethodDto;
import com.ticketwave.dto.PaymentMethodRequest;
import com.ticketwave.dto.UserResponse;
import com.ticketwave.entity.PaymentMethod;
import com.ticketwave.entity.User;
import com.ticketwave.entity.UserRole;
import com.ticketwave.repository.PaymentMethodRepository;
import com.ticketwave.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentMethodRepository paymentMethodRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getProfileShouldReturnUserResponse() {
        User user = new User();
        user.setUserId(10L);
        user.setName("Alice");
        user.setEmail("alice@example.com");
        user.setRole(UserRole.USER);

        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        UserResponse result = userService.getProfile(10L);

        assertThat(result.getUserId()).isEqualTo(10L);
        assertThat(result.getName()).isEqualTo("Alice");
        assertThat(result.getEmail()).isEqualTo("alice@example.com");
        assertThat(result.getRole()).isEqualTo("USER");
    }

    @Test
    void getProfileShouldThrowWhenUserMissing() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile(99L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("User not found");
    }

    @Test
    void getAllUsersShouldReturnSortedUserResponses() {
        User admin = new User();
        admin.setUserId(4L);
        admin.setName("Admin");
        admin.setEmail("admin@example.com");
        admin.setRole(UserRole.ADMIN);

        User user = new User();
        user.setUserId(1L);
        user.setName("User");
        user.setEmail("user@example.com");
        user.setRole(UserRole.USER);

        when(userRepository.findAll()).thenReturn(List.of(admin, user));

        List<UserResponse> result = userService.getAllUsers();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getUserId()).isEqualTo(1L);
        assertThat(result.get(0).getRole()).isEqualTo("USER");
        assertThat(result.get(1).getUserId()).isEqualTo(4L);
        assertThat(result.get(1).getRole()).isEqualTo("ADMIN");
    }

    @Test
    void addPaymentMethodShouldPersistMethodForUser() {
        User user = new User();
        user.setUserId(3L);

        PaymentMethodRequest request = new PaymentMethodRequest();
        request.setCardType("VISA");
        request.setLastFour("4242");
        request.setToken("tok_123");

        when(userRepository.findById(3L)).thenReturn(Optional.of(user));
        when(paymentMethodRepository.save(any(PaymentMethod.class))).thenAnswer(invocation -> {
            PaymentMethod method = invocation.getArgument(0);
            method.setId(44L);
            return method;
        });

        PaymentMethodDto result = userService.addPaymentMethod(3L, request);

        assertThat(result.id()).isEqualTo(44L);
        assertThat(result.cardType()).isEqualTo("VISA");
        assertThat(result.lastFour()).isEqualTo("4242");
        assertThat(result.createdAt()).isNotNull();
    }

    @Test
    void deletePaymentMethodShouldRemoveMethodForOwner() {
        User owner = new User();
        owner.setUserId(8L);

        PaymentMethod method = new PaymentMethod();
        method.setId(20L);
        method.setUser(owner);

        when(userRepository.findById(8L)).thenReturn(Optional.of(owner));
        when(paymentMethodRepository.findById(20L)).thenReturn(Optional.of(method));

        userService.deletePaymentMethod(8L, 20L);

        verify(paymentMethodRepository).delete(method);
    }

    @Test
    void deletePaymentMethodShouldThrowWhenMethodBelongsToAnotherUser() {
        User caller = new User();
        caller.setUserId(1L);

        User owner = new User();
        owner.setUserId(2L);

        PaymentMethod method = new PaymentMethod();
        method.setId(20L);
        method.setUser(owner);

        when(userRepository.findById(1L)).thenReturn(Optional.of(caller));
        when(paymentMethodRepository.findById(20L)).thenReturn(Optional.of(method));

        assertThatThrownBy(() -> userService.deletePaymentMethod(1L, 20L))
                .isInstanceOf(SecurityException.class)
                .hasMessage("Not authorized");
    }
}
