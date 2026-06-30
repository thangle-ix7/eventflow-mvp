package com.eventflow.backend.service;

import com.eventflow.backend.dto.SignupRequest;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import com.eventflow.backend.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthEmailService authEmailService;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authEmailService,
                userProfileService,
                refreshTokenRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"plain-email", "abc@xyz", "abc@", "@example.com"})
    void signupRejectsInvalidEmailFormatBeforePersisting(String email) {
        SignupRequest request = new SignupRequest("Nguyen Van A", email, "secret123");

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException responseException = (ResponseStatusException) ex;
                    assertThat(responseException.getStatusCode().value()).isEqualTo(400);
                    assertThat(responseException.getReason()).isEqualTo("Email không đúng định dạng");
                });

        verify(userRepository, never()).existsByEmail(anyString());
        verify(userRepository, never()).save(any(User.class));
        verifyNoInteractions(passwordEncoder, authEmailService);
    }
}
