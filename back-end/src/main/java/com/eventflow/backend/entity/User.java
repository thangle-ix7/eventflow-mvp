package com.eventflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 68)
    private String password;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = true;

    @Column(name = "email_verification_token_hash", length = 64)
    private String emailVerificationTokenHash;

    @Column(name = "email_verification_token_expires_at")
    private LocalDateTime emailVerificationTokenExpiresAt;

    @Column(name = "password_reset_token_hash", length = 64)
    private String passwordResetTokenHash;

    @Column(name = "password_reset_token_expires_at")
    private LocalDateTime passwordResetTokenExpiresAt;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "telegram_chat_id", length = 50)
    private String telegramChatId;

    @Column(name = "telegram_link_token_hash", length = 64)
    private String telegramLinkTokenHash;

    @Column(name = "telegram_link_token_expires_at")
    private LocalDateTime telegramLinkTokenExpiresAt;

    @Column(name = "avatar_original_name", length = 255)
    private String avatarOriginalName;

    @Column(name = "avatar_content_type", length = 100)
    private String avatarContentType;

    @Column(name = "avatar_size_bytes")
    private Long avatarSizeBytes;

    @Column(name = "avatar_storage_provider", length = 20)
    private String avatarStorageProvider;

    @Column(name = "avatar_storage_path", length = 500)
    private String avatarStoragePath;

    @Column(name = "task_page_size", nullable = false)
    @Builder.Default
    private Integer taskPageSize = 10;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
