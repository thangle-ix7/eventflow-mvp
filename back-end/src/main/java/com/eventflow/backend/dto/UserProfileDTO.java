package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private Long userId;
    private String name;
    private String email;
    private String phoneNumber;
    private boolean emailVerified;
    private String telegramChatId;
    private String avatarUrl;
    private Integer taskPageSize;
    private LocalDateTime createdAt;
    private String systemRole;
}
