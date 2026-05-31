package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelegramLinkTokenResponse {
    private String token;
    private LocalDateTime expiresAt;
}
