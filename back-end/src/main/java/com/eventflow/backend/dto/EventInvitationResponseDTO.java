package com.eventflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EventInvitationResponseDTO {
    private Long id;
    private Long eventId;
    private String eventName;
    private Long inviteeUserId;
    private String email;
    private String role;
    private String status;
    private LocalDateTime expiresAt;
}
