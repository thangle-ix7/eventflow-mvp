package com.eventflow.backend.config;

import com.eventflow.backend.entity.SystemRole;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "eventflow.bootstrap-admin.enabled", havingValue = "true")
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${eventflow.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${eventflow.bootstrap-admin.password:}")
    private String adminPassword;

    @Value("${eventflow.bootstrap-admin.name:EventFlow Admin}")
    private String adminName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.countBySystemRole(SystemRole.ADMIN) > 0) {
            log.info("Admin bootstrap skipped because an ADMIN account already exists.");
            return;
        }

        String email = normalizeEmail(adminEmail);
        if (!hasText(email) || !hasText(adminPassword)) {
            throw new IllegalStateException(
                    "Admin bootstrap is enabled but EVENTFLOW_BOOTSTRAP_ADMIN_EMAIL or EVENTFLOW_BOOTSTRAP_ADMIN_PASSWORD is missing.");
        }

        User admin = userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setSystemRole(SystemRole.ADMIN);
                    existing.setEmailVerified(true);
                    existing.setPassword(passwordEncoder.encode(adminPassword));
                    if (hasText(adminName)) {
                        existing.setName(adminName.trim());
                    }
                    existing.setEmailVerificationTokenHash(null);
                    existing.setEmailVerificationTokenExpiresAt(null);
                    existing.setFailedLoginAttempts(0);
                    existing.setLockedUntil(null);
                    return existing;
                })
                .orElseGet(() -> User.builder()
                        .name(hasText(adminName) ? adminName.trim() : "EventFlow Admin")
                        .email(email)
                        .password(passwordEncoder.encode(adminPassword))
                        .emailVerified(true)
                        .systemRole(SystemRole.ADMIN)
                        .build());

        userRepository.save(admin);
        log.info("Admin bootstrap completed for email={}", email);
    }

    private String normalizeEmail(String email) {
        return email != null ? email.trim().toLowerCase() : "";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
