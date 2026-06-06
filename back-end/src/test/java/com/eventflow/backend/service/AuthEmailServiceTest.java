package com.eventflow.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AuthEmailServiceTest {

    @Test
    void buildsLocalhostVerificationUrlWhenFrontendUrlHasNoScheme() {
        AuthEmailService service = new AuthEmailService(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(service, "frontendUrl", "localhost:5173");

        String link = ReflectionTestUtils.invokeMethod(
                service,
                "buildFrontendActionUrl",
                "leader@example.com",
                "/verify-email",
                "abc123");

        assertThat(link).isEqualTo("http://localhost:5173/verify-email?token=abc123");
    }

    @Test
    void buildsProductionResetUrlWhenFrontendUrlHasNoScheme() {
        AuthEmailService service = new AuthEmailService(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(service, "frontendUrl", "event-flow.example.com/");

        String link = ReflectionTestUtils.invokeMethod(
                service,
                "buildFrontendActionUrl",
                "leader@example.com",
                "/reset-password",
                "abc123");

        assertThat(link).isEqualTo("https://event-flow.example.com/reset-password?token=abc123");
    }
}
